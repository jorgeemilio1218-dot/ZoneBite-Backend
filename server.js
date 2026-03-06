const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', app: 'ZoneBite' }));

// Crear pago
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, sellerAccountId, orderId } = req.body;
    const commission = Math.round(amount * 0.12);
    const sellerAmount = amount - commission;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'mxn',
      metadata: { orderId, sellerAccountId, sellerAmount: sellerAmount.toString() }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liberar pago al vendedor
app.post('/release-payment', async (req, res) => {
  try {
    const { sellerAccountId, sellerAmount } = req.body;
    const transfer = await stripe.transfers.create({
      amount: sellerAmount * 100,
      currency: 'mxn',
      destination: sellerAccountId,
    });
    res.json({ success: true, transferId: transfer.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Onboarding vendedor (Stripe Connect)
app.post('/onboard-seller', async (req, res) => {
  try {
    const account = await stripe.accounts.create({ type: 'express' });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.FRONTEND_URL,
      return_url: process.env.FRONTEND_URL + '?connected=true',
      type: 'account_onboarding',
    });
    res.json({ url: link.url, accountId: account.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('ZoneBite backend corriendo en puerto', PORT));
