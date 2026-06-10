import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const composeImageMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/banner-maker', async () => {
  const real = await vi.importActual<typeof import('@/lib/tools/implementations/banner-maker')>(
    '@/lib/tools/implementations/banner-maker',
  );
  return { ...real, composeImage: (...args: unknown[]) => composeImageMock(...args) };
});
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { BannerMakerTool } from '@/components/tools/banner-maker-tool';
import type { CompositionSpec } from '@/lib/tools/implementations/banner-maker';

const messages = {
  presetLabel: 'Size preset',
  presetSquare: 'Square',
  presetLandscape: 'Landscape 16:9',
  presetStory: 'Story 9:16',
  presetHd: 'HD 720p',
  presetOg: 'OG image',
  presetXBanner: 'X banner',
  presetCustom: 'Custom…',
  widthLabel: 'Width (px)',
  heightLabel: 'Height (px)',
  lockAspect: 'Lock aspect ratio',
  backgroundLabel: 'Background color',
  addText: 'Add text',
  addImage: 'Add image',
  selectImage: 'Select an image',
  layersTitle: 'Layers',
  noLayers: 'No layers yet.',
  textLayerDefault: 'Your text',
  textLabel: 'Text',
  fontFamilyLabel: 'Font',
  fontSans: 'Sans-serif',
  fontSerif: 'Serif',
  fontMono: 'Monospace',
  fontSizeLabel: 'Font size',
  fontColorLabel: 'Text color',
  boldLabel: 'Bold',
  imageScaleLabel: 'Image scale',
  moveUp: 'Move up',
  moveDown: 'Move down',
  removeLayer: 'Remove layer',
  dragHint: 'Drag elements on the preview.',
  formatLabel: 'Format',
  downloadButton: 'Download',
  busy: 'Rendering…',
  error: 'Could not create that image.',
  previewLabel: 'Preview',
};

function pngFile(name = 'overlay.png'): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47]) as BlobPart], name, {
    type: 'image/png',
  });
}

beforeEach(() => {
  composeImageMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('BannerMakerTool', () => {
  it('renders the preview canvas and an enabled download button', () => {
    render(<BannerMakerTool {...messages} />);
    expect(screen.getByLabelText(messages.previewLabel)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.downloadButton })).toBeEnabled();
    expect(screen.getByText(messages.noLayers)).toBeInTheDocument();
  });

  it('adds a text layer and edits its content', async () => {
    const user = userEvent.setup();
    render(<BannerMakerTool {...messages} />);
    await user.click(screen.getByRole('button', { name: messages.addText }));
    expect(screen.getByText(messages.textLayerDefault)).toBeInTheDocument();

    const textInput = screen.getByLabelText(messages.textLabel) as HTMLInputElement;
    expect(textInput.value).toBe(messages.textLayerDefault);
    fireEvent.change(textInput, { target: { value: 'Big sale' } });
    expect(screen.getByText('Big sale')).toBeInTheDocument();
  });

  it('applies preset dimensions', async () => {
    const user = userEvent.setup();
    render(<BannerMakerTool {...messages} />);
    const preset = screen.getByLabelText(messages.presetLabel) as HTMLSelectElement;
    await user.selectOptions(preset, 'landscape');
    expect((screen.getByLabelText(messages.widthLabel) as HTMLInputElement).value).toBe('1920');
    expect((screen.getByLabelText(messages.heightLabel) as HTMLInputElement).value).toBe('1080');
  });

  it('keeps the aspect ratio locked on custom edits', async () => {
    const user = userEvent.setup();
    render(<BannerMakerTool {...messages} />);
    await user.selectOptions(screen.getByLabelText(messages.presetLabel), 'landscape');
    const w = screen.getByLabelText(messages.widthLabel) as HTMLInputElement;
    fireEvent.change(w, { target: { value: '960' } });
    expect((screen.getByLabelText(messages.heightLabel) as HTMLInputElement).value).toBe('540');
    expect((screen.getByLabelText(messages.presetLabel) as HTMLSelectElement).value).toBe('custom');
  });

  it('changes dimensions independently when the lock is off', async () => {
    const user = userEvent.setup();
    render(<BannerMakerTool {...messages} />);
    await user.click(screen.getByLabelText(messages.lockAspect));
    fireEvent.change(screen.getByLabelText(messages.widthLabel), { target: { value: '800' } });
    expect((screen.getByLabelText(messages.heightLabel) as HTMLInputElement).value).toBe('1080');
  });

  it('adds an image layer from the hidden file input', async () => {
    const user = userEvent.setup();
    render(<BannerMakerTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectImage), pngFile('logo.png'));
    expect(await screen.findByText('logo.png')).toBeInTheDocument();
    expect(screen.getByLabelText(/Image scale/)).toBeInTheDocument();
  });

  it('removes a layer', async () => {
    const user = userEvent.setup();
    render(<BannerMakerTool {...messages} />);
    await user.click(screen.getByRole('button', { name: messages.addText }));
    await user.click(screen.getByRole('button', { name: messages.removeLayer }));
    expect(screen.getByText(messages.noLayers)).toBeInTheDocument();
  });

  it('downloads the composition with the current spec', async () => {
    const user = userEvent.setup();
    composeImageMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    render(<BannerMakerTool {...messages} />);
    await user.click(screen.getByRole('button', { name: messages.addText }));
    await user.click(screen.getByRole('button', { name: messages.downloadButton }));
    expect(composeImageMock).toHaveBeenCalledOnce();
    const spec = composeImageMock.mock.calls[0]![0] as CompositionSpec;
    expect(spec.width).toBe(1080);
    expect(spec.height).toBe(1080);
    expect(spec.background).toBe('#0f172a');
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]).toMatchObject({ kind: 'text', text: messages.textLayerDefault });
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('banner-1080x1080.png');
  });

  it('shows an error when rendering fails', async () => {
    const user = userEvent.setup();
    composeImageMock.mockRejectedValue(new Error('boom'));
    render(<BannerMakerTool {...messages} />);
    await user.click(screen.getByRole('button', { name: messages.downloadButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });
});
