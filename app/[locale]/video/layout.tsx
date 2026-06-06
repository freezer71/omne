import { EnsureCrossOriginIsolated } from '@/components/ensure-cross-origin-isolated';

// Every /video/* route is COOP/COEP-isolated (FFMPEG_ROUTES in next.config.ts).
// The guard reloads once after a client-side navigation so the document
// actually picks the isolation headers up — ffmpeg-mt needs SharedArrayBuffer.
export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EnsureCrossOriginIsolated />
      {children}
    </>
  );
}
