import type { ReactElement } from 'react';

export type OgTemplateData = {
  brand: string;
  category?: string;
  title: string;
  description: string;
  privacyBadge: string;
};

const COLORS = {
  bg: '#08090a',
  bgAccent: '#111214',
  text: '#f4f4f5',
  textMuted: '#8a8f98',
  textFaint: '#5a5f68',
  accent: '#5e6ad2',
  accentFg: '#ffffff',
  border: 'rgba(255,255,255,0.08)',
};

const SANS = '"Geist", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace';

export function OgTemplate({
  brand,
  category,
  title,
  description,
  privacyBadge,
}: OgTemplateData): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgAccent} 100%)`,
        color: COLORS.text,
        fontFamily: SANS,
        padding: '64px 72px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: COLORS.text,
          }}
        >
          <BrandMark />
          <span>{brand}</span>
        </div>
        {category ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 18px',
              borderRadius: '999px',
              background: COLORS.accent,
              color: COLORS.accentFg,
              fontSize: '20px',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {category}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: '24px',
          marginTop: '24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            fontSize: title.length > 32 ? '64px' : '80px',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: COLORS.text,
            display: 'flex',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '28px',
            lineHeight: 1.45,
            color: COLORS.textMuted,
            maxWidth: '900px',
            display: 'flex',
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontFamily: MONO,
          fontSize: '20px',
          color: COLORS.textFaint,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '40px',
            height: '2px',
            background: COLORS.border,
          }}
        />
        <span>{privacyBadge}</span>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: COLORS.accent,
        color: COLORS.accentFg,
        fontSize: '24px',
        fontWeight: 700,
        letterSpacing: '-0.04em',
      }}
    >
      o
    </div>
  );
}
