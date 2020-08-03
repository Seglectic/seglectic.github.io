// █▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█
// █  This is a quick Node.js app to   █
// █  convert a raw, space-terminated  █
// █  kanji text file to to newline    █
// █  terminated file.                 █
// █▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█

const fs = require('fs')


var k = fs.readFileSync('./kanji.txt','utf8');
fs.writeFileSync('./KanjiCards.txt',k.split(' ').join('\n'));


