const CommitSHA = process.argv[2];

console.log('start replace the version');

const fs = require('fs');

const template = fs.readFileSync('deploy/.env', 'utf-8');
const version = CommitSHA.slice(0, 7);
const replaced = template.replace('<will-replaced-by-script>', version);

fs.writeFileSync('deploy/version.txt', version);
fs.unlinkSync('.env');
fs.writeFileSync('.env', replaced);
console.log('replaced with version:', version);
