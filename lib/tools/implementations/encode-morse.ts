const TEXT_TO_MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};

const MORSE_TO_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(TEXT_TO_MORSE).map(([k, v]) => [v, k]),
);

export function textToMorse(input: string): string {
  if (!input) return '';
  return input.toUpperCase().split('\n').map((line) => {
    return line.split(/\s+/).filter(Boolean).map((word) => {
      return [...word].map((c) => TEXT_TO_MORSE[c] ?? '').filter(Boolean).join(' ');
    }).join(' / ');
  }).join('\n');
}

export function morseToText(input: string): string {
  if (!input) return '';
  return input.split('\n').map((line) => {
    return line.split(/\s*\/\s*/).map((word) => {
      return word.split(/\s+/).filter(Boolean).map((code) => MORSE_TO_TEXT[code] ?? '').join('');
    }).join(' ');
  }).join('\n');
}

export type MorsePlayback = {
  unitMs: number;
  freq: number;
};

export const DEFAULT_PLAYBACK: MorsePlayback = { unitMs: 80, freq: 600 };

export async function playMorse(morse: string, ctx: AudioContext, opts: MorsePlayback = DEFAULT_PLAYBACK): Promise<void> {
  const unit = opts.unitMs / 1000;
  let t = ctx.currentTime + 0.05;
  for (const c of morse) {
    if (c === '.') {
      scheduleBeep(ctx, t, unit, opts.freq);
      t += unit + unit;
    } else if (c === '-') {
      scheduleBeep(ctx, t, unit * 3, opts.freq);
      t += unit * 3 + unit;
    } else if (c === ' ') {
      t += unit * 2;
    } else if (c === '/') {
      t += unit * 4;
    } else if (c === '\n') {
      t += unit * 6;
    }
  }
  return new Promise((resolve) => window.setTimeout(resolve, (t - ctx.currentTime) * 1000));
}

function scheduleBeep(ctx: AudioContext, when: number, duration: number, freq: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.2, when + 0.005);
  gain.gain.setValueAtTime(0.2, when + duration - 0.005);
  gain.gain.linearRampToValueAtTime(0, when + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.01);
}
