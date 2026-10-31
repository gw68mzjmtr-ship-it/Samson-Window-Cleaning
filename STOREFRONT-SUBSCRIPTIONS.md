# Storefront booking and monthly billing

The storefront calculator collects plan, cleaning frequency, optional interior pane types and quantities, one-time versus every-visit interiors, ladder access, all first-month cleaning dates, business/contact/service details and separate monthly card authorization. Customers enter those details once. The first payment covers the first service month and one-time work. Monthly renewal excludes one-time work and keeps the originally accepted price.

## Native job and invoice association — October 31 update

New paid orders and renewals create one native FSM job per payable invoice. Each covered cleaning has its own service line and appointment under that job; item counts, individual rates, selected-visit add-ons, service dates and business name remain in the visit descriptions. This keeps even a five-visit package within Professional’s service-line limit. Future residential visits that are not prepaid remain separate unpaid jobs. Existing saved orders keep their original invoice, jobs and payment allocations.

The approved connection creates invoices through FSM and changes only the website booking reference and hosted payment settings on its own fully unpaid invoices. The provider requires unchanged customer/line data to accompany that edit; identity, currency, rates, quantities, scope and totals are verified before and after it. The extra hosted Square payment button is disabled, so payment stays inside the calculator. Exact native invoice/job binding is rechecked before payment, recording a receipt and scheduling covered visits. Progress is saved before each remote write; interrupted creation stops for owner review.

Private provider verification: INV-000013, $160 first service month with one-time interior/ladder work; INV-000014, $120 stored-card monthly renewal with that one-time work excluded; same original Finance and FSM customers; two exact appointments per month; repeated submissions did not duplicate writes. INV-000015 verified a $3,268.23 five-visit residential package through month 12, selected-visit screens/ladder, stacked maintenance and 5% prepayment savings, one payment/receipt and five appointments. All were Square sandbox tests with no real funds or customer messages. The fictional subscription was stopped, all nine new test appointments released, and pre-existing appointments preserved.

Native job payment badges can take a short time to catch up after the Finance receipt; the invoice itself is independently verified before confirming the schedule. Full logo and itemized visit descriptions were visually checked in the new invoice PDF. The public native path requires `SAMSON_NATIVE_INVOICES_READY=1` and both approved connection permissions; it does not silently fall back when permissions are missing.

## Monthly billing implementation

Square stores the card from the verified initial customer-initiated payment (`CHARGE_AND_STORE`). The permanent Render website server checks due dates every minute. It plans available weekday service windows, reserves them in the shared booking ledger, creates and rechecks the exact Zoho invoice, checks for cancellation again, submits one stored-card payment, independently verifies Square's result and records the matching Zoho receipt and appointments. Month-end billing preserves the original calendar-day anchor. Billing dates may fall on weekends; cleaning dates may not.

Native Square Subscriptions are not used for production. The private native-subscription experiment returned a cancellation date after the requested future start; its fictional subscriptions were stopped with the owner's approval. Production uses the website's durable monthly ledger, Square Cards and Payments APIs. No additional Square subscription plan was purchased.

The original Zoho Invoice customer ID is retained with each invoice and bound to renewals. This prevents Zoho FSM's contact synchronization from routing a renewal to another contact sharing the same email.

## Cancellation and exceptions

Customers receive a private Manage subscription link in their confirmation. Its access token is carried in the URL fragment and authenticated request header, not a server query string. Cancellation records a separate durable stop flag before waiting for the billing lock. Stale worker writes cannot undo this flag. A payment already processing at cancellation may complete and needs review. Already paid appointments remain booked until separately changed; refunds are reviewed, never automatically issued.

Calendar conflicts stop billing before a charge. A failed charge does not become a paid receipt or appointment and is not retried automatically. Any unknown payment, invoice, receipt or appointment mutation stops for owner review instead of being repeated. If the server misses a billing date by more than three days, it stops for review. Price changes do not reprice accepted subscriptions. Monthly automation requires the permanent Render service and database; it does not depend on the owner's computer being on.

Owner desk: `https://samson-booking-test.onrender.com/zoho-trial/subscriptions` (existing private sign-in). This lists pending/failed billing, invoice/receipt reconciliation and scheduling exceptions. Owner review is required for exceptions; the desk itself does not send duplicate reminders or refund payments.

## Verification

- All 15 plan/frequency price combinations; one-time and every-visit interior work; one flat ladder fee; integer-cent allocation; four/five weekly visit months; holidays/weekends and missing dates.
- Exactly one charge/invoice/receipt/appointment set; mismatched and declined payments; interrupted writes; no blind retry; cancellation before charge; no early charge; original customer binding; private management access.
- Actual Square sandbox $89 first payment: Zoho **INV-000010** (`1611011000000150001`), fictional test receipt `1611011000000150013`, appointment `44386000000406026`.
- Actual Square stored-card sandbox $49 renewal: Zoho **INV-000011** (`1611011000000155001`), fictional test receipt `1611011000000153009`, appointment `44386000000408046`. The $40 one-time work did not renew. The same original Zoho invoice customer was verified.
- Both test appointments were canceled with explicit owner approval. All other appointments and all test financial records were preserved. Receipts are marked **Square Sandbox Test**, not real business revenue. No real money moved and no customer test emails were sent.
- Real isolated PostgreSQL cross-connection billing lock, pending record durability, cancellation during a billing lock, stale-write protection and restart persistence passed.
- Existing residential booking/payment/launch security regression tests passed. Residential automatic future card charges remain disabled.

Launch gates: `SAMSON_STOREFRONT_READY=1` and `SAMSON_APPROVED_STOREFRONT_TERMS=storefront-monthly-2026-10-30-v1`. Residential terms remain version `residential-live-2026-10-30-v3`. No raw card details, private keys or test credential files are included in source control.
