# WUBRG — MTG Commander & Constructed Deck Tracker

WUBRG is a responsive, highly polished mobile-first web application designed for iPad and iPhone to track Magic: The Gathering (MTG) Commander and Constructed decks. Built with **React, TypeScript, Vite, and Vanilla CSS**, the app features a premium dark-mode design system with glassmorphic cards, statistics bars, and interactive components.

WUBRG-web is fully compatible with the iOS/macOS **WUBRG Swift application**—sharing the exact same JSON database schema so you can easily transfer, backfill, and sync your deck lists between the web app and the native iOS app.

---

## ✨ Features

- **📱 Premium Mobile-First Design**: Optimized for iPad Pro/Air viewports and iPhone notches (utilizing standard `safe-area-inset` styles) with graphite glassmorphism layouts and tactile haptic-like button transitions.
- **⚡ Scryfall API Integration**: Autocomplete card names and search Commander-legal matches interactively inside the deck editor with client-side response caching.
- **👥 Partner Commander Support**: Fully supports up to 2 partner commanders per deck, complete with multi-faced card lookups and multi-layered artwork stacks.
- **🎨 Custom WUBRG Color Picker**: Select color identities using standard interactive circular buttons that highlight colors dynamically matching official MTG card frames.
- **📷 Camera Card Scanner (OCR)**: Features an HTML5 viewport card scanner that utilizes the browser camera and client-side **Tesseract.js** to recognize text. Includes a card-name scoring heuristic ( apostrophes, commas, and mixed case weights) mirroring the Swift app's VisionKit logic!
- **🗃️ persistent LocalStorage Backing**: Keeps your library saved in local storage between browser refreshes. Pre-loaded with mock MTG deck lists (Atraxa Superfriends, Izzet Phoenix, Tymna/Kraum) if empty.
- **📥 Shared JSON Schema Compatibility**: Import and export your collection in the exact `MTGDeckSnapshot[]` JSON structure used by the Swift iOS app, making interoperability seamless.
- **🚀 CI/CD Automation**: Integrated with a GitHub Actions workflow that automatically builds and deploys your deck tracker straight to **GitHub Pages** on every push to `main`!

---

## 🛠️ Local Development Setup

To run or build the application locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lpbrochu/WUBRG-web.git
   cd WUBRG-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local Vite development server:**
   ```bash
   npm run dev
   ```

4. **Compile for production output:**
   ```bash
   npm run build
   ```
   *The compiled, optimized bundle is generated in the `/dist` directory.*

---

## 🚀 GitHub Pages Deployment

The project is fully configured to host as a static Single Page Application (SPA). On push to the `main` branch, a GitHub Action (.github/workflows/deploy.yml) will trigger:
- Installs packages and verifies TypeScript checks.
- Compiles the production bundle via `npm run build`.
- Publishes the compiled assets to your personal GitHub Pages URL:
  `https://lpbrochu.github.io/WUBRG-web/`
