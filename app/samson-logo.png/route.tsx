import { ImageResponse } from 'next/og';

// Samson's approved logo lockup: white SAMSON, gold athlete and underline,
// red PROFESSIONAL WINDOW CLEANING. Keep the existing source artwork unchanged.
// Keep a visible gap below the white wordmark: the underline is at y=457,
// never touching the white SAMSON letters. Preserve the red subtitle artwork.
// This endpoint delivers a true PNG for both website use and Google Business Profile.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const square = new URL(request.url).searchParams.get('square') === '1';
  const width = square ? 1024 : 2048;
  const height = square ? 1024 : 682;
  const logoWidth = square ? 960 : 2048;
  const logoHeight = square ? 320 : 682;
  const left = square ? 32 : 0;
  const top = square ? 352 : 0;
  const scale = logoWidth / 2048;
  const source = new URL('/Samson%20Professional%20Window%20Cleaning%20Logo.png', request.url).toString();

  return new ImageResponse(
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', background: '#000000' }}>
      <div style={{ position: 'absolute', display: 'flex', left, top, width: logoWidth, height: logoHeight }}>
        <img
          src={source}
          alt=""
          width={logoWidth}
          height={logoHeight}
          style={{ width: logoWidth, height: logoHeight, objectFit: 'contain' }}
        />
        <div style={{ position: 'absolute', display: 'flex', left: 153 * scale, top: 457 * scale, width: 943 * scale, height: 8 * scale, backgroundColor: '#F9B719' }} />
        <div style={{ position: 'absolute', display: 'flex', left: 1162 * scale, top: 457 * scale, width: 730 * scale, height: 8 * scale, backgroundColor: '#F9B719' }} />
      </div>
    </div>,
    {
      width, height,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }
    }
  );
}
