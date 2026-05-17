import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#5e6ad2',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 128,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '-0.04em',
          borderRadius: 40,
        }}
      >
        o
      </div>
    ),
    size,
  );
}
