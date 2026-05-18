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

function Utility(props: IconProps) {
  return (
    <svg {...SVG_PROPS} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

const ICONS: Record<ToolCategory, (p: IconProps) => React.ReactElement> = {
  pdf: Pdf,
  video: Video,
  audio: Audio,
  image: Image,
  svg: Svg,
  password: Password,
  json: Json,
  text: Text,
  encode: Encode,
  qr: Qr,
  color: Color,
  utility: Utility,
};

type CategoryIconProps = {
  category: ToolCategory;
  className?: string;
};

export function CategoryIcon({ category, className }: CategoryIconProps) {
  const Icon = ICONS[category];
  return <Icon className={className} />;
}
