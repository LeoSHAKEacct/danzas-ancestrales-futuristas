# Danzas Ancestrales y Futuristas

Rooftop event site for **Hotel Diez Treinta y Seis** (Provenza, El Poblado, Medellín). Single-page site with a mock ticket-booking flow for the rooftop's recurring gatherings — dance, live music, wellness, and games — hosted every 15 days.

## Structure

```
index.html          # the entire site (HTML/CSS/JS, no build step)
assets/img/
  logo-10-13.jpg     # hotel logo
  cyber-indio.png     # hero illustration
```

## Running locally

No build step — just open `index.html` in a browser. For a local server instead of `file://`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying with GitHub Pages

1. Push this repo to GitHub (see below).
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. Save — the site publishes at `https://<your-username>.github.io/<repo-name>/`.

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

- **Checkout is simulated.** The booking flow generates a QR ticket client-side and stores it in `localStorage` — no real payment is processed. Wire up Stripe Payment Links (or Stripe Checkout + a backend) before taking real bookings; see the `<footer>` note in `index.html`.
- Ticket prices, schedule (currently Aug 8 and Aug 22, 2026), and host bios are hardcoded in the `<script>` block near the bottom of `index.html` — update them there as the lineup changes.
