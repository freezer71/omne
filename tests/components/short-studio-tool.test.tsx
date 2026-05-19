import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const generateShorts = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/short-studio', async () => {
  const real = await vi.importActual<typeof import('@/lib/tools/implementations/short-studio')>(
    '@/lib/tools/implementations/short-studio',
  );
  return {
    ...real,
    generateShorts: (...args: unknown[]) => generateShorts(...args),
  };
});
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { ShortStudioTool } from '@/components/tools/short-studio-tool';

const messages = {
  selectButton: 'Select a video',
  empty: 'Drop a video here.',
  splitButton: 'Generate shorts',
  busy: 'Generating…',
  zipBusy: 'Zipping…',
  error: 'Could not generate shorts.',
  removeFile: 'Remove',
  modeLabel: 'Split mode',
  modeParts: 'Equal parts',
  modeDuration: 'By segment duration',
  partsLabel: 'Number of parts',
  partsHint: 'Between 2 and 10',
  durationLabel: 'Segment duration (seconds)',
  durationHint: 'Last segment may be shorter',
  estimatedSegments: '≈ {n} segments',
  tooManySegmentsError: '{n} segments would be created — max is {max}.',
  invalidInputError: 'Enter a positive duration.',
  timelineLabel: 'Segment timeline',
  segmentLabel: 'Part {n}',
  watermarkLabel: 'Counter watermark',
  textTemplateLabel: 'Text template',
  textTemplateHint: 'Use {n} and {N}.',
  positionLabel: 'Position',
  positionTopLeft: 'Top left',
  positionTopCenter: 'Top center',
  positionTopRight: 'Top right',
  positionCenterLeft: 'Middle left',
  positionCenter: 'Center',
  positionCenterRight: 'Middle right',
  positionBottomLeft: 'Bottom left',
  positionBottomCenter: 'Bottom center',
  positionBottomRight: 'Bottom right',
  positionCustom: 'Custom',
  positionCustomHint: 'Click anywhere on a preview to place the watermark.',
  fontFamilyLabel: 'Font',
  fontInter: 'Inter',
  fontAnton: 'Anton',
  fontLora: 'Lora',
  fontMono: 'JetBrains Mono',
  fontSizeLabel: 'Font size',
  colorLabel: 'Text color',
  colorPresetLabel: 'Presets',
  opacityLabel: 'Opacity',
  verticalLabel: 'Force 9:16 vertical',
  verticalHint: 'Crops center and scales for TikTok.',
  previewLabel: 'Source video',
  previewGridLabel: 'Previews of each generated short',
  previewCapturing: 'Capturing previews…',
  progressLabel: 'Segment {current}/{total}',
  etaLabel: '≈ {remaining} left',
  etaCalculating: 'Estimating…',
  downloadAllZip: 'Download all (ZIP)',
  downloadSegment: 'Download {name}',
  segmentsReady: '{n} shorts ready',
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
  generateShorts.mockReset();
  downloadBlob.mockReset();
});

describe('ShortStudioTool', () => {
  it('renders empty state with disabled generate button', () => {
    render(<ShortStudioTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.splitButton })).toBeDisabled();
  });

  it('enables generate once a video with valid duration is loaded', async () => {
    const user = userEvent.setup();
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(30);
    expect(screen.getByRole('button', { name: messages.splitButton })).toBeEnabled();
  });

  it('calls generateShorts with the chosen options', async () => {
    const user = userEvent.setup();
    generateShorts.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB]), new Uint8Array([0xCC])]);
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(30);
    await user.clear(screen.getByLabelText(messages.partsLabel));
    await user.type(screen.getByLabelText(messages.partsLabel), '3');
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    expect(generateShorts).toHaveBeenCalledOnce();
    const opts = generateShorts.mock.calls[0]![1] as {
      mode: string; parts: number; totalDuration: number;
      textTemplate: string; vertical: boolean;
      fontFamily: string; fontColor: string;
    };
    expect(opts.mode).toBe('parts');
    expect(opts.parts).toBe(3);
    expect(opts.totalDuration).toBe(30);
    expect(opts.textTemplate).toBe('{n}/{N}');
    expect(opts.vertical).toBe(false);
    expect(opts.fontFamily).toBe('inter');
    expect(opts.fontColor).toBe('#ffffff');
    expect(await screen.findByText(/3 shorts ready/)).toBeInTheDocument();
  });

  it('toggles vertical 9:16 and forwards the flag', async () => {
    const user = userEvent.setup();
    generateShorts.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(20);
    await user.click(screen.getByLabelText(messages.verticalLabel));
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    const opts = generateShorts.mock.calls[0]![1] as { vertical: boolean };
    expect(opts.vertical).toBe(true);
  });

  it('downloads a single short with a numbered filename', async () => {
    const user = userEvent.setup();
    generateShorts.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(20);
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    await screen.findByText(/2 shorts ready/);
    const buttons = screen.getAllByRole('button', { name: /short-movie-1-of-2/ });
    await user.click(buttons[0]!);
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('short-movie-1-of-2.mp4');
  });

  it('downloads all shorts as a ZIP', async () => {
    const user = userEvent.setup();
    generateShorts.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(20);
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    await screen.findByText(/2 shorts ready/);
    await user.click(screen.getByRole('button', { name: messages.downloadAllZip }));
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
    expect(downloadBlob.mock.calls[0]![1]).toBe('short-studio-movie.zip');
  });

  it('selects a non-corner preset position (top-center)', async () => {
    const user = userEvent.setup();
    generateShorts.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(20);
    await user.click(screen.getByRole('radio', { name: messages.positionTopCenter }));
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    const opts = generateShorts.mock.calls[0]![1] as { position: string };
    expect(opts.position).toBe('topCenter');
  });

  it('forwards the chosen font and color preset to generateShorts', async () => {
    const user = userEvent.setup();
    generateShorts.mockResolvedValue([new Uint8Array([0xAA]), new Uint8Array([0xBB])]);
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(20);
    await user.click(screen.getByRole('radio', { name: messages.fontAnton }));
    await user.click(screen.getByRole('button', { name: '#ffcc00' }));
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    const opts = generateShorts.mock.calls[0]![1] as { fontFamily: string; fontColor: string };
    expect(opts.fontFamily).toBe('anton');
    expect(opts.fontColor).toBe('#ffcc00');
  });

  it('renders a thumbnail canvas per segment with a numbered aria-label', async () => {
    const user = userEvent.setup();
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4('movie.mp4'));
    setVideoDuration(30);
    await user.clear(screen.getByLabelText(messages.partsLabel));
    await user.type(screen.getByLabelText(messages.partsLabel), '4');
    const thumbs = await screen.findAllByRole('img', { name: /^Part \d$/ });
    expect(thumbs).toHaveLength(4);
    expect(thumbs.map((t) => t.getAttribute('aria-label'))).toEqual([
      'Part 1', 'Part 2', 'Part 3', 'Part 4',
    ]);
  });

  it('shows an error when generation fails', async () => {
    const user = userEvent.setup();
    generateShorts.mockRejectedValue(new Error('boom'));
    render(<ShortStudioTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp4());
    setVideoDuration(20);
    await user.click(screen.getByRole('button', { name: messages.splitButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
