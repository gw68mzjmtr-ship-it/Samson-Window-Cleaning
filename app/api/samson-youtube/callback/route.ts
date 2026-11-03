import { NextRequest, NextResponse } from 'next/server';
import { appUrl, googleCredentials, saveSession, youtube } from '../../../../lib/youtube-manager';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const url = new URL(req.url), state = url.searchParams.get('state');
  const expected = req.cookies.get('samson_yt_oauth_state')?.value;
  if (!state || !expected || state !== expected || !url.searchParams.get('code')) return new NextResponse('Invalid authorization attempt', { status: 400 });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...googleCredentials(), code: url.searchParams.get('code')!, redirect_uri: appUrl() + '/api/samson-youtube/callback', grant_type: 'authorization_code' }), cache: 'no-store'
  });
  if (!tokenResponse.ok) return new NextResponse('Google authorization failed', { status: 401 });
  const token = await tokenResponse.json();
  const [identityResponse, channelResponse] = await Promise.all([
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token.access_token }, cache: 'no-store' }),
    youtube('channels?part=id&mine=true', token.access_token)
  ]);
  if (!identityResponse.ok || !channelResponse.ok) return new NextResponse('Could not verify Google account or YouTube channel', { status: 401 });
  const identity = await identityResponse.json(), channel = await channelResponse.json();
  const channelId = process.env.SAMSON_YOUTUBE_CHANNEL_ID;
  if (!identity.email_verified || identity.email?.toLowerCase() !== (process.env.SAMSON_ADMIN_EMAIL || '').toLowerCase() || !channelId || !channel.items?.some((item: {id:string}) => item.id === channelId)) {
    return new NextResponse('This account is not authorized for the Samson YouTube channel', { status: 403 });
  }
  await saveSession({ access_token: token.access_token, refresh_token: token.refresh_token, expires_at: Date.now() + token.expires_in * 1000, email: identity.email, channel_id: channelId });
  const response = NextResponse.redirect(appUrl() + '/samson-youtube');
  response.cookies.delete('samson_yt_oauth_state');
  return response;
}
