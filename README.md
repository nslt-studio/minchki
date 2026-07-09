# minchki

Bundle JS externe pour le site Webflow. Un seul fichier (`main.js`) est appelé depuis Webflow ; il pilote la navigation (Swup) et le JS spécifique à chaque page.

## Structure

```
src/
  main.js         → point d'entrée unique, détecte la page courante et lance le bon module
  swup.js         → configuration de Swup (navigation en AJAX, container #swup)
  pages/
    home.js
    work.js
    playground.js
    about.js
    details.js
```

Dans Webflow, chaque page a un wrapper `.main-wrapper#swup` avec un attribut `data-swup` qui identifie la page, ex :

```html
<div class="main-wrapper" id="swup" data-swup="home">...</div>
```

`main.js` lit cet attribut et appelle le module correspondant dans `src/pages/`, au chargement initial et après chaque navigation Swup.

### Ajouter une nouvelle page

1. Créer `src/pages/nom.js` avec `export function initNom() { ... }`.
2. L'importer et l'enregistrer dans l'objet `pages` de `src/main.js`.
3. Mettre `data-swup="nom"` sur le wrapper de la page dans Webflow.

## Installation

```sh
npm install
```

## Dev (aperçu en temps réel dans Webflow)

```sh
npm run dev
```

Ça démarre :
- le serveur de dev Vite (avec Hot Module Replacement),
- un tunnel Cloudflare "quick" qui expose ce serveur sur une URL publique en `https://xxxx.trycloudflare.com`.

Le terminal affiche l'URL et les deux balises `<script>` à coller dans **Webflow → Page Settings (ou Site Settings) → Custom Code → Before `</body>`** :

```html
<script type="module" src="https://xxxx.trycloudflare.com/@vite/client"></script>
<script type="module" src="https://xxxx.trycloudflare.com/src/main.js"></script>
```

Toute modification enregistrée dans `src/` se répercute instantanément sur le site Webflow publié (ou en preview), sans rebuild manuel.

⚠️ Le quick tunnel n'a pas d'URL fixe : à chaque redémarrage de `npm run dev`, il faut remettre à jour les deux balises `<script>` dans Webflow.

## Build (production)

```sh
npm run build
```

Génère `dist/main.js`, un unique fichier autonome (format IIFE) à héberger et pointer depuis Webflow en production :

```html
<script src="URL_PUBLIQUE_DE_DIST/main.js"></script>
```

(L'hébergement de `dist/main.js` en production — Cloudflare Pages, GitHub Pages, etc. — reste à définir séparément.)

## Git

Le remote `origin` pointe vers `https://github.com/nslt-studio/minchki.git`. Le push se fait **manuellement, uniquement sur demande** — pas d'automatisation.
