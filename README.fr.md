<p align="center">
  <img src="./app/icon.svg" alt="omne logo" width="96" height="96" />
</p>

<h1 align="center">omne</h1>

<p align="center">
  <strong>Boîte à outils privacy-first. Tout s'exécute dans votre navigateur. Aucun fichier n'est envoyé.</strong>
</p>

<p align="center">
  <a href="./README.md">🇬🇧 Read in English</a>
</p>

---

**omne** est une collection de plus de 83 outils en ligne — PDF, vidéo, audio, image, SVG, mots de passe, JSON, texte, encodage, QR codes, couleurs, utilitaires développeur — qui tournent **entièrement côté client**. Pas de backend, pas d'analytics, pas de CDN tiers, pas de cookies. Vos fichiers ne quittent jamais l'onglet.

Bilingue **français / anglais**, mode clair / sombre, raccourci `⌘K` pour la palette de commandes.

---

## Valeurs

Ce ne sont pas des idées de fonctionnalités — ce sont des contraintes. Tout le code doit les respecter.

- 🛡️ **Privacy by design.** Les fichiers ne quittent jamais l'appareil. Le traitement se fait dans le navigateur, en WebAssembly quand nécessaire. Pas de « faites-nous confiance, on supprimera plus tard » — il n'y a aucun serveur à purger.
- 🔍 **Vérifiable, pas promis.** Ouvrez l'onglet Réseau de DevTools pendant une conversion : zéro requête sortante. Si ce n'est pas le cas, c'est un bug, pas une fonctionnalité.
- 🚫 **Aucun pistage, jamais.** Pas d'analytics, pas de télémétrie, pas de cookies, pas de CDN tiers, pas de fingerprinting. On ne sait pas qui vous êtes, et on ne veut pas le savoir.
- 🧱 **Assets lourds auto-hébergés.** ffmpeg.wasm, le worker pdf.js, le scanner QR et le modèle ONNX de détourage sont servis depuis cette origine, pour qu'aucune métadonnée ne fuite vers un CDN.
- 🆓 **Zéro friction.** Pas d'inscription, pas de compte, pas de paywall, pas de quota, pas de « formule premium ». Vous ouvrez la page, vous faites le truc, vous fermez l'onglet.
- 🌍 **Open source, à ciel ouvert.** Chaque ligne est auditable sur [github.com/freezer71/omne](https://github.com/freezer71/omne) — lien également présent dans le header et le footer du site. Si une promesse n'est pas vérifiable en lisant le code, elle ne compte pas.
- 🌗 **Accessible et bilingue.** Thèmes clair & sombre avec anti-flash, français & anglais à parité totale (vérifiée en CI), et palette `⌘K` pour les utilisateurs clavier.

---

## La promesse privacy-first

C'est la raison d'être du projet, pas un argument marketing :

- Chaque conversion s'exécute dans le navigateur via Web APIs, WebAssembly et Web Workers.
- `@ffmpeg/ffmpeg` (vidéo, audio) et `pdfjs-dist` (PDF) sont **auto-hébergés** sous `/public/ffmpeg/` et `/public/pdfjs/` — l'onglet Réseau de DevTools doit afficher **zéro** trafic sortant pendant un traitement.
- L'app sert `Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: require-corp` pour activer `SharedArrayBuffer` (requis par le build ffmpeg multi-thread). Comme tous les assets sont same-origin, ces en-têtes renforcent la page sans rien casser.
- Aucun service externe : pas de Sentry, pas de Google Analytics, pas de pixel, pas de CDN d'assets.

Toute contribution qui casserait cette promesse (traitement serveur, télémétrie, ressource distante) sort du périmètre.

---

## Démarrage rapide

Prérequis : Node.js 20+.

```bash
npm install   # déclenche le postinstall qui copie ffmpeg + pdf.js + qr-scanner dans /public
npm run dev   # http://localhost:3000
```

> ⚠️ `npm run dev` utilise volontairement **Webpack** (`next dev --webpack`). Turbopack plante sur le HMR avec les routes dynamiques `[locale]`. `npm run dev:turbo` existe uniquement pour des vérifications ponctuelles.

Après un clone propre, si les fonctionnalités ffmpeg/pdf.js échouent, relancez :

```bash
node scripts/copy-ffmpeg.mjs && node scripts/copy-pdfjs.mjs && node scripts/copy-qr-scanner.mjs
```

---

## Catalogue d'outils

| Catégorie | Outils |
|-----------|--------|
| **PDF** | Fusionner · Diviser · Pivoter · Redimensionner · Filigrane · PDF → images · Extraire les images · Images → PDF |
| **Vidéo** | Convertir (MP4 / WebM / GIF) · Découper · Diviser · Fusionner · Compresser · Redimensionner · Couper le son · Recadrer · Pivoter / miroir · Extraire frames · Filigrane · Vitesse · Short Studio (découpe + filigrane numéroté, option 9:16) |
| **Audio** | Convertir · Extraire (depuis vidéo) · Découper · Fusionner · Volume / normaliser / fondus · Tags ID3 |
| **Image** | Convertir · Compresser · Redimensionner · Recadrer · Pivoter / miroir · Détourer (IA locale, *beta*) · Coller depuis le presse-papier |
| **SVG** | Aperçu · Éditeur · Optimiser (SVGO) · → PNG / JPG / WebP · → Data URL · Générateur de favicon |
| **Mot de passe** | Générer · Phrase de passe (Diceware) · Hash (SHA) · bcrypt · Vérificateur de force |
| **JSON** | Formater · Arborescence · JSONPath · Tableau · CSV ↔ JSON · Diff · Schéma (AJV) |
| **Texte** | Casse · Compteur · Lorem Ipsum · Diff · Testeur regex · Slugify · Trier les lignes · Échapper/Désechapper · Nettoyeur d'espaces · Aperçu Markdown · Rechercher & Remplacer |
| **Lecture & accessibilité** | Lecture facilitée (gras de début / « bionic ») · Mise en forme dyslexie (OpenDyslexic + espacement + filtre de couleur → HTML/PDF, ré-agence le texte y compris les PDF) · PDF en police dyslexie (garde images & mise en page, remplace la police sur place) · Lecture à voix haute (synthèse vocale locale) · Lecteur immersif (règle de focus phrase par phrase) |
| **Encodage** | Base64 · URL · JWT · Hex · Entités HTML · Binaire · Code Morse |
| **QR** | Générer (WiFi, vCard…) · Scanner (caméra ou image) · Générer code-barres (Code 128 / EAN) · Scanner code-barres |
| **Couleur** | Convertisseur (hex / rgb / hsl / oklch) · Contraste WCAG · Palette depuis image · Générateur de dégradé · Teintes & nuances · Mélangeur · Simulateur de daltonisme |
| **Développeur** | Constructeur d'installateur de skills (parse `npx skills add`) · Explorer et installer des skills (recherche dans le catalogue skills.sh, découverte du top par Depuis toujours / Tendance 24 h / En vogue, installation multiple en un one-liner) |

Source de vérité : [`lib/tools/registry.ts`](./lib/tools/registry.ts). Le sitemap, les cartes de la page d'accueil et le routage MIME en sont dérivés.

---

## Stack technique

- **[Next.js 16](https://nextjs.org)** (App Router) + **React 19**
- **TypeScript** strict
- **Tailwind v4** — configuration CSS-first (pas de `tailwind.config.js`), tokens dans `@theme inline` de `app/globals.css`
- **[@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm)** pour la vidéo et l'audio — **build multi-thread (`@ffmpeg/core-mt`)** pour paralléliser sur tous les cœurs CPU
- **[pdf-lib](https://pdf-lib.js.org/)** + **[@pdf-lib/fontkit](https://github.com/Hopding/fontkit)** + **[pdfjs-dist](https://mozilla.github.io/pdf.js/)** pour les PDF (fontkit intègre la police auto-hébergée **[OpenDyslexic](https://opendyslexic.org/)** dans les PDF de lecture générés)
- **[@huggingface/transformers](https://huggingface.co/docs/transformers.js)** pour le détourage d'image (modèle ONNX local)
- **[SVGO](https://github.com/svg/svgo)** pour l'optimisation SVG
- **[AJV](https://ajv.js.org/)** pour la validation de schémas JSON
- **i18n maison** — pas de runtime, dictionnaires statiques `messages/{en,fr}.json`
- **Vitest** (unit + components + setup) + **Playwright** (e2e chromium + webkit)

---

## Architecture

### Routing (spécificités Next 16)

- **`proxy.ts`** à la racine remplace l'ancien `middleware.ts`. Il détecte `Accept-Language` et redirige les chemins nus vers `/[locale]/...`.
- Toutes les routes vivent sous `app/[locale]/...`. Il n'y a **pas** de `app/layout.tsx` — le seul layout racine est `app/[locale]/layout.tsx`.
- `params` est une **Promesse** dans chaque page, layout et `generateMetadata` : `const { locale } = await params;` est obligatoire.
- Les pages de catégorie localisées vivent à `app/[locale]/[category]/page.tsx` (`/en/pdf`, `/fr/image`, …). Elles sont pré-rendues pour chaque catégorie peuplée, avec leur propre metadata, image OpenGraph, fil d'Ariane et JSON-LD `CollectionPage`.
- Une page 404 localisée à `app/[locale]/not-found.tsx` rattrape les chemins non reconnus sous `/[locale]/...`, détecte la langue via `Accept-Language` et suggère des outils populaires. Le manifest PWA (`app/manifest.ts`) et le viewport `theme-color` sont émis automatiquement.

### Anatomie d'un outil

Chaque outil suit le même squelette en 5 fichiers + une entrée de registre :

1. **Logique pure** — `lib/tools/implementations/<id>.ts` (testable en Node, sans React)
2. **Composant client** — `components/tools/<id>-tool.tsx` (`'use client'`)
3. **Page** — `app/[locale]/<catégorie>/<id>/page.tsx` (Server Component)
4. **OpenGraph image** — `app/[locale]/<catégorie>/<id>/opengraph-image.tsx`
5. **Entrée registre** — `lib/tools/registry.ts`
6. **Traductions** — clés `tools.<catégorie>.<id>` dans **les deux** `messages/{en,fr}.json` (bloc `seo` inclus, parité testée en CI). Un bloc `content` optionnel (`howItWorks` + `features`, tableaux) fournit du texte spécifique à l'outil pour le footer SEO. Une nouvelle catégorie nécessite aussi un bloc `categories.<catégorie>` (`name`, `intro`, `seo`) pour sa landing page.

**Aperçu temps réel obligatoire** : tout outil doit afficher un résultat live qui reflète les paramètres courants — un debounce de ~150-250 ms sur l'effet, pas de bouton "Apply" avant l'aperçu. Pour les pipelines lourds (ffmpeg, pdf.js, remove-bg), rendre un proxy léger (résolution réduite, première page/frame).

Détails complets dans [`CLAUDE.md`](./CLAUDE.md).

---

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de dev sur `:3000` (Webpack — voir avertissement plus haut) |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (unit + components + setup) en un coup |
| `npm run test:watch` | Vitest en watch |
| `npm run test:ui` | UI Vitest |
| `npm run test:e2e` | Playwright (chromium + webkit) |
| `npm run test:all` | Vitest puis Playwright |
| `npm run favicons` | Régénère `app/favicon.ico` (16/32/48) + `app/apple-icon.png` (180×180) depuis `app/icon.svg` |

Lancer un seul test :

```bash
npx vitest run path/to/file.test.ts -t "nom du test"
npx playwright test tests/e2e/<nom>.spec.ts --project=chromium
```

---

## Structure du dépôt

```
omne/
├── app/
│   ├── [locale]/         # Pages (Server Components) par catégorie/outil + not-found.tsx
│   └── manifest.ts       # Manifest PWA (icônes, thème, start_url)
├── components/tools/     # Composants client de chaque outil
├── lib/
│   ├── tools/
│   │   ├── implementations/  # Logique pure (testable hors DOM)
│   │   ├── registry.ts       # Source de vérité du catalogue
│   │   └── mime-router.ts    # Routage par type MIME au drop
│   ├── seo/                  # metadata, JSON-LD (WebApplication, CollectionPage, BreadcrumbList)
│   └── og/                   # Template + builder d'image OG (hub / privacy / tool / category)
│   ├── i18n/             # Dictionnaires côté serveur (server-only)
│   ├── ffmpeg-loader.ts  # Singleton ffmpeg.wasm
│   └── file-utils.ts     # downloadBlob, outputName, etc.
├── messages/{en,fr}.json # Traductions (parité vérifiée en CI)
├── public/
│   ├── ffmpeg/           # ffmpeg-core.js + .wasm (copiés au postinstall, gitignored)
│   ├── pdfjs/            # pdf.worker.min.mjs (idem)
│   └── theme-init.js     # Script statique pour éviter le flash de thème
├── proxy.ts              # Redirection /[locale] (remplace middleware.ts)
├── scripts/              # copy-ffmpeg, copy-pdfjs, copy-qr-scanner
└── tests/
    ├── unit/             # Vitest Node
    ├── components/       # Vitest jsdom + RTL
    ├── setup/            # Tests transverses (parité i18n…)
    └── e2e/              # Playwright
```

---

## Contribuer un nouvel outil

1. Implémenter la logique pure dans `lib/tools/implementations/<id>.ts` avec un test unitaire.
2. Créer le composant client dans `components/tools/<id>-tool.tsx` avec un aperçu temps réel.
3. Câbler la page sous `app/[locale]/<catégorie>/<id>/page.tsx` + l'`opengraph-image.tsx`.
4. Ajouter l'entrée dans `lib/tools/registry.ts`.
5. Ajouter les clés `tools.<catégorie>.<id>` (avec le bloc `seo`) dans `messages/en.json` **et** `messages/fr.json`.
6. Vérifier : `npm test` (parité i18n + unit + components) puis `npm run test:e2e`.

Le sitemap, le routage par MIME et la palette `⌘K` se mettent à jour automatiquement.

---

## Licence

Code source ouvert, contribué à ciel ouvert.
