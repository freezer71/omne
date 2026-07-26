import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resultMessages, mediaErrorMessages } from '@/tests/helpers/tool-result-messages';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const convertVideoMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('@/lib/tools/implementations/video-convert', () => ({
  convertVideo: (...args: unknown[]) => convertVideoMock(...args),
}));
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlobMock(...args) };
});

import { VideoConvertTool } from '@/components/tools/video-convert-tool';

const messages = {
  selectButton: 'Select a video',
  empty: 'Drop a video here.',
  convertButton: 'Convert',
  format: 'Output format',
  formatMp4: 'MP4',
  formatWebm: 'WebM',
  formatMov: 'MOV',
  formatGif: 'GIF',
  outputLabel: 'Output: {filename} · {mime}',
  busy: 'Converting…',
  error: 'Conversion failed.',
  removeFile: 'Remove',
  etaLabel: '~{remaining} remaining',
  etaCalculating: 'Estimating remaining time…',
  largeFileWarning: 'Large file warning.',
};

function videoFile(name = 'clip.mp4', type = 'video/mp4'): File {
  return new File([new Uint8Array([0x00, 0x01])], name, { type });
}

beforeEach(() => {
  convertVideoMock.mockReset();
  downloadBlobMock.mockReset();
});

describe('VideoConvertTool', () => {
  it('renders empty state and disables Convert', () => {
    render(<VideoConvertTool {...messages} result={resultMessages} cancelLabel="Cancel" cancelledLabel="Cancelled. Nothing was changed." mediaError={mediaErrorMessages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeDisabled();
  });

  it('enables Convert once a video is selected', async () => {
    const user = userEvent.setup();
    render(<VideoConvertTool {...messages} result={resultMessages} cancelLabel="Cancel" cancelledLabel="Cancelled. Nothing was changed." mediaError={mediaErrorMessages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), videoFile());
    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeEnabled();
  });

  it('calls convertVideo with the selected format and presents the result', async () => {
    const user = userEvent.setup();
    convertVideoMock.mockResolvedValue(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
    render(<VideoConvertTool {...messages} result={resultMessages} cancelLabel="Cancel" cancelledLabel="Cancelled. Nothing was changed." mediaError={mediaErrorMessages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), videoFile('movie.mp4'));
    await user.selectOptions(screen.getByLabelText(messages.format), 'webm');
    await user.click(screen.getByRole('button', { name: messages.convertButton }));
    expect(convertVideoMock).toHaveBeenCalledOnce();
    expect(convertVideoMock.mock.calls[0]![1]).toBe('webm');
    expect(await screen.findByText(resultMessages.heading)).toBeInTheDocument();
    expect(downloadBlobMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: resultMessages.download }));
    expect(downloadBlobMock).toHaveBeenCalledOnce();
    expect(downloadBlobMock.mock.calls[0]![1]).toBe('converted-movie.webm');
  });

  it('drops the result when the output format changes, so the panel never lies', async () => {
    const user = userEvent.setup();
    convertVideoMock.mockResolvedValue(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
    render(<VideoConvertTool {...messages} result={resultMessages} cancelLabel="Cancel" cancelledLabel="Cancelled. Nothing was changed." mediaError={mediaErrorMessages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), videoFile('movie.mp4'));
    await user.click(screen.getByRole('button', { name: messages.convertButton }));
    expect(await screen.findByText(resultMessages.heading)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(messages.format), 'mov');
    expect(screen.queryByText(resultMessages.heading)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeEnabled();
  });

  it('shows an alert on conversion failure', async () => {
    const user = userEvent.setup();
    convertVideoMock.mockRejectedValue(new Error('boom'));
    render(<VideoConvertTool {...messages} result={resultMessages} cancelLabel="Cancel" cancelledLabel="Cancelled. Nothing was changed." mediaError={mediaErrorMessages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), videoFile());
    await user.click(screen.getByRole('button', { name: messages.convertButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });

  it('allows removing the selected file', async () => {
    const user = userEvent.setup();
    render(<VideoConvertTool {...messages} result={resultMessages} cancelLabel="Cancel" cancelledLabel="Cancelled. Nothing was changed." mediaError={mediaErrorMessages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), videoFile());
    expect(screen.getByText('clip.mp4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: messages.removeFile }));
    expect(screen.queryByText('clip.mp4')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.convertButton })).toBeDisabled();
  });
});
