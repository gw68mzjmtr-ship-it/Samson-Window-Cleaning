import { NextRequest, NextResponse } from 'next/server';
import { allowedOrigin, authorizedToken, youtube } from '../../../../lib/youtube-manager';
export const runtime = 'nodejs';
export async function GET() {
  const token = await authorizedToken();
  if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const channelResponse = await youtube('channels?part=contentDetails&mine=true', token);
  if (!channelResponse.ok) return NextResponse.json({ error: 'Could not retrieve channel' }, { status: 502 });
  const channels = await channelResponse.json();
  const playlist = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) return NextResponse.json({ error: 'Uploads playlist unavailable' }, { status: 502 });
  const items: { snippet: { resourceId: {videoId:string} } }[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ part: 'snippet', playlistId: playlist, maxResults: '50' });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await youtube('playlistItems?' + params, token);
    if (!response.ok) return NextResponse.json({ error: 'Could not retrieve uploads' }, { status: 502 });
    const data = await response.json();
    items.push(...(data.items || [])); pageToken = data.nextPageToken || '';
  } while (pageToken && items.length < 500);
  const ids = items.map(item => item.snippet.resourceId.videoId);
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await youtube('videos?part=snippet,status&id=' + ids.slice(i, i + 50).join(','), token);
    if (!r.ok) return NextResponse.json({ error: 'Could not retrieve video metadata' }, { status: 502 });
    videos.push(...((await r.json()).items || []));
  }
  return NextResponse.json({ videos, truncated: !!pageToken });
}
export async function POST(req: NextRequest) {
  if (!allowedOrigin(req)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const token = await authorizedToken();
  if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !/^[\w-]{11}$/.test(body.id) || typeof body.title !== 'string' || typeof body.description !== 'string' || !body.title.trim() || body.title.length > 100 || body.description.length > 5000) {
    return NextResponse.json({ error: 'Invalid title, description, or video ID' }, { status: 400 });
  }
  const currentResponse = await youtube('videos?part=snippet&id=' + encodeURIComponent(body.id), token);
  if (!currentResponse.ok) return NextResponse.json({ error: 'Unable to verify video' }, { status: 502 });
  const current = (await currentResponse.json()).items?.[0];
  if (!current || current.snippet.channelId !== process.env.SAMSON_YOUTUBE_CHANNEL_ID) return NextResponse.json({ error: 'Video is not on your channel' }, { status: 403 });
  const snippet = { ...current.snippet, title: body.title.trim(), description: body.description };
  const updateResponse = await youtube('videos?part=snippet', token, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: body.id, snippet }) });
  if (!updateResponse.ok) return NextResponse.json({ error: 'YouTube rejected the update', details: (await updateResponse.text()).slice(0, 500) }, { status: 502 });
  return NextResponse.json({ ok: true, video: await updateResponse.json() });
}
