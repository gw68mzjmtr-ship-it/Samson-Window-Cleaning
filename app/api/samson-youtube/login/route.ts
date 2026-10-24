import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { appUrl, googleCredentials } from '../../../../lib/youtube-manager';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const canonical = new URL(appUrl());
  if (req.nextUrl.origin !== canonical.origin) {
    return NextResponse.redirect(new URL('/api/samson-youtube/login', canonical));
  }
  const { client_id } = googleCredentials();
  const state = randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    client_id, redirect_uri: appUrl() + '/api/samson-youtube/callback',
    response_type: 'code', scope: 'openid email https://www.googleapis.com/auth/youtube',
    access_type: 'offline', prompt: 'consent', state
  });
  const response = NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params);
  response.cookies.set('samson_yt_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
