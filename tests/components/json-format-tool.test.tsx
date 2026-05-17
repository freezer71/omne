import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JsonFormatTool } from '@/components/tools/json-format-tool';

const messages = {
  inputLabel: 'Input',
  inputPlaceholder: 'Paste JSON…',
  outputLabel: 'Output',
  indent: 'Indent',
  indent2: '2 spaces',
  indent4: '4 spaces',
  indentTab: 'Tab',
  minify: 'Minify',
  sortKeys: 'Sort keys',
  copy: 'Copy',
  copied: 'Copied',
  download: 'Download',
  clear: 'Clear',
  loadSample: 'Load sample',
  empty: 'Output will appear here.',
  validBadge: 'Valid',
  invalidBadge: 'Invalid',
  errorTemplate: 'Line {line}, column {col} — {message}',
  sizeTemplate: '{bytes} bytes',
};

describe('JsonFormatTool', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders the empty state initially', () => {
    render(<JsonFormatTool {...messages} />);
    expect(screen.getByText('Output will appear here.')).toBeInTheDocument();
  });

  it('formats valid JSON after debounce', async () => {
    render(<JsonFormatTool {...messages} />);
    const input = screen.getByPlaceholderText('Paste JSON…') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '{"a":1,"b":2}' } });

    vi.advanceTimersByTime(250);

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    const outputs = screen.getAllByRole('textbox');
    const output = outputs.find((el) => (el as HTMLTextAreaElement).readOnly) as
      | HTMLTextAreaElement
      | undefined;
    expect(output).toBeTruthy();
    expect(output?.value).toContain('"a"');
    expect(output?.value).toContain('"b"');
    expect(output?.value).toMatch(/\n/);
  });

  it('shows an invalid badge and error message for malformed JSON', async () => {
    render(<JsonFormatTool {...messages} />);
    const input = screen.getByPlaceholderText('Paste JSON…');
    fireEvent.change(input, { target: { value: '{not json' } });

    vi.advanceTimersByTime(250);

    await waitFor(() => {
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('switches to minify mode and produces single-line output', async () => {
    render(<JsonFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste JSON…'), {
      target: { value: '{"a":1,"b":2}' },
    });
    vi.advanceTimersByTime(250);

    await waitFor(() => expect(screen.getByText('Valid')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Minify') ?? screen.getByText('Minify'));

    await waitFor(() => {
      const outputs = screen.getAllByRole('textbox');
      const output = outputs.find((el) => (el as HTMLTextAreaElement).readOnly) as
        | HTMLTextAreaElement
        | undefined;
      expect(output?.value).toBe('{"a":1,"b":2}');
    });
  });

  it('sorts keys when the checkbox is toggled', async () => {
    render(<JsonFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste JSON…'), {
      target: { value: '{"b":2,"a":1}' },
    });
    vi.advanceTimersByTime(250);

    await waitFor(() => expect(screen.getByText('Valid')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Sort keys'));

    await waitFor(() => {
      const outputs = screen.getAllByRole('textbox');
      const output = outputs.find((el) => (el as HTMLTextAreaElement).readOnly) as
        | HTMLTextAreaElement
        | undefined;
      const indexA = output?.value.indexOf('"a"') ?? -1;
      const indexB = output?.value.indexOf('"b"') ?? -1;
      expect(indexA).toBeGreaterThan(-1);
      expect(indexA).toBeLessThan(indexB);
    });
  });

  it('Load sample populates the input', () => {
    render(<JsonFormatTool {...messages} />);
    fireEvent.click(screen.getByText('Load sample'));
    const input = screen.getByPlaceholderText('Paste JSON…') as HTMLTextAreaElement;
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value).toMatch(/omne/);
  });

  it('Clear empties the input and disables itself when empty', () => {
    render(<JsonFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste JSON…'), {
      target: { value: '{"a":1}' },
    });
    fireEvent.click(screen.getByText('Clear'));
    expect((screen.getByPlaceholderText('Paste JSON…') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText('Clear')).toBeDisabled();
  });
});
