type ProgressEvent = { status: string; progress?: number; file?: string };

export type RemoveBgProgress = (loaded: number) => void;

type Segmenter = (input: string | Blob | ArrayBuffer) => Promise<Array<{ mask: { data: Uint8Array; width: number; height: number } }>>;

let instance: Segmenter | null = null;
let loading: Promise<Segmenter> | null = null;

export async function getBackgroundRemover(
  onProgress?: RemoveBgProgress,
): Promise<Segmenter> {
  if (instance) {
    if (onProgress) onProgress(1);
    return instance;
  }
  if (loading) return loading;

  loading = (async () => {
    const mod = await import('@huggingface/transformers');
    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;

    const pipe = await mod.pipeline('image-segmentation', 'briaai/RMBG-1.4', {
      ...(onProgress
        ? {
            progress_callback: (event: ProgressEvent) => {
              if (typeof event.progress === 'number') onProgress(event.progress / 100);
            },
          }
        : {}),
    });
    instance = pipe as unknown as Segmenter;
    return instance;
  })();
  return loading;
}

export function isBackgroundRemoverLoaded(): boolean {
  return instance !== null;
}

export function _resetBackgroundRemover(): void {
  instance = null;
  loading = null;
}
