const fs = require('node:fs');
const path = require('node:path');

const publicDirectory = path.join(__dirname, '..', 'public');
const buildDirectory = path.join(__dirname, '..', 'build');

if (fs.existsSync(publicDirectory)) {
  fs.cpSync(publicDirectory, buildDirectory, {
    recursive: true,
    filter: source => path.basename(source).toLowerCase() !== 'index.html',
  });
}

const builtIndex = path.join(buildDirectory, 'index.html');
if (fs.existsSync(builtIndex)) {
  const html = fs.readFileSync(builtIndex, 'utf8');
  fs.writeFileSync(builtIndex, html.replace(' ws://localhost:3001 ws://127.0.0.1:3001;', ';'));
}
