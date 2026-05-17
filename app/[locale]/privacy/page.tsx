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
              ? 'No analytics endpoint, no advertising script, no third-party CDN for code or assets.'
              : 'Aucun endpoint d’analytique, aucun script publicitaire, aucun CDN tiers pour le code ou les assets.'}
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-faint">
          {dict.privacy.sections.aiModels}
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-text-primary leading-relaxed">
          <li>
            {isEn
              ? 'The “Remove background” tool runs a neural-network model (RMBG-1.4, ~44 MB) entirely in your browser. The model is fetched once from huggingface.co the first time you open that tool, then cached locally by your browser.'
              : 'L’outil « Retirer l’arrière-plan » exécute un modèle de réseau de neurones (RMBG-1.4, ~44 Mo) entièrement dans votre navigateur. Le modèle est récupéré une seule fois depuis huggingface.co la première fois que vous ouvrez cet outil, puis mis en cache localement.'}
          </li>
          <li>
            {isEn
              ? 'Your image is never sent to Hugging Face or anywhere else — only the model weights are downloaded. Inference happens 100% locally, in WebAssembly.'
              : 'Votre image n’est jamais envoyée à Hugging Face ni ailleurs — seuls les poids du modèle sont téléchargés. L’inférence se fait 100% en local, en WebAssembly.'}
          </li>
          <li>
            {isEn
              ? 'If you want zero contact with any external host, simply don’t open the “Remove background” tool. Every other tool stays offline after the first page load.'
              : 'Si vous voulez aucun contact avec un hôte externe, n’ouvrez simplement pas l’outil « Retirer l’arrière-plan ». Tous les autres outils restent hors ligne après le premier chargement de la page.'}
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
