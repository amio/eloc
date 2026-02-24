const { marked } = require('marked');
const text = '####  asdfasdf'; // Two spaces
const tokens = marked.lexer(text);
console.log(JSON.stringify(tokens, null, 2));
