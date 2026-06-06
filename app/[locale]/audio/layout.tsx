import { EnsureCrossOriginIsolated } from '@/components/ensure-cross-origin-isolated';

// Every /audio/* route is COOP/COEP-isolated (FFMPEG_ROUTES in next.config.ts).
// The guard reloads once after a client-side navigation so the document
// actually picks the isolation headers up — ffmpeg-mt needs SharedArrayBuffer.
export default function AudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EnsureCrossOriginIsolated />
      {children}
    </>
  );
}
