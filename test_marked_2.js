const { marked } = require('marked');
const text = '# Markdown Editor\n## asdf\n### asdf\n#### asdfasdf';
const tokens = marked.lexer(text);
console.log(JSON.stringify(tokens.map(t => ({type: t.type, raw: t.raw})), null, 2));
