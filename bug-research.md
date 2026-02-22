# Bug Research Report

## Identified Bugs

### 1. Fetch Race Condition and Missing Cancellation
**Location**: `packages/markdown-deck/src/markdown-deck.ts`, functions `_loadMarkdownFile` and `_loadCSSFile`.
**Issue**: When the `src` or `css` attributes change, a new `fetch` request is started. However, previous requests are not cancelled. If an older request completes after a newer one, it will overwrite the state (`markdown` or `_stylesheet`) with stale data.
**Impact**: The presentation may display incorrect content or styles if the attributes are changed rapidly or if network responses arrive out of order.

### 2. Memory Leak in `ResizeObserver`
**Location**: `packages/markdown-deck/src/markdown-slide.ts`.
**Issue**: A `ResizeObserver` is created in `firstUpdated` for each slide, but it is never disconnected. Since the observer holds a reference to the `MarkdownSlide` instance (via the `_setScale` callback), these instances cannot be garbage collected even after being removed from the DOM.
**Impact**: Increasing memory usage over time, especially in the live editor where slides are frequently re-rendered.

### 3. Missing `hashchange` Event Listener
**Location**: `packages/markdown-deck/src/markdown-deck.ts`.
**Issue**: The `hashsync` feature only reads the URL hash when the component is first connected. It does not listen for `hashchange` events, so the presentation does not stay in sync if the user uses the browser's back/forward buttons or manually edits the URL.
**Impact**: Broken navigation sync when using browser history.

### 4. Redundant Font Injections
**Location**: `packages/markdown-deck/src/markdown-deck.ts`.
**Issue**: Fonts are injected into the document `<head>` every time the component's `connectedCallback` is executed. There is no check to see if the fonts have already been injected.
**Impact**: The document head becomes cluttered with redundant `<link>` and `<style>` tags if the component is moved or re-added to the DOM.

### 5. Reactive Property Issues for `hotkey`
**Location**: `packages/markdown-deck/src/markdown-deck.ts`.
**Issue**: The `keydown` event listener for hotkeys is only added in `connectedCallback` if `hotkey` is initially true. If the `hotkey` property is changed dynamically, the listener is not added or removed.
**Impact**: The `hotkey` attribute does not behave reactively.

### 6. Dead Code and Broken Styles in `MarkdownDeck`
**Location**: `packages/markdown-deck/src/markdown-deck.ts`.
**Issue**: The `_scale` property in `MarkdownDeck` is never updated, and the CSS rule `section { transform: scale(${this._scale}) }` does not match any element in its shadow DOM (the `section` elements are inside `MarkdownSlide`).
**Impact**: Confusion for maintainers and unnecessary code/style processing.

### 7. Edge Cases in Markdown Splitting
**Location**: `packages/markdown-deck/src/utils.ts`.
**Issue**: `splitMarkdownToPages` uses a regex that requires a leading and trailing newline around horizontal rules (`\n[-*]{3,}\n`). Consequently, horizontal rules at the very beginning or end of the markdown string are ignored.
**Impact**: Inconsistent behavior when markdown content starts or ends with a separator.

### 8. Double Update of Pages
**Location**: `packages/markdown-deck/src/markdown-deck.ts`.
**Issue**: In `_loadMarkdownFile`, `this._updatePages()` is called manually after setting `this.markdown`. However, setting `this.markdown` also triggers `shouldUpdate`, which calls `this._updatePages()` again.
**Impact**: Minor performance hit due to redundant processing.
