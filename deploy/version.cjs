const CommitSHA = process.argv[2];

console.log('start replace the version');

const convertTimestampToYYYYMMDDHHmmSS = (timestamp) => {
  const date = new Date(timestamp + 8 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
};

const fs = require('fs');

const template = fs.readFileSync('deploy/.env', 'utf-8');
const version = `${CommitSHA.slice(0, 7)} (${convertTimestampToYYYYMMDDHHmmSS(
  new Date().getTime(),
)})`;
const replaced = template.replace('<will-replaced-by-script>', version);

fs.writeFileSync('deploy/version.txt', version);
fs.unlinkSync('.env');
fs.writeFileSync('.env', replaced);
console.log('replaced with version:', version);
