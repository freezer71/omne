import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const readTags = vi.fn();
const writeTags = vi.fn();
const downloadBlob = vi.fn();

vi.mock('@/lib/tools/implementations/audio-tags', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tools/implementations/audio-tags')>(
    '@/lib/tools/implementations/audio-tags',
  );
  return {
    ...actual,
    readTags: (...args: unknown[]) => readTags(...args),
    writeTags: (...args: unknown[]) => writeTags(...args),
  };
});
vi.mock('@/lib/file-utils', async () => {
  const real = await vi.importActual<typeof import('@/lib/file-utils')>('@/lib/file-utils');
  return { ...real, downloadBlob: (...args: unknown[]) => downloadBlob(...args) };
});

import { AudioTagsTool } from '@/components/tools/audio-tags-tool';

const messages = {
  selectButton: 'Select an audio file',
  empty: 'Drop an audio file here.',
  applyButton: 'Apply tags & download',
  busy: 'Writing tags…',
  error: 'Tag write failed.',
  removeFile: 'Remove',
  titleLabel: 'Title',
  artistLabel: 'Artist',
  albumLabel: 'Album',
  albumArtistLabel: 'Album artist',
  yearLabel: 'Year',
  genreLabel: 'Genre',
  trackLabel: 'Track',
  commentLabel: 'Comment',
  coverHeading: 'Album cover',
  coverHint: 'Drop image',
  coverSelect: 'Change cover',
  coverRemove: 'Remove cover',
  coverNone: 'No cover',
  loadingTags: 'Reading tags…',
  loadTagsError: 'Could not read tags.',
};

const mp3 = (n = 'song.mp3') => new File([new Uint8Array([0])], n, { type: 'audio/mpeg' });

beforeEach(() => {
  readTags.mockReset();
  writeTags.mockReset();
  downloadBlob.mockReset();
});

describe('AudioTagsTool', () => {
  it('renders empty state with disabled Apply button', () => {
    render(<AudioTagsTool {...messages} />);
    expect(screen.getByText(messages.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.applyButton })).toBeDisabled();
  });

  it('reads tags on file select and pre-fills the form', async () => {
    const user = userEvent.setup();
    readTags.mockResolvedValue({
      tags: { title: 'Hello', artist: 'Bob', album: 'A', year: '2025', genre: 'Pop', track: '1' },
      cover: null,
      format: 'mp3',
    });
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    await waitFor(() => {
      expect((screen.getByLabelText(messages.titleLabel) as HTMLInputElement).value).toBe('Hello');
    });
    expect((screen.getByLabelText(messages.artistLabel) as HTMLInputElement).value).toBe('Bob');
    expect((screen.getByLabelText(messages.albumLabel) as HTMLInputElement).value).toBe('A');
    expect((screen.getByLabelText(messages.yearLabel) as HTMLInputElement).value).toBe('2025');
  });

  it('enables Apply once a file is loaded', async () => {
    const user = userEvent.setup();
    readTags.mockResolvedValue({ tags: {}, cover: null, format: 'mp3' });
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
  });

  it('calls writeTags with the edited values on Apply', async () => {
    const user = userEvent.setup();
    readTags.mockResolvedValue({ tags: { title: 'Old' }, cover: null, format: 'mp3' });
    writeTags.mockResolvedValue(new Uint8Array([0x1, 0x2]));
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3('clip.mp3'));
    await waitFor(() =>
      expect((screen.getByLabelText(messages.titleLabel) as HTMLInputElement).value).toBe('Old'),
    );
    await user.clear(screen.getByLabelText(messages.titleLabel));
    await user.type(screen.getByLabelText(messages.titleLabel), 'New');
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    await waitFor(() => expect(writeTags).toHaveBeenCalledOnce());
    const [, tagsArg] = writeTags.mock.calls[0]!;
    expect(tagsArg).toMatchObject({ title: 'New' });
    expect(downloadBlob).toHaveBeenCalledOnce();
    expect(downloadBlob.mock.calls[0]![1]).toBe('tagged-clip.mp3');
  });

  it('passes the cover bytes to writeTags when one was loaded from the file', async () => {
    const user = userEvent.setup();
    const coverBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    readTags.mockResolvedValue({
      tags: {},
      cover: { bytes: coverBytes, mime: 'image/jpeg' },
      format: 'mp3',
    });
    writeTags.mockResolvedValue(new Uint8Array([0]));
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    await waitFor(() => expect(writeTags).toHaveBeenCalledOnce());
    const [, , coverArg] = writeTags.mock.calls[0]!;
    expect(coverArg).toEqual({ bytes: coverBytes, mime: 'image/jpeg' });
  });

  it('removes the cover when the Remove cover button is clicked', async () => {
    const user = userEvent.setup();
    readTags.mockResolvedValue({
      tags: {},
      cover: { bytes: new Uint8Array([0]), mime: 'image/jpeg' },
      format: 'mp3',
    });
    writeTags.mockResolvedValue(new Uint8Array([0]));
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.coverRemove })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: messages.coverRemove }));
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    await waitFor(() => expect(writeTags).toHaveBeenCalledOnce());
    const [, , coverArg] = writeTags.mock.calls[0]!;
    expect(coverArg).toBeNull();
  });

  it('shows an error if writeTags fails', async () => {
    const user = userEvent.setup();
    readTags.mockResolvedValue({ tags: {}, cover: null, format: 'mp3' });
    writeTags.mockRejectedValue(new Error('boom'));
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: messages.applyButton })).toBeEnabled(),
    );
    await user.click(screen.getByRole('button', { name: messages.applyButton }));
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.error);
  });

  it('shows a load error if readTags fails', async () => {
    const user = userEvent.setup();
    readTags.mockRejectedValue(new Error('parse failed'));
    render(<AudioTagsTool {...messages} />);
    await user.upload(screen.getByLabelText(messages.selectButton), mp3());
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.loadTagsError);
  });
});
