import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '-0.04em',
          borderRadius: 8,
        }}
      >
        o
      </div>
    ),
    size,
  );
}
