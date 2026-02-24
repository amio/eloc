# @amio/md-editor

A high-performance Markdown editor Web Component using `contenteditable="plaintext-only"` and the **CSS Custom Highlight API**.

## Features

- **Native Speed**: Zero DOM manipulation for rendering. Styling is handled by the browser's Highlight API.
- **Plaintext Input**: Uses `contenteditable="plaintext-only"` to ensure consistent behavior across browsers and prevent HTML injection.
- **Theming**: Supports automatic (system-based) and manual light/dark themes.
- **Encapsulated**: Built with Shadow DOM to prevent style leakage.

## Usage

### 1. Installation

```bash
npm install @amio/md-editor
```

### 2. Basic Example

Include the script and use the `<md-editor>` tag:

```html
<script type="module" src="node_modules/@amio/md-editor/dist/index.js"></script>

<md-editor theme="auto"># Hello Markdown</md-editor>
```

## API

### Attributes

| Attribute | Description | Values | Default |
| :--- | :--- | :--- | :--- |
| `theme` | Sets the visual theme of the editor. | `auto`, `light`, `dark` | `auto` |
| `value` | Sets the initial Markdown content. | String | `""` |

> **Note**: Initial content can also be provided as child text nodes of the `<md-editor>` element.

### CSS Custom Properties

Customize the editor's appearance using css:

```stylesheet
md-editor.my-theme {
  --md-header-color: red;
  --md-list-color: blue;
}
```

Available CSS variables:

| Variable | Description |
| :--- | :--- |
| `--md-editor-bg` | Editor background color |
| `--md-editor-fg` | Text color |
| `--md-border-color` | Border color |
| `--md-header-color` | Heading text color |
| `--md-list-color` | List item marker/text color |
| `--md-code-color` | Inline code text color |
| `--md-code-bg` | Inline code background color |
| `--md-code-block-color` | Fenced code block text color |
| `--md-code-block-bg` | Fenced code block background color |
| `--md-link-color` | Link text color |


## License

MIT
