export type LoremUnit = 'words' | 'sentences' | 'paragraphs';

export type LoremOptions = {
  unit: LoremUnit;
  count: number;
  startWithLoremIpsum: boolean;
  htmlWrap: boolean;
};

export const LOREM_WORDS: readonly string[] = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'curabitur', 'pretium',
  'tincidunt', 'lacus', 'nulla', 'gravida', 'orci', 'a', 'odio', 'nullam',
  'varius', 'turpis', 'et', 'commodo', 'pharetra', 'est', 'eros', 'suscipit',
  'sapien', 'nec', 'dictum', 'urna', 'felis', 'porttitor', 'mauris',
  'condimentum', 'nibh', 'vitae', 'sodales', 'praesent', 'rutrum', 'tellus',
  'vivamus', 'risus', 'maecenas', 'fermentum', 'placerat', 'dignissim',
];

const LOREM_IPSUM_START = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];

const MIN_SENTENCE_WORDS = 5;
const MAX_SENTENCE_WORDS = 15;
const MIN_PARAGRAPH_SENTENCES = 3;
const MAX_PARAGRAPH_SENTENCES = 7;

function pseudoRandom(seed: { value: number }): number {
  // Simple mulberry32 — pure and stable per seed for the test suite.
  seed.value = (seed.value + 0x6d2b79f5) | 0;
  let t = seed.value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickWord(rand: () => number): string {
  return LOREM_WORDS[Math.floor(rand() * LOREM_WORDS.length)] ?? 'lorem';
}

function pickWords(rand: () => number, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(pickWord(rand));
  return out;
}

function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function buildSentence(rand: () => number, opts: { lead?: string[] } = {}): string {
  const wordCount = intBetween(rand, MIN_SENTENCE_WORDS, MAX_SENTENCE_WORDS);
  const lead = opts.lead ?? [];
  const tail = pickWords(rand, Math.max(0, wordCount - lead.length));
  const words = [...lead, ...tail];
  if (words.length === 0) return '';
  words[0] = (words[0]?.charAt(0).toUpperCase() ?? '') + (words[0]?.slice(1) ?? '');
  return words.join(' ') + '.';
}

function buildParagraph(rand: () => number, opts: { lead?: string[] } = {}): string {
  const sentenceCount = intBetween(rand, MIN_PARAGRAPH_SENTENCES, MAX_PARAGRAPH_SENTENCES);
  const parts: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    parts.push(buildSentence(rand, i === 0 ? opts : {}));
  }
  return parts.join(' ');
}

/**
 * Generate lorem-ipsum text. Pass an explicit `seed` to make output stable
 * (useful in tests). Without a seed, uses Math.random for variety.
 */
export function generateLorem(options: LoremOptions, seed?: number): string {
  const safeCount = Math.max(0, Math.min(100, Math.floor(options.count)));
  if (safeCount === 0) return '';

  const seedState = { value: seed ?? Math.floor(Math.random() * 0xffffffff) };
  const rand: () => number =
    seed === undefined && typeof Math.random === 'function'
      ? Math.random.bind(Math)
      : () => pseudoRandom(seedState);

  const leadWords = options.startWithLoremIpsum ? [...LOREM_IPSUM_START] : undefined;

  if (options.unit === 'words') {
    const words: string[] = [];
    if (leadWords) words.push(...leadWords.slice(0, safeCount));
    while (words.length < safeCount) words.push(pickWord(rand));
    const text = words.join(' ');
    const finalText = text.charAt(0).toUpperCase() + text.slice(1);
    if (options.htmlWrap) return `<p>${finalText}</p>`;
    return finalText;
  }

  if (options.unit === 'sentences') {
    const sentences: string[] = [];
    for (let i = 0; i < safeCount; i++) {
      sentences.push(buildSentence(rand, i === 0 && leadWords ? { lead: leadWords } : {}));
    }
    const text = sentences.join(' ');
    if (options.htmlWrap) return `<p>${text}</p>`;
    return text;
  }

  // paragraphs
  const paragraphs: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    paragraphs.push(
      buildParagraph(rand, i === 0 && leadWords ? { lead: leadWords } : {}),
    );
  }
  if (options.htmlWrap) {
    return paragraphs.map((p) => `<p>${p}</p>`).join('\n');
  }
  return paragraphs.join('\n\n');
}
