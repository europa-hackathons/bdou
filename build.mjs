// Builds the single-file game.
//   node build.mjs   ->  index.html (everything inlined, for GitHub Pages / local Chrome)
//                        dev.html   (loads src/main.js as modules, for development)
//
// Source rules that make simple inlining safe:
//   - imports are single-line `import { ... } from './x.js';`
//   - top-level names are unique across all modules (checked below)
import { readFileSync, writeFileSync } from 'node:fs';

// dependency order
const MODULES = ['util', 'config', 'i18n', 'storage', 'audio', 'game', 'input', 'tracker', 'camera', 'sprites', 'draw', 'intro', 'anime', 'render', 'debug', 'ui', 'main'];

const template = readFileSync('src/index.template.html', 'utf8');
const seen = new Map();
let bundle = '';
for (const m of MODULES) {
  let code = readFileSync(`src/${m}.js`, 'utf8');
  for (const line of code.split('\n')) {
    if (/^import\s/.test(line) && !/from\s+'\.\/[\w-]+\.js';\s*$/.test(line)) throw new Error(`${m}.js: unsupported import: ${line}`);
    const d = line.match(/^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (d) {
      if (seen.has(d[1])) throw new Error(`Duplicate top-level name "${d[1]}" in ${m}.js and ${seen.get(d[1])}.js`);
      seen.set(d[1], m);
    }
  }
  code = code.replace(/^import\s.*$/gm, '').replace(/^export\s+/gm, '');
  bundle += `\n// ===== ${m}.js =====\n${code}`;
}
if (bundle.includes('</script')) throw new Error('bundle contains </script');

writeFileSync('index.html', template.replace('<!-- APP_SCRIPT -->', () => `<script type="module">\n'use strict';${bundle}\n</script>`));
writeFileSync('dev.html', template.replace('<!-- APP_SCRIPT -->', '<script type="module" src="./src/main.js"></script>'));
console.log(`Built index.html (${(readFileSync('index.html').length / 1024).toFixed(0)} KB) and dev.html from ${MODULES.length} modules`);
