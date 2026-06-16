import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { XmlFormatTool } from '@/components/tools/xml-format-tool';

const messages = {
  inputLabel: 'Input',
  inputPlaceholder: 'Paste XML…',
  outputLabel: 'Output',
  mode: 'Mode',
  modePretty: 'Beautify',
  modeMinify: 'Minify',
  modeToJson: 'XML → JSON',
  modeFromJson: 'JSON → XML',
  indent: 'Indent',
  indent2: '2 spaces',
  indent4: '4 spaces',
  indentTab: 'Tab',
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

function readOnlyOutput(): HTMLTextAreaElement | undefined {
  return screen
    .getAllByRole('textbox')
    .find((el) => (el as HTMLTextAreaElement).readOnly) as HTMLTextAreaElement | undefined;
}

describe('XmlFormatTool', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('renders the empty state initially', () => {
    render(<XmlFormatTool {...messages} />);
    expect(screen.getByText('Output will appear here.')).toBeInTheDocument();
  });

  it('beautifies valid XML after debounce', async () => {
    render(<XmlFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste XML…'), {
      target: { value: '<a><b>1</b></a>' },
    });
    vi.advanceTimersByTime(250);

    await waitFor(() => expect(screen.getByText('Valid')).toBeInTheDocument());
    expect(readOnlyOutput()?.value).toBe('<a>\n  <b>1</b>\n</a>');
  });

  it('shows an invalid badge and error for malformed XML', async () => {
    render(<XmlFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste XML…'), {
      target: { value: '<a><b>1</a>' },
    });
    vi.advanceTimersByTime(250);

    await waitFor(() => expect(screen.getByText('Invalid')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('minifies onto a single line', async () => {
    render(<XmlFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste XML…'), {
      target: { value: '<a>\n  <b>1</b>\n</a>' },
    });
    vi.advanceTimersByTime(250);
    await waitFor(() => expect(screen.getByText('Valid')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Minify'));
    await waitFor(() => expect(readOnlyOutput()?.value).toBe('<a><b>1</b></a>'));
  });

  it('converts XML to JSON', async () => {
    render(<XmlFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste XML…'), {
      target: { value: '<root><n>42</n></root>' },
    });
    fireEvent.click(screen.getByText('XML → JSON'));
    vi.advanceTimersByTime(250);

    await waitFor(() => {
      const out = readOnlyOutput()?.value ?? '';
      expect(out).toContain('"root"');
      expect(out).toContain('42');
    });
  });

  it('hides the indent control in minify mode', async () => {
    render(<XmlFormatTool {...messages} />);
    expect(screen.getByText('Indent')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Minify'));
    await waitFor(() => expect(screen.queryByText('Indent')).not.toBeInTheDocument());
  });

  it('Load sample populates the input', () => {
    render(<XmlFormatTool {...messages} />);
    fireEvent.click(screen.getByText('Load sample'));
    const input = screen.getByPlaceholderText('Paste XML…') as HTMLTextAreaElement;
    expect(input.value).toMatch(/<catalog>/);
  });

  it('Clear empties the input and disables itself when empty', () => {
    render(<XmlFormatTool {...messages} />);
    fireEvent.change(screen.getByPlaceholderText('Paste XML…'), {
      target: { value: '<a/>' },
    });
    fireEvent.click(screen.getByText('Clear'));
    expect((screen.getByPlaceholderText('Paste XML…') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText('Clear')).toBeDisabled();
  });
});
