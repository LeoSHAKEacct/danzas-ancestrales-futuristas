/**
 * GET /api/session?session_id=cs_...
 * Reads back a Checkout Session after Stripe redirects the buyer home, so the
 * ticket is only ever issued for a payment Stripe actually confirms.
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured yet — add STRIPE_SECRET_KEY on Vercel.' });
  }

  const id = req.query && req.query.session_id;
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return res.status(400).json({ error: 'Missing or invalid session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
    const item = session.line_items && session.line_items.data[0];

    return res.status(200).json({
      paid: session.payment_status === 'paid',
      sessionId: session.id,
      qty: item ? item.quantity : 1,
      total: (session.amount_total || 0) / 100,
      currency: (session.currency || 'usd').toUpperCase(),
      email: (session.customer_details && session.customer_details.email) || session.customer_email || '',
      metadata: session.metadata || {}
    });
  } catch (err) {
    console.error('session lookup error', err);
    return res.status(404).json({ error: 'Session not found' });
  }
};
