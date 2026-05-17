import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { JsonInput } from '@/components/tools/json/json-input';

describe('JsonInput', () => {
  it('renders a textarea with the value and reflects user typing', () => {
    const onChange = vi.fn();
    render(<JsonInput value="" onChange={onChange} placeholder="paste here" />);
    const textarea = screen.getByPlaceholderText('paste here');
    fireEvent.change(textarea, { target: { value: '{"a":1}' } });
    expect(onChange).toHaveBeenCalledWith('{"a":1}');
  });

  it('reads a dropped .json file and forwards its text via onChange', async () => {
    const onChange = vi.fn();
    render(<JsonInput value="" onChange={onChange} placeholder="paste here" />);
    const textarea = screen.getByPlaceholderText('paste here');

    const fileText = '{"hello":"world"}';
    const file = new File([fileText], 'sample.json', { type: 'application/json' });

    fireEvent.drop(textarea, {
      dataTransfer: { files: [file] },
    });

    // file.text() is async — wait one tick
    await new Promise((r) => setTimeout(r, 0));

    expect(onChange).toHaveBeenCalledWith(fileText);
  });

  it('ignores non-JSON drops', async () => {
    const onChange = vi.fn();
    render(<JsonInput value="" onChange={onChange} placeholder="paste here" />);
    const textarea = screen.getByPlaceholderText('paste here');

    const file = new File(['hello'], 'sample.bin', { type: 'application/octet-stream' });

    fireEvent.drop(textarea, {
      dataTransfer: { files: [file] },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not allow drop when readOnly', async () => {
    const onChange = vi.fn();
    render(<JsonInput value="" onChange={onChange} readOnly placeholder="paste here" />);
    const textarea = screen.getByPlaceholderText('paste here');

    const file = new File(['{}'], 'sample.json', { type: 'application/json' });
    fireEvent.drop(textarea, {
      dataTransfer: { files: [file] },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies invalid styling when invalid is true', () => {
    const onChange = vi.fn();
    const { container } = render(
      <JsonInput value="bad" onChange={onChange} invalid placeholder="paste here" />,
    );
    const textarea = container.querySelector('textarea');
    expect(textarea?.className).toMatch(/border-danger/);
  });
});
