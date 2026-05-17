import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const isEn = locale === 'en';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 sm:px-6 py-12 sm:py-20">
      <nav className="text-sm">
        <Link href={`/${locale}`} className="text-text-muted hover:text-text-primary transition-colors">
          ← {dict.common.backHome}
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-medium tracking-tight text-text-primary">{dict.privacy.title}</h1>
        <p className="text-lg text-text-muted leading-relaxed">{dict.privacy.leadParagraph}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-faint">
          {dict.privacy.sections.whatWeLoad}
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-text-primary leading-relaxed">
          <li>
            {isEn
              ? 'Your browser downloads only what omne itself serves: HTML, CSS, JS, fonts (self-hosted via next/font), and the FFmpeg WebAssembly engine (self-hosted in /ffmpeg/) when you open a video tool.'
              : 'Votre navigateur télécharge uniquement ce qu’omne sert lui-même : HTML, CSS, JS, polices (self-hostées via next/font) et le moteur WebAssembly de FFmpeg (self-hosté dans /ffmpeg/) lorsque vous ouvrez un outil vidéo.'}
          </li>
          <li>
            {isEn
              ? 'No third-party CDN, no analytics endpoint, no advertising script.'
              : 'Aucun CDN tiers, aucun endpoint d’analytique, aucun script publicitaire.'}
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-faint">
          {dict.privacy.sections.whatWeDoNot}
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-text-primary leading-relaxed">
          <li>
            {isEn
              ? 'We never upload your files. Every PDF or video you drop stays in memory on your device.'
              : 'Nous n’envoyons jamais vos fichiers. Chaque PDF ou vidéo déposé reste en mémoire, sur votre appareil.'}
          </li>
          <li>
            {isEn
              ? 'We set no cookies. We track no sessions. We never fingerprint your browser.'
              : 'Nous ne posons aucun cookie. Nous ne traçons aucune session. Nous ne fingerprint jamais votre navigateur.'}
          </li>
          <li>
            {isEn
              ? 'You can verify this: open DevTools → Network while you use any tool. No request leaves omne while processing.'
              : 'Vous pouvez le vérifier : ouvrez DevTools → Réseau pendant que vous utilisez un outil. Aucune requête ne sort d’omne pendant le traitement.'}
          </li>
        </ul>
      </section>
    </main>
  );
}
