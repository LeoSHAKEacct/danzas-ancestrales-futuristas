/**
 * GET /api/promo?code=XXXX
 * Says whether a discount code is real and what it's worth.
 *
 * The code list lives here rather than in the page so it can't be found by
 * reading the site's source. api/checkout.js keeps its own copy and is the one
 * that actually prices the order — this endpoint only drives the display.
 */
const PROMOS = {
  ALCHEMIA: 0.20,
  SHAKE:    0.20,
  MAMACITA: 0.20,
  RUTAS:    0.20,
  FREE:     1.00   // full comp — handled without a Stripe payment
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = (req.query && req.query.code) || '';
  const code = String(raw).trim().toUpperCase().slice(0, 40);

  // Never cache a per-code answer at the CDN.
  res.setHeader('Cache-Control', 'no-store');

  if (Object.prototype.hasOwnProperty.call(PROMOS, code)) {
    return res.status(200).json({ valid: true, code, off: PROMOS[code] });
  }
  return res.status(200).json({ valid: false, code: '', off: 0 });
};
