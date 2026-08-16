import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('every runtime game asset is included in the service worker precache', async () => {
  const sw = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  const files = await readdir(new URL('../../game/', import.meta.url));
  for (const file of files.filter(name => name.endsWith('.mjs') || name.endsWith('.css'))) {
    assert.match(sw, new RegExp(`['\"]\\/game\\/${file.replace('.', '\\.')}`), `${file} is missing from PRECACHE`);
  }
});

test('game HTML has no legacy scripts or inline event handlers', async () => {
  const html = await readFile(new URL('../../game.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /game-scene\.js|game-mission\.js/);
  assert.doesNotMatch(html, /\sonclick=/);
  assert.match(html, /type="module" src="game\/app\.mjs"/);
});

test('every UI controller element id exists in game HTML', async () => {
  const [html, controller] = await Promise.all([
    readFile(new URL('../../game.html', import.meta.url), 'utf8'),
    readFile(new URL('../../game/ui-controller.mjs', import.meta.url), 'utf8'),
  ]);
  const ids = [...controller.matchAll(/byId\('([^']+)'\)/g)].map(match => match[1]);
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), `${id} is missing from game.html`);
});
