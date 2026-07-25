import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resultMessages } from '@/tests/helpers/tool-result-messages';

const estimateCompressedSize = vi.fn();
const compressVideo = vi.fn();

vi.mock('@/lib/tools/implementations/video-compress', async () => {
  const real = await vi.importActual<typeof import('@/lib/tools/implementations/video-compress')>(
    '@/lib/tools/implementations/video-compress',
  );
  return {
    ...real,
    compressVideo: (...args: unknown[]) => compressVideo(...args),
    estimateCompressedSize: (...args: unknown[]) => estimateCompressedSize(...args),
  };
});

import { VideoCompressTool } from '@/components/tools/video-compress-tool';

const messages = {
  selectButton: 'Choose a video',
  empty: 'Drop a video here.',
  compressButton: 'Compress',
  quality: 'Quality',
  qualityHigh: 'High',
  qualityMedium: 'Medium',
  qualityLow: 'Low',
  busy: 'Compressing…',
  error: 'Could not compress that video.',
  removeFile: 'Remove',
  etaLabel: 'About {remaining} left',
  etaCalculating: 'Estimating…',
  largeFileWarning: 'Large file warning.',
  estimateLabel: '~{size} after compression',
  estimateCalculating: 'Estimating size…',
  estimateHint: 'From a 2-second sample.',
  cancelLabel: 'Cancel',
  cancelledLabel: 'Cancelled. Nothing was changed.',
};

const mp4 = (n = 'clip.mp4') => new File([new Uint8Array([0])], n, { type: 'video/mp4' });

function setVideoDuration(d: number) {
  const video = document.querySelector('video');
  if (!video) throw new Error('No <video> element in the DOM');
  Object.defineProperty(video, 'duration', { value: d, configurable: true });
  fireEvent.loadedMetadata(video);
}

async function pickFile(user: ReturnType<typeof userEvent.setup>, durationSec = 60) {
  render(<VideoCompressTool {...messages} result={resultMessages} />);
  await user.upload(screen.getByLabelText(messages.selectButton), mp4());
  setVideoDuration(durationSec);
}

beforeEach(() => {
  estimateCompressedSize.mockReset();
  estimateCompressedSize.mockResolvedValue({ bytes: 3_000_000, sampledSeconds: 2 });
  compressVideo.mockReset();
});

describe('VideoCompressTool — size estimate', () => {
  it('does not guess before a file is loaded', async () => {
    render(<VideoCompressTool {...messages} result={resultMessages} />);
    expect(screen.queryByText(/after compression/)).not.toBeInTheDocument();
    expect(estimateCompressedSize).not.toHaveBeenCalled();
  });

  it('measures the chosen preset against the real duration', async () => {
    const user = userEvent.setup();
    await pickFile(user, 60);
    await waitFor(() => expect(estimateCompressedSize).toHaveBeenCalled());
    expect(estimateCompressedSize.mock.calls[0]![1]).toEqual({
      quality: 'medium',
      durationSec: 60,
    });
    expect(await screen.findByText('~2.9 MB after compression')).toBeInTheDocument();
  });

  it('re-measures when the preset changes', async () => {
    const user = userEvent.setup();
    await pickFile(user);
    await screen.findByText('~2.9 MB after compression');

    estimateCompressedSize.mockResolvedValue({ bytes: 900_000, sampledSeconds: 2 });
    await user.click(screen.getByText(messages.qualityLow));

    await waitFor(() => {
      const last = estimateCompressedSize.mock.calls.at(-1)![1] as { quality: string };
      expect(last.quality).toBe('low');
    });
    expect(await screen.findByText('~878.9 KB after compression')).toBeInTheDocument();
  });

  it('never shows a figure measured for a different preset', async () => {
    const user = userEvent.setup();
    await pickFile(user);
    await screen.findByText('~2.9 MB after compression');

    // A slow re-measure must not leave the previous preset's number on screen.
    estimateCompressedSize.mockReturnValue(new Promise(() => {}));
    await user.click(screen.getByText(messages.qualityLow));
    await waitFor(() =>
      expect(screen.queryByText('~2.9 MB after compression')).not.toBeInTheDocument(),
    );
  });

  it('stays silent when the sample encode fails, rather than hanging on "estimating"', async () => {
    const user = userEvent.setup();
    estimateCompressedSize.mockRejectedValue(new Error('bad codec'));
    await pickFile(user);
    await waitFor(() => expect(estimateCompressedSize).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.queryByText(messages.estimateCalculating)).not.toBeInTheDocument();
      expect(screen.queryByText(/after compression/)).not.toBeInTheDocument();
    });
    // The tool is still fully usable.
    expect(screen.getByRole('button', { name: messages.compressButton })).toBeEnabled();
  });

  it('gives way to the real size once the result is in', async () => {
    const user = userEvent.setup();
    compressVideo.mockResolvedValue(new Uint8Array([1, 2, 3]));
    await pickFile(user);
    await screen.findByText('~2.9 MB after compression');

    await user.click(screen.getByRole('button', { name: messages.compressButton }));
    expect(await screen.findByText(resultMessages.heading)).toBeInTheDocument();
    expect(screen.queryByText(/after compression/)).not.toBeInTheDocument();
  });
});
