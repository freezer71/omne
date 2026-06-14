import type { ReactElement } from 'react';
import { ToolIcon } from '@/components/command-palette/category-icons';
import { TOOLS } from '@/lib/tools/registry';
import type { ToolCategory } from '@/lib/tools/types';
import { scatterLayout, type ScatterOptions } from './scatter';

export const OG_W = 1200;
export const OG_H = 630;

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
        overflow: 'hidden',
      }}
    >
      {props.variant === 'hub' ? (
        <HubLayout {...props} />
      ) : props.variant === 'category' ? (
        <GridLayout {...props} />
      ) : (
        <ContentLayout {...props} />
      )}
    </div>
  );
}

/* ---------- Hub: a spilled-toolbox field of every tool glyph ------------- */

/** Lively, prominent scatter for the homepage hero. */
const HUB_SCATTER: ScatterOptions = {
  width: OG_W,
  height: OG_H,
  bleed: 72,
  minSize: 40,
  maxSize: 78,
  maxRotate: 22,
  minOpacity: 0.5,
  maxOpacity: 1,
  accentRatio: 0.14,
  jitter: 0.55,
};

function HubLayout({
  brand,
  title,
  description,
  privacyBadge,
  gridIcons = [],
}: OgTemplateData): ReactElement {
  return (
    <>
      <ScatterField
        icons={gridIcons}
        opts={HUB_SCATTER}
        stroke={COLORS.textMuted}
        accent={COLORS.accent}
        strokeWidth={1.7}
      />
      {/* Radial scrim: darkens the centre so the wordmark stays legible while
          the toolbox still spills, bright, out to the edges. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `radial-gradient(ellipse 62% 70% at 50% 50%, rgba(8,9,10,0.95) 0%, rgba(8,9,10,0.86) 42%, rgba(8,9,10,0) 78%)`,
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          width: '100%',
          height: '100%',
          padding: '56px',
        }}
      >
        <Brand brand={brand} center />
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            fontSize: title.length > 26 ? '46px' : '54px',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: COLORS.text,
            textAlign: 'center',
            maxWidth: '900px',
            textShadow: '0 2px 24px rgba(0,0,0,0.55)',
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              display: 'flex',
              flexShrink: 0,
              fontSize: '25px',
              lineHeight: 1.35,
              color: COLORS.textMuted,
              textAlign: 'center',
              maxWidth: '760px',
              textShadow: '0 1px 16px rgba(0,0,0,0.5)',
            }}
          >
            {description}
          </div>
        ) : null}
        <Badge text={privacyBadge} />
      </div>
    </>
  );
}

/* ---------- Category: a centered wall of tool icons ---------------------- */

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
  gridIcons = [],
}: OgTemplateData): ReactElement {
  const showDescription = Boolean(description);
  // A balanced block sized to that category's tool count, fit to its grid box
  // so the title and description never overflow.
  const { columns, tile } = fitGrid(gridIcons.length, 980, showDescription ? 280 : 340, 14, 86);
  const gap = 14;

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
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <BackgroundWall />
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

/* ---------- Scatter field: the "spilled toolbox" primitive -------------- */

/**
 * Absolutely-positioned field of tool glyphs scattered across the canvas via
 * {@link scatterLayout}. Used full-strength as the hub hero and faintly as the
 * backdrop behind tool/privacy pages. satori supports `position: absolute` and
 * `transform: rotate`, so each glyph is placed and tilted independently.
 */
function ScatterField({
  icons,
  opts,
  stroke,
  accent,
  strokeWidth = 1.6,
}: {
  icons: IconSpec[];
  opts: ScatterOptions;
  stroke: string;
  accent: string;
  strokeWidth?: number;
}): ReactElement {
  const placed = scatterLayout(icons, opts);
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex' }}>
      {placed.map((p, i) => (
        <div
          key={`${p.category}/${p.id}/${i}`}
          style={{
            position: 'absolute',
            left: `${p.left}px`,
            top: `${p.top}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: p.opacity,
            transform: `rotate(${p.rotate.toFixed(2)}deg)`,
            color: p.accent ? accent : stroke,
          }}
        >
          <ToolIcon
            category={p.category}
            id={p.id}
            width={Math.round(p.size)}
            height={Math.round(p.size)}
            stroke={p.accent ? accent : stroke}
            strokeWidth={strokeWidth}
          />
        </div>
      ))}
    </div>
  );
}

/** Faint full-bleed scatter of every tool glyph, behind the content. */
const BACKDROP_SCATTER: ScatterOptions = {
  width: OG_W,
  height: OG_H,
  bleed: 56,
  minSize: 44,
  maxSize: 66,
  maxRotate: 16,
  minOpacity: 0.045,
  maxOpacity: 0.075,
  accentRatio: 0,
  jitter: 0.5,
};

function BackgroundWall(): ReactElement {
  return (
    <ScatterField
      icons={TOOLS.map((t) => ({ category: t.category, id: t.id }))}
      opts={BACKDROP_SCATTER}
      stroke={COLORS.text}
      accent={COLORS.text}
      strokeWidth={1.5}
    />
  );
}
