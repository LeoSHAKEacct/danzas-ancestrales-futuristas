/**
 * GET /api/luma?event_id=evt-xxxxxxxx
 * Returns how many people are registered for a Luma event.
 *
 * Needs LUMA_API_KEY in the Vercel project (Luma Plus subscription required —
 * the API is a paid feature). The key stays server-side; the browser only ever
 * receives counts, never a guest name or email.
 *
 * Luma: GET https://public-api.luma.com/v1/events/get?event_id=…
 *       header x-luma-api-key, response.guest_counts.<status>.{guests,tickets}
 */
const LUMA_URL = 'https://public-api.luma.com/v1/events/get';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Not configured is a normal state, not an error — the page just keeps its
  // default text, so answer 200 and let the front end shrug it off.
  if (!process.env.LUMA_API_KEY) {
    return res.status(200).json({ configured: false, reason: 'LUMA_API_KEY not set' });
  }

  const eventId = req.query && req.query.event_id;
  if (!eventId || !/^evt-[A-Za-z0-9_-]{1,64}$/.test(eventId)) {
    return res.status(400).json({ error: 'Missing or invalid event_id' });
  }

  try {
    const upstream = await fetch(`${LUMA_URL}?event_id=${encodeURIComponent(eventId)}`, {
      headers: { 'x-luma-api-key': process.env.LUMA_API_KEY, accept: 'application/json' }
    });

    if (!upstream.ok) {
      console.error('luma responded', upstream.status);
      return res.status(200).json({ configured: false, reason: `luma ${upstream.status}` });
    }

    const data = await upstream.json();
    const counts = (data && data.guest_counts) || {};
    const at = (status) => (counts[status] && counts[status].guests) || 0;

    // A minute of CDN caching keeps a busy page from hammering Luma.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json({
      configured: true,
      eventId,
      going: at('approved'),
      tickets: (counts.approved && counts.approved.tickets) || 0,
      waitlist: at('waitlist'),
      pending: at('pending_approval'),
      checkedIn: at('checked_in')
    });
  } catch (err) {
    console.error('luma lookup failed', err);
    return res.status(200).json({ configured: false, reason: 'request failed' });
  }
};
