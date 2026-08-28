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

/* Discount codes. The percentage is applied HERE, never trusted from the
   browser — the page only says which code was typed. */
const PROMOS = {
  ALCHEMIA: 0.20,
  SHAKE:    0.20,
  MAMACITA: 0.20,
  RUTAS:    0.20,
  FREE:     1.00
};

function resolvePromo(raw){
  const code = String(raw == null ? '' : raw).trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(PROMOS, code)
    ? { code, off: PROMOS[code] }
    : { code: '', off: 0 };
}

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
    const promo = resolvePromo(body.promoCode);
    const unitAmount = Math.round(PRICES[type] * (1 - promo.off));

    /* Stripe can't create a payment for 0, so a full comp skips checkout and
       the ticket is issued straight away. Those guests are NOT in Stripe. */
    if (promo.off >= 1) {
      return res.status(200).json({
        free: true,
        code: promo.code,
        ticketId: 'FREE-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        holderName: name,
        email,
        qty
      });
    }

    if (!name) return res.status(400).json({ error: 'Falta el nombre / Name is required.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email inválido / Invalid email.' });

    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    const metadata = {
      eventId, eventTitle, eventDate, eventTime, role, guestHost,
      ticketType: type,
      holderName: name,
      promoCode: promo.code || 'none',
      discountPct: promo.off ? String(promo.off * 100) : '0'
    };

    /* Shows in the Stripe payments list without opening each payment, so the
       dashboard doubles as the guest list. */
    const description = [name, promo.code || 'sin código', eventTitle]
      .filter(Boolean).join(' · ');

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        quantity: qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: unitAmount,
          product_data: {
            name: `${LABELS[type]}${promo.code ? ` (${promo.code} -${promo.off * 100}%)` : ''} — ${eventTitle}`,
            description: [eventDate, eventTime, 'Hotel 1036 Rooftop, Provenza, Medellín']
              .filter(Boolean).join(' · ')
          }
        }
      }],
      metadata,
      payment_intent_data: { metadata, description },
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
