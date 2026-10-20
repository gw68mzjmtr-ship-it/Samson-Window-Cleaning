# Samson Professional Window Cleaning — Next.js Website

A responsive Next.js App Router website styled after the approved black/red Samson mockup. Uses selected photos from the uploaded Samson project assets. No backend or database required.

## Run locally

1. Install Node.js 20 or newer.
2. Open this folder in Terminal.
3. Run `npm install` and then `npm run dev`.
4. Visit http://localhost:3000.

## Customize before launch

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_CONTACT_EMAIL` to the email you want quote requests sent to. **Until configured, the quote buttons use a placeholder address.** This is a mailto-based inquiry workflow, not a full booking/payment system.
2. Review pricing, tax treatment, ladder fees, maintenance/rain-touch-up terms, guarantees and coverage area before publishing. The prices and plan discounts match the provided Samson reference materials, but business/legal details should be checked.
3. Replace images under `public/images` as desired. The brand header is a text treatment; replace with a transparent logo asset if you prefer.
4. Update social links and business information in `app/page.tsx`.

## Deploy to Vercel

**GitHub:** Push this folder to a GitHub repository, select **Add New → Project** in Vercel, import the repository, and deploy. Vercel should auto-detect Next.js. In Vercel's Project Settings → Environment Variables, set `NEXT_PUBLIC_CONTACT_EMAIL` to your real address and redeploy.

**CLI:** Run `npx vercel` in this folder and follow the prompts.

## Included

- Responsive landing page, navigation, service categories, commercial focus
- Exterior cleaning tiers (Essential–Elite)
- Maintenance plans (One-Time, Silver, Gold, Platinum, Black)
- Email-based quote request links, YouTube and Instagram links
- Local image assets; no external image hosting needed

**Not included:** Payment processing, live booking calendar, CRM integrations, email sending backend, customer accounts, tax calculation or legal terms. Those require a separate integration.
