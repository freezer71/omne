import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from '@/components/json-ld';

describe('JsonLd', () => {
  it('renders a <script type="application/ld+json"> with valid JSON', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Merge PDFs',
    };
    const { container } = render(<JsonLd data={data} id="test-ld" />);
    const script = container.querySelector('script#test-ld');
    expect(script).not.toBeNull();
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    const text = script?.textContent ?? '';
    const parsed = JSON.parse(text);
    expect(parsed['@type']).toBe('WebApplication');
    expect(parsed.name).toBe('Merge PDFs');
  });

  it('escapes < characters to prevent breaking out of the script tag', () => {
    const data = { description: 'use </script> safely' };
    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const text = script?.textContent ?? '';
    expect(text).not.toContain('</script>');
    expect(text).toContain('\\u003c/script');
    const parsed = JSON.parse(text);
    expect(parsed.description).toBe('use </script> safely');
  });
});
