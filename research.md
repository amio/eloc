# Research Report: eloc

## Overview
`eloc` (Eloquence CLI) is a tool for creating and serving presentations from Markdown files. It aims to be a lightweight, concise presentation tool with a focus on writing.

## Key Features
- **Markdown-based slides**: Slides are separated by horizontal rules (`---` or `***`).
- **Live Editing**: A built-in editor (toggled by `ESC`) allows real-time modifications that can be saved back to the source file (`Ctrl+S`).
- **Static Export**: Presentations can be exported to a directory as a static HTML site.
- **Customizable**: Supports external CSS and per-slide CSS.
- **Themes**: Includes a dark mode (invert) and a printing mode.
- **Web Component**: The core rendering is handled by a custom web component `<markdown-deck>`.

## Project Structure
The repository is organized as follows:
- `src/`: Contains the CLI source code (TypeScript/JavaScript).
  - `index.ts`: Entry point for the CLI.
  - `serve.ts`: Logic for serving the presentation and the live editor API.
  - `build.ts`: Logic for exporting the presentation.
  - `assets.ts`: Bundles the HTML, CSS, and JS for the presentation.
  - `editing.js`: Client-side logic for the live editor (embedded in the HTML).
- `packages/markdown-deck/`: The source for the custom web component.
  - `src/markdown-deck.ts`: The main component logic using Lit.
  - `src/markdown-slide.ts`: Component for rendering individual slides.
  - `src/utils.ts`: Helper functions for splitting markdown and managing text ranges.

## Technical Details
- **Frontend Framework**: Uses `lit` for building web components.
- **Markdown Parsing**: Uses `marked` with `marked-highlight`.
- **Syntax Highlighting**: Uses `prismjs`.
- **CLI Utilities**:
  - `mri`: Argument parsing.
  - `kleur`: Terminal styling.
  - `micro-fork` & `micri`: Lightweight HTTP server and routing.
  - `globby`: File globbing for assets.

## Specificities
- **Scaling**: Slides are automatically scaled to fit the container while maintaining a fixed aspect ratio (1280x800 for landscape, 800x1280 for portrait).
- **Preloading**: All slides are rendered in a hidden `preload` div to ensure assets like images are loaded before they are displayed.
- **Navigation**: Supports keyboard (arrows, space, etc.) and touch (swipe) navigation.
- **Hash Sync**: Optionally syncs the current slide index with the URL hash.

## Learnings
- The project demonstrates a clean way to bridge a CLI tool with a browser-based editor.
- The use of `lit` allows for a highly reactive UI with minimal overhead.
- The bundling of assets into a single HTML file (via `assets.ts`) makes the exported presentation very portable.
