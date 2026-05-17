export type StrengthLabel = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

export type StrengthWarning =
  | 'sequential'
  | 'repeated'
  | 'common-pattern'
  | 'too-short';

export type StrengthResult = {
  entropyBits: number;
  label: StrengthLabel;
  length: number;
  charsetClasses: number;
  warnings: StrengthWarning[];
};

const COMMON_PATTERNS = [
  'password', 'qwerty', 'azerty', '123456', '12345678', '111111',
  'iloveyou', 'admin', 'welcome', 'letmein', 'monkey', 'dragon',
  'football', 'baseball', 'master', 'sunshine', 'princess', 'login',
  'abc123', 'passw0rd',
];

function charsetSize(pwd: string): { size: number; classes: number } {
  let lower = false, upper = false, digit = false, symbol = false, other = false;
  for (const ch of pwd) {
    const c = ch.charCodeAt(0);
    if (c >= 0x61 && c <= 0x7a) lower = true;
    else if (c >= 0x41 && c <= 0x5a) upper = true;
    else if (c >= 0x30 && c <= 0x39) digit = true;
    else if (c >= 0x20 && c <= 0x7e) symbol = true;
    else other = true;
  }
  let size = 0;
  let classes = 0;
  if (lower) { size += 26; classes++; }
  if (upper) { size += 26; classes++; }
  if (digit) { size += 10; classes++; }
  if (symbol) { size += 32; classes++; }
  if (other) { size += 100; classes++; }
  return { size, classes };
}

function hasSequential(pwd: string): boolean {
  if (pwd.length < 3) return false;
  const lc = pwd.toLowerCase();
  for (let i = 0; i <= lc.length - 3; i++) {
    const a = lc.charCodeAt(i);
    const b = lc.charCodeAt(i + 1);
    const c = lc.charCodeAt(i + 2);
    if (b === a + 1 && c === b + 1) return true;
    if (b === a - 1 && c === b - 1) return true;
  }
  return false;
}

function hasRepeated(pwd: string): boolean {
  if (pwd.length < 3) return false;
  for (let i = 0; i <= pwd.length - 3; i++) {
    if (pwd[i] === pwd[i + 1] && pwd[i + 1] === pwd[i + 2]) return true;
  }
  return false;
}

function hasCommonPattern(pwd: string): boolean {
  const lc = pwd.toLowerCase();
  return COMMON_PATTERNS.some((p) => lc.includes(p));
}

export function evaluateStrength(password: string): StrengthResult {
  const length = password.length;
  const { size, classes } = charsetSize(password);
  const entropyBits = length > 0 && size > 1 ? length * Math.log2(size) : 0;

  const warnings: StrengthWarning[] = [];
  if (length > 0 && length < 8) warnings.push('too-short');
  if (hasRepeated(password)) warnings.push('repeated');
  if (hasSequential(password)) warnings.push('sequential');
  if (hasCommonPattern(password)) warnings.push('common-pattern');

  // Reduce effective entropy when warnings exist (penalize predictable structure)
  const penalty = warnings.length * 8;
  const effective = Math.max(0, entropyBits - penalty);

  return {
    entropyBits: effective,
    label: labelFromEntropy(effective),
    length,
    charsetClasses: classes,
    warnings,
  };
}

export function labelFromEntropy(bits: number): StrengthLabel {
  if (bits < 28) return 'very-weak';
  if (bits < 36) return 'weak';
  if (bits < 60) return 'fair';
  if (bits < 128) return 'strong';
  return 'very-strong';
}
