import type { ReactElement } from 'react';
import { ToolIcon } from '@/components/command-palette/category-icons';
import { TOOLS } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';

export type IconSpec = { category: ToolCategory; id: string };

export type OgVariant = 'hub' | 'tool' | 'category' | 'privacy';

export type OgTemplateData = {
  brand: string;
  /** Chip label shown top-right on tool pages. */
  category?: string;
  title: string;
  description: string;
  privacyBadge: string;
  variant: OgVariant;
  /** Foreground tile grid (hub: every tool, category: that category's tools). */
  gridIcons?: IconSpec[];
  /** Large accent glyph for tool/category pages. */
  heroIcon?: IconSpec;
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
  tileBg: 'rgba(255,255,255,0.03)',
  tileBorder: 'rgba(255,255,255,0.09)',
};

const SANS = '"Geist", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const MONO = '"Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace';

export function OgTemplate(props: OgTemplateData): ReactElement {
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
        position: 'relative',
      }}
    >
      {props.variant === 'hub' || props.variant === 'category' ? (
        <GridLayout {...props} />
      ) : (
        <ContentLayout {...props} />
      )}
    </div>
  );
}

/* ---------- Hub / category: a centered wall of tool icons ---------------- */

/**
 * Pick the column count that yields the largest square tile fitting inside a
 * `maxW × maxH` box, capped at `tileMax`. Keeps the wall dense for the hub
 * (88 tools) and balanced for small categories alike.
 */
function fitGrid(
  count: number,
  maxW: number,
  maxH: number,
  gap: number,
  tileMax: number,
): { columns: number; tile: number } {
  let best = { columns: 1, tile: 0 };
  for (let c = 1; c <= count; c++) {
    const rows = Math.ceil(count / c);
    const tileW = (maxW - (c - 1) * gap) / c;
    const tileH = (maxH - (rows - 1) * gap) / rows;
    const tile = Math.min(tileW, tileH, tileMax);
    if (tile > best.tile) best = { columns: c, tile };
  }
  return { columns: best.columns, tile: Math.floor(best.tile) };
}

function GridLayout({
  brand,
  title,
  description,
  privacyBadge,
  variant,
  gridIcons = [],
}: OgTemplateData): ReactElement {
  const isHub = variant === 'hub';
  const showDescription = !isHub && Boolean(description);
  // Hub: a wide wall of every tool. Category: a balanced block sized to that
  // category's tool count. Both fit their grid box so text never overflows.
  const { columns, tile } = isHub
    ? fitGrid(gridIcons.length, 1090, 400, 10, 54)
    : fitGrid(gridIcons.length, 980, showDescription ? 280 : 340, 14, 86);
  const gap = isHub ? 10 : 14;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '22px',
        width: '100%',
        height: '100%',
        padding: '44px 56px',
      }}
    >
      <Brand brand={brand} center />
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          fontSize: title.length > 26 ? '44px' : '52px',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: COLORS.text,
          textAlign: 'center',
          maxWidth: '1000px',
        }}
      >
        {title}
      </div>
      {showDescription ? (
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            fontSize: '24px',
            lineHeight: 1.35,
            color: COLORS.textMuted,
            textAlign: 'center',
            maxWidth: '860px',
          }}
        >
          {description}
        </div>
      ) : null}
      <IconGrid icons={gridIcons} columns={columns} tile={tile} gap={gap} />
      <Badge text={privacyBadge} />
    </div>
  );
}

/* ---------- Tool / privacy: editorial layout + faint icon backdrop ------- */

function ContentLayout({
  brand,
  category,
  title,
  description,
  privacyBadge,
  heroIcon,
}: OgTemplateData): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '64px 72px',
        position: 'relative',
      }}
    >
      <BackgroundWall />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Brand brand={brand} />
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
        {heroIcon ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '92px',
              height: '92px',
              borderRadius: '24px',
              background: COLORS.accent,
              color: COLORS.accentFg,
            }}
          >
            <ToolIcon
              category={heroIcon.category}
              id={heroIcon.id}
              width={50}
              height={50}
              stroke={COLORS.accentFg}
              strokeWidth={1.75}
            />
          </div>
        ) : null}
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

      <Badge text={privacyBadge} />
    </div>
  );
}

/* ---------- Shared pieces ------------------------------------------------- */

function Brand({ brand, center }: { brand: string; center?: boolean }): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        gap: '14px',
        fontSize: '32px',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: COLORS.text,
      }}
    >
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
      <span>{brand}</span>
    </div>
  );
}

function Badge({ text }: { text: string }): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        gap: '14px',
        fontFamily: MONO,
        fontSize: '20px',
        color: COLORS.textFaint,
      }}
    >
      <div style={{ display: 'flex', width: '40px', height: '2px', background: COLORS.border }} />
      <span>{text}</span>
    </div>
  );
}

function IconGrid({
  icons,
  columns,
  tile,
  gap,
}: {
  icons: IconSpec[];
  columns: number;
  tile: number;
  gap: number;
}): ReactElement {
  const width = columns * tile + (columns - 1) * gap;
  const glyph = Math.round(tile * 0.56);
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `${gap}px`,
        width: `${width}px`,
      }}
    >
      {icons.map((s, i) => (
        <div
          key={`${s.category}/${s.id}/${i}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${tile}px`,
            height: `${tile}px`,
            borderRadius: `${Math.round(tile * 0.26)}px`,
            background: COLORS.tileBg,
            border: `1px solid ${COLORS.tileBorder}`,
            color: COLORS.textMuted,
          }}
        >
          <ToolIcon
            category={s.category}
            id={s.id}
            width={glyph}
            height={glyph}
            stroke={COLORS.textMuted}
            strokeWidth={1.6}
          />
        </div>
      ))}
    </div>
  );
}

/** Faint full-bleed texture of every tool glyph, behind the content. */
function BackgroundWall(): ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: '30px',
        padding: '40px',
        opacity: 0.05,
        color: COLORS.text,
      }}
    >
      {TOOLS.map((t, i) => (
        <ToolIcon
          key={`${t.category}/${t.id}/${i}`}
          category={t.category}
          id={t.id}
          width={54}
          height={54}
          stroke={COLORS.text}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}
