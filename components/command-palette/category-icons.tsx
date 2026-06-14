import type { ComponentProps } from 'react';
import type { ToolCategory } from '@/lib/tools/types';

type IconProps = ComponentProps<'svg'>;

const SVG_PROPS: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function Pdf(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 14h6M9 17h4" />
    </svg>
  );
}

function Video(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3z" />
    </svg>
  );
}

function Audio(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M9 18V7l11-2v11" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

function Image(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m3 17 5-5 6 6 3-3 4 4" />
    </svg>
  );
}

function Svg(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M5 7h3.5a2.5 2.5 0 0 1 0 5H7a2 2 0 0 0 0 4h3" />
      <path d="m14 7-2 10" />
      <path d="M16 7h4l-2 10h-2" />
    </svg>
  );
}

function Password(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

function Json(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M8 4c-2 0-3 1-3 3v3c0 1.5-.5 2-2 2 1.5 0 2 .5 2 2v3c0 2 1 3 3 3" />
      <path d="M16 4c2 0 3 1 3 3v3c0 1.5.5 2 2 2-1.5 0-2 .5-2 2v3c0 2-1 3-3 3" />
    </svg>
  );
}

function Text(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h14" />
    </svg>
  );
}

function Encode(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="m8 18-5-6 5-6" />
      <path d="m16 6 5 6-5 6" />
      <path d="m14 4-4 16" />
    </svg>
  );
}

function Qr(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v3M14 21h3M21 18v3" />
    </svg>
  );
}

function Color(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="10" r="1.6" />
      <circle cx="12" cy="7" r="1.6" />
      <circle cx="16" cy="10" r="1.6" />
      <path d="M12 14a3 3 0 0 0 0 6h2a2 2 0 0 0 0-4" />
    </svg>
  );
}

function Dev(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="m4 8 4 4-4 4" />
      <path d="M12 16h8" />
    </svg>
  );
}

function Utility(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function Reading(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M12 6.5C10.5 5 8 4.5 5 5v12c3-.5 5.5 0 7 1.5 1.5-1.5 4-2 7-1.5V5c-3-.5-5.5 0-7 1.5Z" />
      <path d="M12 6.5v12" />
    </svg>
  );
}

// --- Per-tool icons -------------------------------------------------------
// Tools whose card deserves a more specific glyph than the category icon.

function ReadingFocus(props: IconProps) {
  // Guided reading: an eye, guided along the line.
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ReadingDyslexiaFont(props: IconProps) {
  // Typography: a type/T glyph with its baseline.
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M5 7V4h14v3" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </svg>
  );
}

function ReadingPdfDyslexia(props: IconProps) {
  // A document whose glyphs are swapped: page outline + letter A.
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="m9.5 17 2.5-6 2.5 6" />
      <path d="M10.4 15.2h3.2" />
    </svg>
  );
}

function ReadingReadAloud(props: IconProps) {
  // Text-to-speech: a speaker with sound waves.
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9.5 9.5 0 0 1 0 13" />
    </svg>
  );
}

function ReadingImmersive(props: IconProps) {
  // Sentence focus ruler: dimmed lines around the highlighted one.
  return (
    <svg {...SVG_PROPS} {...props}>
      <path d="M6 5h12" />
      <rect x="3" y="9.5" width="18" height="5" rx="1.5" />
      <path d="M6 19h12" />
    </svg>
  );
}

const TOOL_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  'reading/focus': ReadingFocus,
  'reading/dyslexia-font': ReadingDyslexiaFont,
  'reading/pdf-dyslexia': ReadingPdfDyslexia,
  'reading/read-aloud': ReadingReadAloud,
  'reading/immersive': ReadingImmersive,
};

const ICONS: Record<ToolCategory, (p: IconProps) => React.ReactElement> = {
  pdf: Pdf,
  video: Video,
  audio: Audio,
  image: Image,
  svg: Svg,
  password: Password,
  json: Json,
  text: Text,
  reading: Reading,
  encode: Encode,
  qr: Qr,
  color: Color,
  utility: Utility,
  dev: Dev,
};

type CategoryIconProps = IconProps & {
  category: ToolCategory;
};

export function CategoryIcon({ category, ...rest }: CategoryIconProps) {
  const Icon = ICONS[category];
  return <Icon {...rest} />;
}

type ToolIconProps = IconProps & {
  category: ToolCategory;
  id: string;
};

/** Tool-specific glyph when one exists, otherwise the category icon. */
export function ToolIcon({ category, id, ...rest }: ToolIconProps) {
  const Icon = TOOL_ICONS[`${category}/${id}`] ?? ICONS[category];
  return <Icon {...rest} />;
}
