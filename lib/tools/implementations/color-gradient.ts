import { formatRgbString, parseColor, rgbToHex, type Rgb } from './color-convert';

export type GradientKind = 'linear' | 'radial' | 'conic';

export type GradientStop = {
  color: string;
  position: number;
};

export type GradientOptions = {
  kind: GradientKind;
  angle: number;
  stops: GradientStop[];
};

export function parseStop(stop: GradientStop): Rgb | null {
  return parseColor(stop.color)?.rgb ?? null;
}

export function buildGradientCss(options: GradientOptions): string {
  const sortedStops = [...options.stops].sort((a, b) => a.position - b.position);
  const stopList = sortedStops.map((s) => {
    const rgb = parseStop(s);
    const color = rgb ? formatRgbString(rgb) : s.color;
    return `${color} ${s.position}%`;
  }).join(', ');
  if (options.kind === 'linear') {
    return `linear-gradient(${options.angle}deg, ${stopList})`;
  }
  if (options.kind === 'radial') {
    return `radial-gradient(circle, ${stopList})`;
  }
  return `conic-gradient(from ${options.angle}deg, ${stopList})`;
}

export function defaultStops(): GradientStop[] {
  return [
    { color: '#3b82f6', position: 0 },
    { color: '#8b5cf6', position: 100 },
  ];
}

export function exportAsHex(stops: GradientStop[]): string[] {
  return stops.map((s) => {
    const rgb = parseStop(s);
    return rgb ? rgbToHex(rgb) : s.color;
  });
}
