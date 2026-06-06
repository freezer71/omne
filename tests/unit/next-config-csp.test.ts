import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

/**
 * Pins the CSP connect-src allowlist. The remove-bg tool downloads the
 * RMBG-1.4 model from Hugging Face, which 302-redirects LFS files to its
 * Xet storage backend (cas-bridge.xethub.hf.co & co.) — every host involved
 * in that chain must be allowed or the tool breaks in production with
 * "TypeError: Failed to fetch".
 */
async function getConnectSrcHosts(): Promise<string[]> {
  const rules = await nextConfig.headers!();
  const catchAll = rules.find((rule) => rule.source === '/:path*');
  const csp =
    catchAll?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
  const directive = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('connect-src'));
  return directive ? directive.split(/\s+/).slice(1) : [];
}

describe('CSP connect-src', () => {
  it('allows exactly the documented remote hosts (incl. HF Xet storage)', async () => {
    expect(await getConnectSrcHosts()).toEqual([
      "'self'",
      'https://huggingface.co',
      'https://cdn-lfs.huggingface.co',
      'https://*.xethub.hf.co',
      'https://www.skills.sh',
    ]);
  });
});

describe('self-hosted onnxruntime assets (/ort/)', () => {
  it('serves /ort/ with CORP + COEP so the threaded wasm worker loads on the isolated remove-bg page', async () => {
    const rules = await nextConfig.headers!();
    const ort = rules.find((rule) => rule.source === '/ort/:path*');
    expect(ort).toBeDefined();
    const get = (key: string) => ort?.headers.find((h) => h.key === key)?.value;
    expect(get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(get('Cache-Control')).toContain('immutable');
  });
});
