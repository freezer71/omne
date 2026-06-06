type ProgressEvent = { status: string; progress?: number; file?: string };

export type RemoveBgProgress = (loaded: number) => void;

export type Tensor = {
  mul(scalar: number): Tensor;
  to(dtype: string): Tensor;
};

export type RawImageLike = {
  width: number;
  height: number;
  resize(w: number, h: number): Promise<RawImageLike>;
  toBlob(mime?: string): Promise<Blob>;
  data: Uint8Array | Uint8ClampedArray;
  channels: number;
};

export type RawImageStatic = {
  fromURL(url: string): Promise<RawImageLike>;
  fromBlob(blob: Blob): Promise<RawImageLike>;
  fromTensor(tensor: Tensor): RawImageLike;
};

export type RmbgBundle = {
  model: (inputs: { input: unknown }) => Promise<{ output: Tensor[] }>;
  processor: (image: RawImageLike) => Promise<{ pixel_values: unknown }>;
  RawImage: RawImageStatic;
};

let instance: RmbgBundle | null = null;
let loading: Promise<RmbgBundle> | null = null;

export async function getBackgroundRemover(
  onProgress?: RemoveBgProgress,
): Promise<RmbgBundle> {
  if (instance) {
    if (onProgress) onProgress(1);
    return instance;
  }
  if (loading) return loading;

  loading = (async () => {
    const mod = await import('@huggingface/transformers');
    mod.env.allowLocalModels = false;
    mod.env.useBrowserCache = true;
    // onnxruntime-web defaults to fetching its wasm runtime from
    // cdn.jsdelivr.net — blocked by our CSP and contrary to the privacy
    // promise. Point it at the postinstall-copied assets (scripts/copy-ort.mjs).
    const onnxWasm = mod.env.backends.onnx?.wasm;
    if (onnxWasm) onnxWasm.wasmPaths = '/ort/';

    const baseOpts = onProgress
      ? {
          progress_callback: (event: ProgressEvent) => {
            if (typeof event.progress === 'number') onProgress(event.progress / 100);
          },
        }
      : {};

    const [model, processor] = await Promise.all([
      mod.AutoModel.from_pretrained('briaai/RMBG-1.4', baseOpts),
      mod.AutoProcessor.from_pretrained('briaai/RMBG-1.4', baseOpts),
    ]);

    instance = {
      model: model as unknown as RmbgBundle['model'],
      processor: processor as unknown as RmbgBundle['processor'],
      RawImage: mod.RawImage as unknown as RawImageStatic,
    };
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
