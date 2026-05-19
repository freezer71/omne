import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const splitVideo = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/video-split', async () => {
  const real = await vi.importActual<typeof import('@/lib/tools/implementations/video-split')>(
    '@/lib/tools/implementations/video-split',
  );
  return {
    ...real,
    splitVideo: (...args: unknown[]) => splitVideo(...args),
  };
});
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { VideoSplitTool } from '@/components/tools/video-split-tool';

const messages = {
  selectButton: 'Select a video',
  empty: 'Drop a video here.',
  splitButton: 'Split',
  busy: 'Splitting…',
  zipBusy: 'Zipping…',
  error: 'Could not split.',
  removeFile: 'Remove',
  modeLabel: 'Split mode',
  modeParts: 'Equal parts',
  modeDuration: 'By segment duration',
  partsLabel: 'Number of parts',
  partsHint: 'Between 2 and 10',
  durationLabel: 'Segment duration (seconds)',
  durationHint: 'Last segment may be shorter',
  timelineLabel: 'Split preview',
  segmentLabel: 'Segment {n}',
  previewGridLabel: 'Frame preview of each segment',
  previewCapturing: 'Capturing previews…',
  progressLabel: 'Segment {current}/{total}',
  etaLabel: '≈ {remaining} left',
  etaCalculating: 'Estimating…',
  downloadAllZip: 'Download all (ZIP)',
  downloadSegment: 'Download {name}',
  segmentsReady: '{n} segments ready',
  estimatedSegments: '≈ {n} segments',
  tooManySegmentsError: '{n} segments would be created — max is {max}. Increase the duration.',
  invalidInputError: 'Enter a positive duration.',
};

function setVideoDuration(d: number) {
  const video = document.querySelector('video');
  if (!video) throw new Error('No <video> element in the DOM');
  Object.defineProperty(video, 'duration', { value: d, configurable: true });
  fireEvent.loadedMetadata(video);
  return video;
}

const mp4 = (n = 'movie.mp4') => new File([new Uint8Array([0])], n, { type: 'video/mp4' });

beforeEach(() => {
  splitVideo.mockReset();
  downloadBlob.mockReset();
});

describe('VideoSplitTool', () => {
  it('renders empty state with disabled Split', () => {
    render(<VideoSplitTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.splitButton })).toBeDisabled();
  });

  it('enables Split once a video is loaded with a valid duration', async () => {
    const user = userEvent.setup();
    render(<VideoSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(30);
    expect(screen.getByRole('button', { name: messages.splitButton })).toBeEnabled();
  });

  it('switches between parts and duration modes', async () => {
    const user = userEvent.setup();
    render(<VideoSplitTool {...messages} />);
    expect(screen.getByLabelText(messages.partsLabel)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: messages.modeDuration }));
    expect(screen.getByLabelText(messages.durationLabel)).toBeInTheDocument();
  });

  it('calls splitVideo with the parts option and renders the segments list', async () => {
    const user = userEvent.setup();
    splitVideo.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<VideoSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(20);
    await user.clear(screen.getByLabelText(messages.partsLabel));
    await user.type(screen.getByLabelText(messages.partsLabel), '2');
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    expect(splitVideo).toHaveBeenCalledOnce();
    const opts = splitVideo.mock.calls[0]![1] as { mode: string; parts: number; totalDuration: number };
    expect(opts.mode).toBe('parts');
    expect(opts.parts).toBe(2);
    expect(opts.totalDuration).toBe(20);
    expect(await screen.findByText(/2 segments ready/)).toBeInTheDocument();
  });

  it('downloads a single segment with the correct filename', async () => {
    const user = userEvent.setup();
    splitVideo.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<VideoSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(20);
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    await screen.findByText(/2 segments ready/);
    const buttons = screen.getAllByRole('button', { name: /split-movie-part-/ });
    await user.click(buttons[0]!);
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('split-movie-part-1.mp4');
  });

  it('downloads all segments as a ZIP', async () => {
    const user = userEvent.setup();
    splitVideo.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<VideoSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(20);
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    await screen.findByText(/2 segments ready/);
    await user.click(screen.getByRole('button', { name: messages.downloadAllZip }));
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
    expect(downloadBlob.mock.calls[0]![1]).toBe('split-movie.zip');
  });

  it('renders a thumbnail canvas per segment with a numbered aria-label', async () => {
    const user = userEvent.setup();
    render(<VideoSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(30);
    await user.clear(screen.getByLabelText(messages.partsLabel));
    await user.type(screen.getByLabelText(messages.partsLabel), '4');
    const thumbs = await screen.findAllByRole('img', { name: /^Segment \d$/ });
    expect(thumbs).toHaveLength(4);
  });

  it('shows an error on failure', async () => {
    const user = userEvent.setup();
    splitVideo.mockRejectedValue(new Error('boom'));
    render(<VideoSplitTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(20);
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
