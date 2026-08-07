# Danzas Ancestrales y Futuristas

Rooftop event site for **Hotel Diez Treinta y Seis** (Provenza, El Poblado, Medellín). Single-page site with real Stripe ticket booking for the rooftop's recurring gatherings — dance, movement, wellness — hosted every 15 days.

## Structure

```
index.html           # the entire front end (HTML/CSS/JS, no build step)
api/checkout.js      # POST — creates a Stripe Checkout Session, returns its URL
api/session.js       # GET  — reads a session back to confirm payment before issuing a ticket
package.json         # the `stripe` dependency for the two functions above
assets/img/
  logo-10-13.jpg     # hotel logo
  cyber-indio.png    # hero illustration
```

## Stripe setup (one-time)

Payments run through **Stripe Checkout** — Stripe hosts the payment page, so no card data ever touches this site and no secret key ever lives in this repo.

1. In Vercel: **Project → Settings → Environment Variables**.
2. Add `STRIPE_SECRET_KEY` = your Stripe secret key, for all environments.
   - Test key (`sk_test_…`) → no real money moves; pay with card `4242 4242 4242 4242`.
   - Live key (`sk_live_…`) → real charges.
3. Redeploy. Booking now redirects to Stripe and back.

Ticket **prices are set server-side** in `api/checkout.js` (`PRICES`, in cents) so the browser can't change what it's charged. The copies in `index.html` (`TICKET_PRICES`, the pricing section, the `<select>` labels) are display only — change both.

## Deploying

Hosted on **Vercel** — push to `main` and it redeploys automatically. Vercel is required, not optional: GitHub Pages serves static files only and cannot run `api/`, so checkout would 404 there.

## Running locally

The page itself opens fine as a plain file, but checkout needs the functions, so use the Vercel CLI:

```bash
vercel dev
```

That serves the site and `api/` together on `http://localhost:3000`. Put `STRIPE_SECRET_KEY=sk_test_…` in a local `.env` file (git-ignored) for local testing.

## Pushing this repo to GitHub

This project already has a local git repo with an initial commit. To publish it:

```bash
# from inside this folder
gh repo create danzas-ancestrales-futuristas --public --source=. --remote=origin --push
```

Or without the `gh` CLI:

```bash
# 1. Create an empty repo on github.com (no README/license), copy its URL
git remote add origin <your-new-repo-url>
git branch -M main
git push -u origin main
```

## Notes

- **Tickets are only issued after Stripe confirms payment.** Stripe redirects the buyer back to `/?paid=1&session_id=…`; the page asks `api/session.js` whether that session is really `paid`, and only then generates the QR ticket and saves it to `localStorage` under `dayf_tickets`.
- `localStorage` is the *buyer's* copy, on one device. Stripe's dashboard is the real record of who paid — the event's guest list lives there (each payment carries the event title, date, ticket type, and buyer name in its metadata).
- The QR encodes `DAYF-TICKET|id|holder|date`. Nothing validates it at the door yet; scanning is visual for now.
- Schedule and host bios are hardcoded in the `<script>` block near the bottom of `index.html` (`SCHEDULE`, `ROLE_POOL`) — update them there as the lineup changes. Current lineup: **Sun 16 Aug 2026, 00:00–02:00, Ecstatic Dance** (guest TBA), then 31 Aug 2026 TBA.
- Not built yet: emailed tickets (Stripe's own receipt is all the buyer gets by email), a real spots-left counter (`spotsLeft: 40` is decorative), and door-side QR validation.
