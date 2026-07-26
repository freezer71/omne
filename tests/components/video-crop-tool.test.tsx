import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resultMessages } from '@/tests/helpers/tool-result-messages';

const cropVideo = vi.fn();

vi.mock('@/lib/tools/implementations/video-crop', () => ({
  cropVideo: (...args: unknown[]) => cropVideo(...args),
}));

import { VideoCropTool } from '@/components/tools/video-crop-tool';

const messages = {
  selectButton: 'Choose a video',
  empty: 'Drop a video here.',
  cropButton: 'Crop',
  xLabel: 'X',
  yLabel: 'Y',
  widthLabel: 'Width',
  heightLabel: 'Height',
  busy: 'Cropping…',
  error: 'Could not crop that video.',
  removeFile: 'Remove',
  etaLabel: 'About {remaining} left',
  etaCalculating: 'Estimating…',
  largeFileWarning: 'Large file warning.',
  moveCropLabel: 'Drag to move the crop area',
  cancelLabel: 'Cancel',
  cancelledLabel: 'Cancelled. Nothing was changed.',
};

const mp4 = () => new File([new Uint8Array([0])], 'clip.mp4', { type: 'video/mp4' });

function setVideoSize(width: number, height: number) {
  const video = document.querySelector('video');
  if (!video) throw new Error('No <video> element in the DOM');
  Object.defineProperty(video, 'videoWidth', { value: width, configurable: true });
  Object.defineProperty(video, 'videoHeight', { value: height, configurable: true });
  fireEvent.loadedMetadata(video);
}

// The numeric fields are controlled and clamp to a minimum of 1, so
// `user.clear()` leaves a "1" behind and typing appends to it. Setting the value
// outright is the only way to land on the number the test means.
function setField(label: string, value: number) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } });
}

async function loaded(user: ReturnType<typeof userEvent.setup>, w = 1920, h = 1080) {
  render(<VideoCropTool {...messages} result={resultMessages} />);
  await user.upload(screen.getByLabelText(messages.selectButton), mp4());
  setVideoSize(w, h);
}

beforeEach(() => {
  cropVideo.mockReset();
  // jsdom has no pointer capture; the component only needs the calls to exist.
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => true;
});

describe('VideoCropTool — the rectangle on screen is the rectangle being cropped', () => {
  it('gives the preview frame the clip’s own aspect ratio', async () => {
    const user = userEvent.setup();
    await loaded(user, 1920, 1080);

    const frame = document.querySelector('video')!.parentElement as HTMLElement;
    // Without this the video is letterboxed inside a wider box and the overlay,
    // positioned in % of that box, points at the wrong pixels.
    expect(frame.style.aspectRatio).toBe('1920 / 1080');
    expect(frame.style.maxWidth).toBe('32rem');
  });

  it('follows a portrait clip rather than assuming landscape', async () => {
    const user = userEvent.setup();
    await loaded(user, 1080, 1920);
    const frame = document.querySelector('video')!.parentElement as HTMLElement;
    expect(frame.style.aspectRatio).toBe('1080 / 1920');
  });

  it('places the overlay as a percentage of the clip', async () => {
    const user = userEvent.setup();
    await loaded(user, 1000, 500);
    setField(messages.xLabel, 250);

    const overlay = screen.getByRole('button', { name: messages.moveCropLabel });
    expect(overlay.style.left).toBe('25%');
    expect(overlay.style.top).toBe('0%');
  });

  it('moves the crop when the rectangle is dragged', async () => {
    const user = userEvent.setup();
    await loaded(user, 1920, 1080);
    // Start from a rectangle smaller than the frame so there is room to move.
    setField(messages.widthLabel, 100);
    setField(messages.heightLabel, 100);

    const overlay = screen.getByRole('button', { name: messages.moveCropLabel });
    fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 40, clientY: 25 });
    fireEvent.pointerUp(overlay, { pointerId: 1 });

    // jsdom reports a zero-width frame, so the scale factor is 1:1 here.
    expect(screen.getByLabelText(messages.xLabel)).toHaveValue(40);
    expect(screen.getByLabelText(messages.yLabel)).toHaveValue(25);
  });

  it('keeps the dragged rectangle inside the clip', async () => {
    const user = userEvent.setup();
    await loaded(user, 200, 100);
    setField(messages.widthLabel, 50);
    setField(messages.heightLabel, 50);

    const overlay = screen.getByRole('button', { name: messages.moveCropLabel });
    fireEvent.pointerDown(overlay, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(overlay, { pointerId: 1, clientX: 9999, clientY: 9999 });
    fireEvent.pointerUp(overlay, { pointerId: 1 });

    expect(screen.getByLabelText(messages.xLabel)).toHaveValue(150); // 200 − 50
    expect(screen.getByLabelText(messages.yLabel)).toHaveValue(50); // 100 − 50
  });

  it('leaves the numeric fields as the precise and keyboard path', async () => {
    const user = userEvent.setup();
    await loaded(user);
    for (const label of [messages.xLabel, messages.yLabel, messages.widthLabel, messages.heightLabel]) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
  });
});
