import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightedText } from '@/components/ui/highlighted-text';

describe('HighlightedText', () => {
  it('renders text unchanged when no ranges', () => {
    render(<HighlightedText text="Merge PDFs" />);
    expect(screen.getByText('Merge PDFs')).toBeInTheDocument();
    expect(document.querySelector('mark')).toBeNull();
  });

  it('wraps the matched range in a mark', () => {
    render(<HighlightedText text="Merge PDFs" ranges={[[0, 5]]} />);
    const mark = document.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark!.textContent).toBe('Merge');
  });

  it('handles multiple ranges in order', () => {
    render(<HighlightedText text="json to json" ranges={[[0, 4], [8, 12]]} />);
    const marks = document.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]!.textContent).toBe('json');
    expect(marks[1]!.textContent).toBe('json');
  });

  it('preserves the full text content across splits', () => {
    const { container } = render(
      <HighlightedText text="Détourer une image" ranges={[[0, 8]]} />,
    );
    expect(container.textContent).toBe('Détourer une image');
  });
});
