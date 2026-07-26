---
target: catalogue outils omne (components/tools)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-07-25T18-17-49Z
slug: components-tools
---
⚠️ DEGRADED: single-context (les instructions de session interdisent l'usage du sous-agent sans demande explicite de l'utilisateur)

Mode : **Operate** (l'utilisateur vient accomplir une tâche, pas admirer une page).

## Design Health Score

| # | Heuristique | Score | Problème clé |
|---|-------------|-------|--------------|
| 1 | Visibilité de l'état système | 2 | Progression % + ETA excellents sur ffmpeg, mais **aucun état de résultat** : le fichier se télécharge tout seul, sans confirmation ni comparaison avant/après |
| 2 | Adéquation système / monde réel | 3 | Langue claire, bon français. Mais « Haute / Moyenne / Basse » sans aucun repère chiffré (bitrate, poids estimé) |
| 3 | Contrôle et liberté | 1 | **Zéro annulation** sur les 20 outils ffmpeg. Aucun `beforeunload`. Un encodage de 10 min est irréversible sauf fermeture d'onglet |
| 4 | Cohérence et standards | 2 | La zone de dépôt est réimplémentée ~40 fois avec des comportements divergents ; PDF a des miniatures, video/merge et audio/merge n'ont rien |
| 5 | Prévention des erreurs | 2 | Aucun garde-fou avant un encodage long ; pas d'avertissement de compatibilité codec |
| 6 | Reconnaissance plutôt que rappel | 2 | video/merge et audio/merge : que des noms de fichiers, pas de miniature, pas de durée, pas de durée totale |
| 7 | Flexibilité et efficacité | 3 | Palette ⌘K, outils récents, sélection Shift dans la grille PDF, drag-drop partout — vraiment bon |
| 8 | Esthétique et minimalisme | 3 | Sobre et soigné, mais l'outil est écrasé par le contenu SEO et le CTA principal flotte, orphelin |
| 9 | Récupération d'erreur | 1 | **81 outils sur 90 n'ont qu'un seul libellé d'erreur générique.** « Impossible de compresser cette vidéo. » — pas de cause, pas d'issue |
| 10 | Aide et documentation | 3 | Fonctionnalités / Comment ça marche / FAQ par outil : solide. Mais sous la ligne de flottaison et parfois **factuellement faux** |
| **Total** | | **22/40** | **Acceptable — améliorations significatives nécessaires** |

## Design Specificity Verdict

**Évaluation LLM** — Le système visuel est authentiquement le vôtre : palette sombre neutre, typographie sobre, chiffres tabulaires en mono, absence totale de dégradé décoratif ou d'illustration générique. La promesse « 0 envois, jamais » est portée par le design, pas seulement par la copy. Ce n'est pas un template.

Mais la **composition** est interchangeable : chaque page d'outil est un empilement identique « fil d'Ariane → titre → carte pointillée → bouton flottant à droite → 4 blocs SEO ». Pour un site dont l'argument est *« votre navigateur, c'est la boîte à outils »*, l'outil occupe ~15 % du viewport pendant que le contenu SEO occupe le reste. La hiérarchie est inversée par rapport à la promesse.

**Scan déterministe** — `detect.mjs` sur `components/tools`, `components/ui`, `components/tool-shell.tsx` : 2 findings, tous deux faux positifs (`broken-image` sur `<img>` à `src` dynamique dans `image-resize-tool.tsx:71` et `svg-to-data-url-tool.tsx:92`). Le détecteur mécanique ne voit rien — les problèmes réels sont comportementaux, pas structurels.

**Preuve navigateur** — Injection de script confirmée sur `localhost:3000`, focus programmé sur `input[type=radio]` puis lecture du style calculé. Voir P1-3 ci-dessous : preuve chiffrée du défaut de focus visible.

## Overall Impression

Le socle est meilleur que la moyenne du genre : la famille PDF (`PdfPagesGrid` + `PdfThumbnail`) est une vraie référence — miniatures cliquables, sélection Shift, rotation prévisualisée par page, presets appliqués en direct. Les outils texte sont irréprochables sur le fond : debounce 200 ms, sortie live, compteur, exemple, copier, télécharger.

La fracture est nette et se situe exactement là où votre USP est la plus forte : **les fichiers lourds**. Vidéo et audio n'ont pas d'aperçu du *résultat*, pas d'estimation, pas d'annulation, pas d'état final. Ce sont précisément les outils où l'utilisateur investit le plus (3 à 10 minutes d'encodage) et où il a le moins de visibilité.

La plus grosse opportunité, en une phrase : **arrêter de télécharger le fichier automatiquement, et le montrer d'abord.**

## What's Working

1. **La famille PDF est un modèle.** `PdfPagesGrid` avec `pageTransform` + `renderPageOverlay` permet à pdf/rotate de faire tourner chaque miniature en CSS avant tout traitement pdf-lib. La sélection Shift avec ancre dans pdf/split est un détail de power-user rare dans cette catégorie.

2. **Progression + ETA sur ffmpeg.** `formatRemaining()` avec extrapolation depuis le ratio de progression, mise à jour à 250 ms, `aria-live="polite"`. La plupart des concurrents affichent un spinner infini.

3. **Aperçus dérivés intelligents.** video/rotate applique la transform CSS sur le `<video>` source ; video/watermark superpose un div positionné ; audio/volume applique réellement le gain à `HTMLAudioElement.volume`. Trois manières différentes et justes de prévisualiser sans lancer le pipeline.

## Priority Issues

### [P0] La copy promet des fonctionnalités qui n'existent pas

`messages/fr.json` → `tools.video.compress.content` annonce :
> « Estimation de la taille du fichier en temps réel avant la compression »
> « Téléchargez la vidéo compressée avec l'estimation de la réduction affichée. »

`components/tools/video-compress-tool.tsx` ne contient **aucun calcul de taille**. Le mot « estimation » n'apparaît pas dans le fichier. Idem `tools.pdf.merge` : « Réordonnement par **glisser-déposer** avec aperçu miniature » — `pdf-merge-tool.tsx` n'a que des boutons ↑/↓, aucun `draggable`.

**Pourquoi ça compte** : sur un site dont l'argument central est la confiance (« vos fichiers ne quittent jamais cette page »), une promesse non tenue et vérifiable en 5 secondes contamine la crédibilité de toutes les autres. C'est aussi du contenu indexé : Google fait remonter la page sur « estimation taille vidéo » et l'utilisateur ne trouve rien.

**Fix** : implémenter l'estimation dans video/compress — le code existe déjà à côté, `audio-extract-tool.tsx:93` fait `Math.round((bitrate * 1000 * duration) / 8)`. Pour la vidéo : lire la durée via `onLoadedMetadata`, appliquer le bitrate cible du preset. Pour pdf/merge : ajouter le drag-reorder ou corriger les deux dictionnaires.

**Commande** : `$impeccable harden`

### [P0] Le résultat n'est jamais montré — il est téléchargé de force

Sur les 20 outils vidéo/audio, le pattern est identique :

```ts
const bytes = await compressVideo(file, { quality, onProgress });
const blob = new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
downloadBlob(blob, outputName('compressed', [file.name], 'mp4'));   // ← fin
```

Il n'y a **aucun état intermédiaire**. Après 6 minutes d'encodage, l'utilisateur reçoit un fichier dans son dossier Téléchargements et l'interface est revenue à son état initial. Il ne sait pas : quel poids fait le résultat, quelle réduction a été obtenue, si la qualité est acceptable. Pour le savoir il doit quitter le navigateur, ouvrir le fichier, revenir, et **tout refaire** s'il veut essayer un autre preset.

**Pourquoi ça compte** : c'est la violation directe de votre propre règle dans `CLAUDE.md` — *« l'utilisateur doit toujours voir ce qu'il va obtenir avant de télécharger »*. Et c'est le pic émotionnel de la tâche : le moment de la récompense est vécu comme une disparition.

**Fix** : un état `result` partagé. Après traitement, afficher un panneau : lecteur `<video>` sur le blob de sortie, poids avant → après avec le %, bouton **Télécharger** explicite, bouton **Réessayer avec d'autres réglages** qui conserve le fichier source. `image-remove-bg-tool.tsx` a déjà 80 % de cette structure (`resultBytes` + `useBlobUrl` + damier) — c'est le patron à extraire en composant `<ToolResult>`.

**Commande** : `$impeccable shape`

### [P1] Aucune annulation sur les traitements lourds

`grep -rE "AbortController|abort\(|terminate\(" components/tools/` ne remonte que `skills-browse` et `pdf-extract-images`. Les 20 outils ffmpeg n'ont **aucun moyen d'arrêter**. Aucun `beforeunload` non plus dans tout le projet : un clic sur le fil d'Ariane pendant un encodage de 8 minutes détruit le travail sans un mot.

**Pourquoi ça compte** : Nielsen #3. L'utilisateur qui s'est trompé de preset, de fichier, ou qui réalise que ça va prendre 10 minutes est piégé. Le seul recours est de tuer l'onglet — ce qui, sur un outil « privacy-first » où rien n'est sauvegardé côté serveur, veut dire tout recommencer.

**Fix** : `ffmpeg.terminate()` est exposé par `@ffmpeg/ffmpeg`. Ajouter un bouton **Annuler** qui remplace le bouton principal pendant `busy`, appelle `terminate()`, et invalide l'instance cachée de `lib/ffmpeg-loader.ts` (mettre `instance = null` pour que le prochain appel recharge le core). Ajouter un `beforeunload` conditionné à `busy`.

**Commande** : `$impeccable harden`

### [P1] Le focus clavier est invisible sur 33 outils

Le pattern « chip » est partout : un `<label>` stylé qui enveloppe un `<input type="radio" className="sr-only">`. Mesure faite dans le navigateur sur `/fr/text/case`, focus programmé sur le 4ᵉ radio :

```json
{ "activeIsRadio": true,
  "radioBox": { "width": 1, "height": 1 },
  "radioClip": "inset(50%)",
  "radioOutline": "rgb(255,255,255) solid 2px",
  "labelOutline": "rgb(163,163,163) none 3px",
  "labelHasFocusWithinStyle": false }
```

Le navigateur dessine bien un anneau de focus — sur un élément de 1×1 px découpé par `clip-path: inset(50%)`. Il est donc **rigoureusement invisible**. Le `<label>` visible n'a aucun style `focus-within`. Capture zoomée confirmée : le seul chip cerclé est le chip *sélectionné*, pas le chip *focalisé*.

33 outils avec des chips radio, 18 avec des chips checkbox. `components/ui/button.tsx` n'a pas non plus de `focus-visible:` — il dépend de l'anneau UA par défaut, non conçu.

**Pourquoi ça compte** : échec WCAG 2.1 SC 2.4.7 (Focus Visible), niveau AA. Un utilisateur au clavier tabule dans le vide. Sur un site qui héberge un outil de **contraste WCAG** et une catégorie **lecture / dyslexie**, c'est une contradiction avec les valeurs affichées.

**Fix** : une classe partagée sur le `<label>` — `has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg` (Tailwind v4 supporte `has-[]` nativement). Et ajouter `focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2` à `base` dans `button.tsx`. Deux fichiers, 51 outils corrigés.

**Commande** : `$impeccable audit`

### [P1] Fusionner à l'aveugle : video/merge et audio/merge

Ce sont les deux seuls outils à fichiers multiples **sans le moindre aperçu**. `video-merge-tool.tsx` affiche une liste : numéro, nom tronqué, poids, ↑, ↓, Retirer. Rien d'autre. Pas de vignette de première frame, pas de durée par clip, pas de durée totale, pas de mise en garde quand les résolutions ou framerates diffèrent (ce qui produit un montage cassé après 5 minutes d'encodage).

À côté, `pdf-merge-tool.tsx` affiche une grille de miniatures de toutes les pages de tous les fichiers. Le même geste utilisateur — ordonner des fichiers avant de les concaténer — obtient deux expériences incomparables.

**Pourquoi ça compte** : ordonner des clips par nom de fichier est exactement le genre de tâche où l'humain se trompe. `IMG_4471.mov` avant ou après `IMG_4468.mov` ? L'erreur ne se révèle qu'après l'encodage — et sans état de résultat (P0 ci-dessus), même pas à ce moment-là.

**Fix** : extraire la première frame de chaque clip via un `<video>` hors écran + `canvas.drawImage` à `currentTime = 0.1`, afficher vignette + durée sur chaque ligne, et une durée totale en pied de liste. Pour l'audio, la durée via `onLoadedMetadata` suffit. Ajouter un avertissement non bloquant si les dimensions diffèrent.

**Commande** : `$impeccable shape`

### [P2] Le rectangle de recadrage vidéo est désaligné

`video-crop-tool.tsx:174-193` : le conteneur est `relative w-full max-h-72`, la vidéo est `w-full max-h-72`, et l'overlay est positionné en pourcentage du **conteneur**.

La feuille de style UA des navigateurs applique `object-fit: contain` à `<video>`. Dès que `max-h-72` (288 px) plafonne la hauteur — c'est-à-dire dès que la largeur du conteneur dépasse `288 × ratio`, soit **512 px pour une vidéo 16:9** — l'image est lettreboxée à l'intérieur d'une boîte plus large qu'elle. L'overlay, lui, reste calé sur la boîte. Sur un écran desktop (conteneur ≈ 768 px), le rectangle est décalé d'environ 128 px de chaque côté.

La copy annonce pourtant : *« le rectangle d'accentuation montre la zone de recadrage en direct sur l'image »*.

**Fix** : envelopper la vidéo dans un conteneur en `aspect-ratio: {dims.w}/{dims.h}` calculé depuis `onLoadedMetadata`, avec `max-height` sur ce conteneur plutôt que sur la vidéo. L'overlay devient alors exact par construction. Tant qu'à y être : des poignées de redimensionnement à la souris — quatre champs numériques pour cadrer une image est une inversion du geste naturel.

**Commande** : `$impeccable adapt`

### [P2] `PdfThumbnail` reparse le PDF entier à chaque miniature

`components/ui/pdf-thumbnail.tsx:53-58` — chaque instance fait :

```ts
const bytes = new Uint8Array(await file.arrayBuffer());   // copie complète
const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
const page = await doc.getPage(pageIndex);
```

`PdfPagesGrid` monte une instance **par page**, sans virtualisation ni lazy-loading. Un PDF de 120 pages à 30 Mo déclenche 120 copies mémoire du fichier et 120 ouvertures de document pdf.js concurrentes — plusieurs gigaoctets, et un onglet qui rame ou casse. Le document n'est jamais `destroy()`.

**Pourquoi ça compte** : c'est le composant qui porte la meilleure expérience du site, et il s'effondre précisément sur les gros fichiers — le cas d'usage où « pas d'upload » est votre argument décisif.

**Fix** : charger le `PDFDocumentProxy` une seule fois dans `PdfPagesGrid` (ou un hook `usePdfDocument`) et le passer aux miniatures ; ajouter un `IntersectionObserver` pour ne rendre que les pages visibles ; appeler `doc.destroy()` au démontage.

**Commande** : `$impeccable optimize`

### [P2] Les réglages sont placés après le résultat

Dans `text-case`, `json-format`, `json-csv` et `xml-format`, le `<fieldset>` des options est rendu **après** la grille entrée/sortie dans le DOM (`text-case-tool.tsx` : grille l.113, fieldset l.152).

Sur desktop, ça passe. Sur mobile la grille passe en une colonne : entrée (24 rem) puis sortie (24 rem) puis les options. L'utilisateur doit défiler d'environ 700 px **au-delà du résultat** pour changer de mode, puis remonter pour le lire. Sur un outil dont toute la valeur est la boucle « je change un réglage / je vois le résultat », la boucle est cassée sur mobile.

Accessoirement, `Copier` et `Télécharger` sont ancrés en bas à droite du conteneur, détachés du panneau « Sortie » auquel ils s'appliquent.

**Fix** : déplacer le `<fieldset>` au-dessus de la grille, ou l'ancrer en `sticky` en tête du panneau de sortie. Rapprocher `CopyButton` de l'en-tête du panneau « Sortie ».

**Commande** : `$impeccable layout`

### [P3] Un seul message d'erreur par outil

81 outils sur 90 n'exposent qu'un unique libellé d'erreur, et tous les `catch` l'écrivent sans distinction :

```
video/compress → « Impossible de compresser cette vidéo. »
video/crop     → « Impossible de recadrer cette vidéo. »
video/rotate   → « Impossible d'appliquer la transformation. »
```

Le message est une impasse : il nomme l'échec, jamais la cause ni l'issue. Or les causes sont connues et distinguables dans le code — `lib/ffmpeg-loader.ts:32` lève explicitement `'ffmpeg multi-thread requires cross-origin isolation'`, un cas qui a sa propre cause (navigation client-side hors route isolée, cf. `CLAUDE.md`) et sa propre solution (recharger la page). Un codec non supporté, une OOM et un défaut d'isolation produisent aujourd'hui le même texte.

`video/convert` et les outils audio font déjà mieux : *« Essayez un autre fichier ou format. »*

**Fix** : trois libellés au lieu d'un — codec/fichier non supporté, mémoire insuffisante (suggérer un fichier plus court), isolation manquante (suggérer un rechargement) — et un `instanceof`/test de message dans le `catch`.

**Commande** : `$impeccable clarify`

## Persona Red Flags

**Alex (power user)** — Aucun raccourci clavier dans les outils eux-mêmes ; la palette ⌘K sert à *naviguer* entre outils, pas à les piloter (pas de ⌘↵ pour lancer, pas d'Échap pour annuler — il n'y a d'ailleurs rien à annuler). Pas de traitement par lot : compresser 12 vidéos = 12 passages complets dans l'interface. Dans video/merge, réordonner 8 clips au bouton ↑ demande jusqu'à 28 clics là où un glisser-déposer en demanderait 8. Abandonnera pour ffmpeg en ligne de commande.

**Sam (dépendant de l'accessibilité)** — Tabule dans les 10 chips de mode de `text/case` sans le moindre indicateur visible (mesure ci-dessus). Dans `video/crop`, la zone de recadrage n'est communiquée que par un rectangle visuel — pas de `aria-live` annonçant les dimensions résultantes, et le rectangle est de toute façon désaligné. `PdfPagesGrid` rend des `<button>` correctement étiquetés, mais 120 boutons sans regroupement ni `aria-setsize` : la navigation au lecteur d'écran est un tunnel. Point positif réel : les `<input>`/`<textarea>` ont tous un `focus:ring-2` visible, et le lien d'évitement `#main-content` existe.

**Riley (testeur méthodique)** — Dépose un `.mkv` avec un codec exotique dans `video/compress`, attend 4 minutes, obtient « Impossible de compresser cette vidéo. » : aucune information exploitable, et le fichier est toujours chargé sans indice sur quoi changer. Recharge la page en plein encodage : aucun avertissement, travail perdu. Dépose un PDF de 200 pages dans `pdf/split` : l'onglet gèle pendant le rendu simultané des 200 miniatures. Passe de `high` à `low` dans `video/compress` : rien ne bouge à l'écran — impossible de savoir si le réglage a été pris en compte avant d'avoir relancé tout l'encodage.

## Minor Observations

- La zone de dépôt est copiée-collée dans ~40 composants (`onDragOver`/`onDragLeave`/`onDrop` + `dragging` + `<input className="sr-only">`). Les comportements ont divergé : `pdf-rotate` rend l'`<input>` dans les deux branches (on peut remplacer le fichier), `video-compress` uniquement dans la branche vide (il faut d'abord cliquer « Retirer »). Un composant `<DropZone>` partagé réglerait la cohérence et le focus clavier du même coup.
- `dragleave` se déclenche sur chaque enfant traversé : la bordure d'accentuation clignote pendant le survol. Un compteur de profondeur ou `relatedTarget` corrige.
- 15 outils sur 90 utilisent `wide` (`max-w-6xl`) ; les autres sont contraints à `max-w-3xl` (768 px). Sur un écran de 1444 px, `video/crop` et `image/crop` affichent leur aperçu dans 768 px avec 340 px de vide de chaque côté. La contrainte typographique du texte ne devrait pas s'appliquer aux surfaces d'édition visuelle.
- `audio/volume` applique le gain à `HTMLAudioElement.volume`, plafonné à 1.0 : toute la plage +1 à +20 dB s'écoute exactement pareil. Un `GainNode` de la Web Audio API lèverait la limite.
- `qr/generate` fait 647 lignes et `short-studio` 1019 — les deux mériteraient une passe de découpe avant d'ajouter quoi que ce soit.
- `image-resize-tool.tsx:71` et `svg-to-data-url-tool.tsx:92` remontent en `broken-image` au détecteur : faux positifs (`src` dynamique), rien à corriger.

## Questions to Consider

- Et si le bouton principal disait **« Compresser et prévisualiser »** plutôt que « Compresser » ? Le mot « Télécharger » n'apparaîtrait qu'une fois le résultat sous les yeux.
- La page d'outil pourrait-elle démarrer avec l'outil en pleine hauteur, et reléguer Fonctionnalités / Comment ça marche / FAQ sous un premier scroll ? Le SEO n'exige pas d'être au-dessus de la ligne de flottaison, seulement d'être dans le DOM.
- Trois presets nommés « Haute / Moyenne / Basse » — ou un curseur unique avec le poids estimé qui bouge en direct sous le doigt ? Le second transforme un choix abstrait en décision informée.
- À quoi ressemblerait `video/merge` s'il ressemblait à `pdf/merge` ?
