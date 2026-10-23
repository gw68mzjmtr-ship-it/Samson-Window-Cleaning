# Samson YouTube Manager — deployment checklist

This feature is on a development branch. Do not merge/deploy until configured and reviewed.

## Required Vercel environment variables (server-side only)
- `GOOGLE_CLIENT_ID` — from Google OAuth web application
- `GOOGLE_CLIENT_SECRET` — secret from downloaded JSON; NEVER commit it
- `SAMSON_SESSION_SECRET` — independently generated random secret, at least 32 characters
- `SAMSON_APP_URL` — exact HTTPS origin of deployed app, e.g. `https://samson-window-cleaning.vercel.app`
- `SAMSON_ADMIN_EMAIL` — authorized Google account email
- `SAMSON_YOUTUBE_CHANNEL_ID` — YouTube channel ID, verify in YouTube Studio

## Google Auth Platform
1. Add `https://YOUR-EXACT-DOMAIN/api/samson-youtube/callback` as an Authorized redirect URI on the Web OAuth client.
2. Keep the Google account in OAuth Test users.
3. Required scopes: `openid`, `email`, `https://www.googleapis.com/auth/youtube`.
4. The first Google sign-in must grant access; testing-mode refresh tokens may expire in seven days.

## Security and limitations
- Tokens are AES-GCM encrypted in an HttpOnly cookie; no tokens are exposed to browser JavaScript.
- OAuth state, channel ID and verified Google email are checked.
- All edit requests require a same-origin request and explicit user confirmation in the dashboard.
- This is a private *authenticated API*, not a ChatGPT plugin. Direct ChatGPT actions require a separately deployed, authenticated ChatGPT-compatible connector, with its own permission and confirmation policy.
- Do not expose any write API as an unauthenticated public endpoint.
- Google YouTube API quotas and app verification may apply.
- The current dashboard lists up to 500 uploads and edits title/description only. Uploads, thumbnail edits, bulk changes, and ChatGPT integration are NOT implemented.
