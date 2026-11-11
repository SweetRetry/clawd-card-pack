import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Vite always marks the entry as `<script type="module">` and leaves it in <head>.
// The mini tool container loads from an offline zip and cannot resolve module scripts,
// so we rewrite the tag to a classic script.
//
// A classic script in <head> would run before <body> exists, so it must also move to the
// end of <body>. Module scripts deferred automatically, which is why this is needed now.
// The result still works as a plain web page.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const htmlPath = resolve(dist, 'index.html');

const html = readFileSync(htmlPath, 'utf8');
const tagRe = /\s*<script\s+type="module"\s+crossorigin\s+src="([^"]+)"><\/script>/;
const match = html.match(tagRe);

if (!match) {
  console.error('postbuild: no module script tag found in dist/index.html');
  process.exit(1);
}

const patched = html
  .replace(tagRe, '')
  .replace(/\s*<\/body>/, `\n    <script src="${match[1]}"></script>\n  </body>`);

if (patched === html) {
  console.error('postbuild: could not move the entry script before </body>');
  process.exit(1);
}

writeFileSync(htmlPath, patched);
console.log('postbuild: entry script is now a classic script at the end of <body>');
