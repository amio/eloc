import { css } from 'lit-element'

export default css`
  .slide {
    --font-family: "Inter", "Roboto", sans-serif;
    --code-font-family: "Roboto Mono", "Fira Code", "PT Mono", Menlo, monospace;
    --quote-font-family: "Merriweather", serif;
    font: 40px/1.6em var(--font-family);
    font-feature-settings: 'calt', 'liga', 'case', 'ss02', 'ss03';
    font-weight: 300;
    color: rgba(0, 0, 0, 0.85);
  }

  .slide > * {
    margin-top: 0;
  }

  h1 { font: 2.6em/1.4em var(--font-family) }
  h2 { font: 1.8em/1.4em var(--font-family) }
  h3 { font: 1.5em/1.4em var(--font-family) }
  h4 { font: 1.2em/1.6em var(--font-family) }
  h5 { font: 1.0em/1.6em var(--font-family) }

  h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    letter-spacing: -0.01em;
    margin-bottom: 0.8em;
    margin-top: 0.2em;
  }

  h1 {
    text-transform: uppercase;
  }

  h6 {
    font-weight: normal;
    font-size: 2em;
    line-height: 1.6em;
    letter-spacing: -0.02em;
  }

  li {
    margin: 0.4em auto;
    text-align: left;
  }

  i {
    color: #333;
  }

  code {
    display: inline-block;
    background: #F2F2F2;
    padding: 0 0.25em;
    margin: 0 0.1em;
    border-radius: 0.3em;
    line-height: 1.4em;
    font-family: var(--code-font-family) !important;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.9);
  }

  pre {
    margin: 0 0.2em;
    font-size: 0.6em;
  }

  pre code {
    padding: 0.7em 1.2em;
    font-weight: normal;
  }

  a {
    color: #25E;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  p + ol,
  p + ul {
    margin-top: 0;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  img {
    max-width: var(--content-width);
    max-height: var(--content-height);
  }

  blockquote {
    font-family: var(--quote-font-family);
    font-style: italic;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 0;
  }

  blockquote em {
    opacity: 0.5;
  }

  kbd {
    display: inline-block;
    min-width: 1em;
    text-align: center;
    padding: 0 0.3em 0.07em 0.3em;
    margin: 0 0.1em;
    color: #444d56;
    background-color: #fafbfc;
    border: 1px solid #c6cbd1;
    border-bottom-color: #959da5;
    box-shadow: inset 0 -3px 0 #959da5;
    border-radius: 0.4em;
  }

  input[type="checkbox"] {
    margin: 0 1em 0.3em 0.2em;
    vertical-align: middle;
    transform: scale(2);
  }
`
