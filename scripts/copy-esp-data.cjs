const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const target = path.join(root, 'arduino', 'gym-tracker-wifi', 'data');

if (!fs.existsSync(dist)) {
  console.error('Run vite build first — dist/ not found.');
  process.exit(1);
}

for (const name of fs.readdirSync(target)) {
  if (name === '.gitkeep') continue;
  fs.rmSync(path.join(target, name), { recursive: true, force: true });
}

for (const name of fs.readdirSync(dist)) {
  fs.cpSync(path.join(dist, name), path.join(target, name), { recursive: true });
}

console.log('Copied dist/ -> arduino/gym-tracker-wifi/data/');
