const { marked } = require('marked');
const text = '# H1\n## H2\n### H3\n#### H4';
const tokens = marked.lexer(text);
console.log(JSON.stringify(tokens, null, 2));
