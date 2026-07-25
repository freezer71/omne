import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resultMessages } from '@/tests/helpers/tool-result-messages';

const downloadBlob = vi.fn();

vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { ToolResult } from '@/components/ui/tool-result';

function blobOf(bytes: number, type = 'video/mp4') {
  return new Blob([new Uint8Array(bytes)], { type });
}

const output = (bytes = 680, filename = 'compressed-clip.mp4') => ({
  blob: blobOf(bytes),
  filename,
});

beforeEach(() => {
  downloadBlob.mockReset();
});

describe('ToolResult', () => {
  it('names the produced file and announces completion to assistive tech', () => {
    render(
      <ToolResult
        result={output()}
        kind="video"
        sourceBytes={1000}
        messages={resultMessages}
        onRetry={() => {}}
      />,
    );
    const panel = screen.getByRole('status');
    expect(panel).toHaveTextContent(resultMessages.heading);
    expect(panel).toHaveTextContent('compressed-clip.mp4');
    expect(panel).toHaveTextContent(resultMessages.ready);
  });

  it('states the size change instead of leaving two byte counts to compare', () => {
    render(
      <ToolResult
        result={output(680)}
        kind="video"
        sourceBytes={1000}
        messages={resultMessages}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText('32% smaller')).toBeInTheDocument();
    expect(screen.getByText('1000 B')).toBeInTheDocument();
    expect(screen.getByText('680 B')).toBeInTheDocument();
  });

  it('says so when the tool made the file bigger', () => {
    render(
      <ToolResult
        result={output(1250)}
        kind="video"
        sourceBytes={1000}
        messages={resultMessages}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText('25% larger')).toBeInTheDocument();
  });

  it('omits the comparison when there is no source size to compare against', () => {
    render(
      <ToolResult result={output()} kind="video" messages={resultMessages} onRetry={() => {}} />,
    );
    expect(screen.queryByText(resultMessages.originalLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(/smaller|larger/)).not.toBeInTheDocument();
    expect(screen.getByText('680 B')).toBeInTheDocument();
  });

  it('downloads only when asked, with the filename the tool chose', async () => {
    const user = userEvent.setup();
    render(
      <ToolResult
        result={output(680, 'muted-clip.mp4')}
        kind="video"
        sourceBytes={1000}
        messages={resultMessages}
        onRetry={() => {}}
      />,
    );
    expect(downloadBlob).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: resultMessages.download }));
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('muted-clip.mp4');
  });

  it('hands control back through retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ToolResult
        result={output()}
        kind="video"
        sourceBytes={1000}
        messages={resultMessages}
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole('button', { name: resultMessages.retry }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('previews audio with an audio player rather than a video one', () => {
    const { container } = render(
      <ToolResult
        result={{ blob: blobOf(10, 'audio/mpeg'), filename: 'x.mp3' }}
        kind="audio"
        messages={resultMessages}
        onRetry={() => {}}
      />,
    );
    expect(container.querySelector('audio')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });
});
