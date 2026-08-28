/**
 * POST /api/checkout
 * Creates a real Stripe Checkout Session and returns the hosted checkout URL.
 *
 * Needs one environment variable in the Vercel project: STRIPE_SECRET_KEY
 * (Vercel → Project → Settings → Environment Variables).
 *
 * Prices live HERE, on the server, on purpose — the browser only sends which
 * ticket type and how many, never an amount. Keep these in sync with the
 * TICKET_PRICES object in index.html (that one is display-only).
 */
/* Built per request, not at import time: constructing the client at module
   scope crashes the whole function with an opaque 500 when the key is missing,
   which hides the very message that tells you the key is missing. */
function getStripe(){
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

/* Colombian pesos. COP is NOT a zero-decimal currency in Stripe, so amounts
   are in centavos: 24.000 COP => 2_400_000. */
const CURRENCY = 'cop';
const PRICES = { cover: 2400000 };
const LABELS = { cover: 'Cover' };
const MAX_QTY = 8;

function clean(value, max) {
  return String(value == null ? '' : value).slice(0, max);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    // Also report whether the dependency resolved, so this endpoint answers
    // "will checkout work once I paste the key?" without a key being present.
    let stripeInstalled = true;
    try { require.resolve('stripe'); } catch (e) { stripeInstalled = false; }
    return res.status(500).json({
      error: 'Stripe no está configurado / Stripe is not configured yet — add STRIPE_SECRET_KEY to this project on Vercel.',
      stripeInstalled
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const type = 'cover';   // single cover price for everyone
    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(body.qty, 10) || 1));
    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    const eventId = clean(body.eventId, 60);
    const eventTitle = clean(body.eventTitle, 120) || 'Tribe 1036 · Rooftop Sessions';
    const eventDate = clean(body.eventDate, 40);
    const eventTime = clean(body.eventTime, 40);
    const role = clean(body.role, 60);
    const guestHost = clean(body.guestHost, 120);

    if (!name) return res.status(400).json({ error: 'Falta el nombre / Name is required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email inválido / Invalid email.' });

    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    const metadata = {
      eventId, eventTitle, eventDate, eventTime, role, guestHost,
      ticketType: type,
      holderName: name
    };

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        quantity: qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICES[type],
          product_data: {
            name: `${LABELS[type]} — ${eventTitle}`,
            description: [eventDate, eventTime, 'Hotel 1036 Rooftop, Provenza, Medellín']
              .filter(Boolean).join(' · ')
          }
        }
      }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1#schedule`
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('checkout error', err);
    if (err && err.code === 'MODULE_NOT_FOUND') {
      return res.status(500).json({ error: 'The stripe package is not installed in this deployment.' });
    }
    return res.status(500).json({ error: err.message || 'Stripe error' });
  }
};
