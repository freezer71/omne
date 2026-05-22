import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { JsonLd } from '@/components/json-ld';
import { buildPrivacyMetadata } from '@/lib/seo/metadata';
import { privacyJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildPrivacyMetadata(locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const jsonLd = await privacyJsonLd(locale);

  const isEn = locale === 'en';

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 sm:px-6 py-12 sm:py-20"
    >
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
          {dict.privacy.sections.devTools}
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-text-primary leading-relaxed">
          <li>
            {isEn
              ? 'The “Skills browser” (under Dev tools) lets you search and discover Claude Code skills hosted on skills.sh. When you type in its search box or open a feed tab, omne forwards the request to skills.sh through a small proxy on our server, then renders the response.'
              : 'Le « navigateur de Skills » (catégorie outils dev) permet de rechercher et découvrir les skills Claude Code hébergés sur skills.sh. Lorsque vous tapez dans sa barre de recherche ou ouvrez un onglet de feed, omne relaie la requête vers skills.sh via un petit proxy sur notre serveur, puis affiche la réponse.'}
          </li>
          <li>
            {isEn
              ? 'This is the only omne tool that makes a network request while you use it. Your query (the text you type) and your IP address are seen by both omne’s server and skills.sh. No files are involved — the Skills browser does not accept any file input.'
              : 'C’est le seul outil d’omne qui fait une requête réseau pendant que vous l’utilisez. Votre requête (le texte tapé) et votre adresse IP sont vues à la fois par le serveur d’omne et par skills.sh. Aucun fichier n’est en jeu — le navigateur de Skills n’accepte aucun fichier en entrée.'}
          </li>
          <li>
            {isEn
              ? 'If you want zero contact with skills.sh, simply don’t open the Skills browser. Every conversion tool (PDF, image, video, audio, text, …) stays fully offline after the first page load.'
              : 'Si vous voulez aucun contact avec skills.sh, n’ouvrez simplement pas le navigateur de Skills. Tous les outils de conversion (PDF, image, vidéo, audio, texte, …) restent entièrement hors ligne après le premier chargement de la page.'}
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
              ? 'You can verify this: open DevTools → Network while you convert a file. No request leaves omne during conversion. (The two exceptions above — the Hugging Face model fetch and the Skills browser proxy — only fire when you explicitly open those specific tools.)'
              : 'Vous pouvez le vérifier : ouvrez DevTools → Réseau pendant la conversion d’un fichier. Aucune requête ne sort d’omne pendant la conversion. (Les deux exceptions ci-dessus — le téléchargement du modèle Hugging Face et le proxy du navigateur de Skills — ne se déclenchent que lorsque vous ouvrez explicitement ces outils précis.)'}
          </li>
        </ul>
      </section>

      <JsonLd data={jsonLd} id="omne-privacy-jsonld" />
    </main>
  );
}
