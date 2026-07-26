import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resultMessages } from '@/tests/helpers/tool-result-messages';
import type { ClipMetadata } from '@/lib/hooks/use-clip-metadata';

const mergeVideos = vi.fn();
const clipMetadata = vi.fn();

vi.mock('@/lib/tools/implementations/video-merge', () => ({
  mergeVideos: (...args: unknown[]) => mergeVideos(...args),
}));
// Probing decodes real media, which jsdom cannot do; the hook has its own
// contract and this test is about what the list does with the measurements.
vi.mock('@/lib/hooks/use-clip-metadata', () => ({
  useClipMetadata: (files: File[]) => clipMetadata(files),
}));

import { VideoMergeTool } from '@/components/tools/video-merge-tool';

const messages = {
  selectButton: 'Add videos',
  empty: 'Drop videos here.',
  mergeButton: 'Merge',
  busy: 'Merging…',
  error: 'Could not merge those videos.',
  removeFile: 'Remove',
  filesTemplate: '{n} videos',
  moveUp: 'Move up',
  moveDown: 'Move down',
  needsTwo: 'Add one more.',
  etaLabel: 'About {remaining} left',
  etaCalculating: 'Estimating…',
  totalDurationLabel: 'Total: {duration}',
  mixedSizesWarning: 'These clips are not all the same size.',
  cancelLabel: 'Cancel',
  cancelledLabel: 'Cancelled. Nothing was changed.',
};

const mp4 = (n: string) => new File([new Uint8Array([0])], n, { type: 'video/mp4' });

const landscape = (durationSec: number): ClipMetadata => ({
  durationSec,
  width: 1920,
  height: 1080,
  poster: 'data:image/jpeg;base64,AAAA',
});

async function withClips(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  render(<VideoMergeTool {...messages} result={resultMessages} />);
  await user.upload(screen.getByLabelText(messages.selectButton), names.map(mp4));
}

beforeEach(() => {
  mergeVideos.mockReset();
  clipMetadata.mockReset();
  clipMetadata.mockImplementation((files: File[]) => files.map(() => landscape(30)));
});

describe('VideoMergeTool — knowing what you are merging', () => {
  it('shows a thumbnail, duration and dimensions for each clip', async () => {
    const user = userEvent.setup();
    await withClips(user, ['a.mp4', 'b.mp4']);

    const thumbs = document.querySelectorAll('img[src^="data:image/jpeg"]');
    expect(thumbs).toHaveLength(2);
    expect(screen.getAllByText(/0:30/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1920×1080/).length).toBe(2);
  });

  it('adds up the total running time', async () => {
    const user = userEvent.setup();
    clipMetadata.mockImplementation(() => [landscape(90), landscape(45)]);
    await withClips(user, ['a.mp4', 'b.mp4']);
    expect(screen.getByText('Total: 2:15')).toBeInTheDocument();
  });

  it('withholds the total until every clip has been measured', async () => {
    const user = userEvent.setup();
    clipMetadata.mockImplementation(() => [landscape(90), null]);
    await withClips(user, ['a.mp4', 'b.mp4']);
    expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
  });

  it('warns before the encode when the clips are not the same size', async () => {
    const user = userEvent.setup();
    clipMetadata.mockImplementation(() => [
      landscape(10),
      { durationSec: 10, width: 1080, height: 1920 },
    ]);
    await withClips(user, ['wide.mp4', 'tall.mp4']);
    expect(screen.getByText(messages.mixedSizesWarning)).toBeInTheDocument();
  });

  it('stays quiet when every clip matches', async () => {
    const user = userEvent.setup();
    await withClips(user, ['a.mp4', 'b.mp4']);
    expect(screen.queryByText(messages.mixedSizesWarning)).not.toBeInTheDocument();
  });

  it('still lists a clip whose metadata could not be read', async () => {
    const user = userEvent.setup();
    clipMetadata.mockImplementation(() => [landscape(10), null]);
    await withClips(user, ['ok.mp4', 'broken.mp4']);
    expect(screen.getByText('broken.mp4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.mergeButton })).toBeEnabled();
  });

  it('keeps the measurements lined up with the rows after a reorder', async () => {
    const user = userEvent.setup();
    // The hook is keyed by file, so the durations must follow the files.
    clipMetadata.mockImplementation((files: File[]) =>
      files.map((f) => landscape(f.name === 'a.mp4' ? 60 : 10)),
    );
    await withClips(user, ['a.mp4', 'b.mp4']);

    await user.click(screen.getAllByRole('button', { name: messages.moveDown })[0]!);

    const rows = screen.getAllByText(/\.mp4$/).map((el) => el.textContent);
    expect(rows).toEqual(['b.mp4', 'a.mp4']);
    expect(screen.getByText('Total: 1:10')).toBeInTheDocument();
  });
});
