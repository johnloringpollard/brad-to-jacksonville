# Bring Brad & the kids to Jacksonville

A static fundraising page for a proposed family trip on October 17, 2026, organized by John Pollard.

Website: https://johnloringpollard.github.io/brad-to-jacksonville/

## Enable contributions

A live Stripe Payment Link is configured in `campaign.json`. The funding goal is still being finalized. The payment button stays disabled if the link is removed or the configuration is invalid.

1. Create a hosted payment link in your own payment-provider account. Stripe supports a **Customers choose what to pay** link: https://support.stripe.com/questions/how-to-accept-donations-through-stripe . Describe the purpose accurately as a personal trip contribution.
2. Set `paymentUrl` in `campaign.json` to the live HTTPS payment URL. Do not put secret keys in this repository.
3. Set `goalCents` to the agreed dollar goal multiplied by 100. Leave it `null` while the budget is being finalized.
4. Commit and push to `main`. GitHub Pages publishes the change.

Payment processing happens on the provider's hosted checkout. This site does not collect card details or verify payment completion. A configured link must be checked in the provider's account before launch; no real payment has been tested during initial setup.

## Update the funding meter

`collectedCents` is the total confirmed money received, in USD cents. Update it from actual payment records, accounting for refunds. Update `updatedAt` to the corresponding ISO timestamp. Do not count unpaid pledges, clicks, checkout visits, or an unverified return URL as collected funds.

The meter is **manually maintained**, not a live Stripe balance. It does not change when someone presses the payment button. Public copy explains this. Automatic updates would require a trusted backend and verified payment webhooks; GitHub Pages cannot run that backend.

The organizer records confirmed contributions in the `contributions` array using `name`, `amountCents`, and `method` (`offline` or `stripe`). Only publish names with permission. Listed amounts cannot exceed the collected total. Outside-Stripe contributions are labeled as confirmed by the organizer; no Stripe verification is implied. The opening $100 from John Pollard was reported by the organizer as received outside Stripe.

## Local development

```sh
npm ci
npm run preview
```

Open http://127.0.0.1:4187 . The application itself has no runtime dependencies or build step. `npm test` runs a local test server and checks the actual page with Playwright. Chromium defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation.

`npm run social` rebuilds the 1200×630 social card from the supplied photo and an HTML layout. The page includes Open Graph and Twitter large-card tags, a canonical URL, a favicon, `robots.txt`, and a sitemap. Update absolute URLs if you change the repository name or add a domain.

## Assets and status

The photograph was supplied by the site owner; no photo license is granted by this repository. This page is an invitation to help arrange a trip, not a confirmed appearance announcement. Event arrangements, fundraising target, payment recipient, and any cancellation handling should be confirmed by the organizer before collecting money.
