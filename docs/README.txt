ASSET NOTES
===========

This folder is configured as the app's **public directory** (see `vite.config.js`).
That means files here are served from the site root, and `vite build` copies them
into `docs/` for static hosting.

Current runtime assets:
- `target-gem-01.svg`
- `hazzard-octopus.svg`

To change visuals, edit `themes.classic.assets` in `script.js` and point `src` to a
file in this folder (use paths like `target-gem-01.svg`, not `assets/target-gem-01.svg`).
