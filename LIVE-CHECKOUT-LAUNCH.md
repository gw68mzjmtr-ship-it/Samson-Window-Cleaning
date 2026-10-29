# Samson live checkout preparation — October 29, 2026

Status: implementation prepared; customer access CLOSED. No production Square credential is installed and no real charge was submitted during this work. The existing hosted sandbox test remains available.

## Flow prepared

The calculator saves a server-priced order, selected dates and contact/address details once. Date holds are shared in PostgreSQL. Square collects the card in its own secure form. The server charges only the saved amount, independently reads the exact Square payment, and requires the expected location, reference, USD amount and COMPLETED card-payment status. A matched receipt applies only to that order's exact Zoho invoice; scheduling follows verified payment. Pending markers precede every remote mutation. Repeat clicks reuse the original payment and receipt. Ambiguous results stop for owner review.

Production payment records and locks are isolated from sandbox records. No refund, saved-card, recurring card charge, or arbitrary provider operation is exposed. Yearly prepayment is one charge for the specified visits, not an automatically renewing subscription.

## Verified locally

- Optimized Next.js production build and TypeScript checks passed.
- Payment tests passed with mocked providers: exact invoice/amount/location/reference/payment ID, independent provider reads, duplicate suppression, calendar preflight, ambiguous charge recovery and no repeated ambiguous receipt write. Zero real funds or external records.
- Access checks passed: closed by default, authenticated owner mode, explicit public-launch flag, exact origin, expiring per-order tokens, invalid/other-order rejection, bounded request bodies, registered terms version and server-only $1 override.
- Actual disposable PostgreSQL tests passed: two-connection locks, pending-state durability, separate sandbox/live namespaces, restart reads, occupied-slot prevention and duplicate event handling. The disposable container was stopped afterward.

## Required before real verification

1. Owner signs into the Square developer console beside chat. Password is entered directly on Square.
2. Obtain action-time approval for production credential creation/use and storage in Render protected settings, including any webhook access. Existing permission covered test credentials only.
3. Verify the actual production app, merchant and USD location can process cards. Confirm account/payout status through Square; do not infer readiness from sandbox.
4. Configure protected values: SAMSON_SQUARE_LIVE_APP_ID, SAMSON_SQUARE_LIVE_ACCESS_TOKEN, SAMSON_SQUARE_LIVE_LOCATION_ID, SAMSON_SQUARE_LIVE_MERCHANT_ID, SAMSON_CHECKOUT_ACCESS_KEY, SAMSON_CHECKOUT_ORIGIN. Never put secrets in Git, browser URLs or logs.
5. Set SAMSON_LIVE_CHECKOUT_MODE=owner-test, leaving SAMSON_PUBLIC_CHECKOUT_READY unset. Confirm unauthorized requests cannot open the owner page.
6. Configure signed payment.created/payment.updated webhooks to the exact HTTPS /api/payments/square/webhook address; set SAMSON_SQUARE_WEBHOOK_KEY and SAMSON_SQUARE_WEBHOOK_ENABLED only after signature verification. The receipt worker independently reads Square instead of trusting notification totals.
7. Owner enters their card and clicks the final real $1 payment button. The agent does not click it. Verify the exact live transaction, invoice, receipt and clearly labelled owner-verification appointment; save proof without card details.

## Required before public customer access

- Review and approve the exact registered service-terms version residential-live-2026-10-29-v1, including cancellation, initial savings and prepaid refund treatment. The old pricing-folder draft is superseded for preview purposes and remains unapproved. No automatic penalty charge is implemented.
- Set the approved service ZIP list and actual residential service resource/crew. Current fallback is the owner's resource; do not promise a two-technician crew from that configuration.
- Review existing fictional appointments and imported November capacity. Housecall Pro was imported once; it is not continuously synchronized.
- Resolve abandoned unpaid holds safely before public traffic. Current design deliberately retains any payable/ambiguous order for review rather than releasing a date that might still be paid. Public launch needs a documented release/reconciliation process and bot protection.
- Verify customer confirmation and receipt email delivery with branding and the actual sender. An API-created payment record must not be assumed to email a receipt. Current checkout promises a viewable paid invoice only.
- Move from free sleeping compute and the temporary free database (expires November 28) to an approved permanent setup with backups and monitoring. No paid plan was purchased.
- Connect the real website/domain, verify all customer routes and assets without owner authentication, perform a final customer-flow test, and only then set SAMSON_LIVE_CHECKOUT_MODE=public plus SAMSON_PUBLIC_CHECKOUT_READY=1.

## Provider references

- [Square card tokenization and buyer verification](https://developer.squareup.com/docs/web-payments/take-card-payment)
- [Square payment status and processing](https://developer.squareup.com/docs/payments-api/take-payments)
- [Square signed event validation](https://developer.squareup.com/docs/webhooks/step3validate)
- [North Carolina automatic renewal requirements](https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_75/GS_75-41.html)

The service-terms text is an owner-review draft, not a legal opinion or executed customer agreement. Any required notices for qualifying in-person sales must be supplied separately.
