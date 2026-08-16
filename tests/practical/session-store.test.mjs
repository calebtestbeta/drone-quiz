import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore, MAX_PRACTICAL_SESSIONS, PRACTICAL_SESSION_KEY } from '../../game/session-store.mjs';

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('session store prepends records and caps history at 50', () => {
  const storage = memoryStorage();
  const store = createSessionStore(storage);
  for (let index = 0; index < 55; index += 1) store.add({ id: index });
  assert.equal(store.list().length, MAX_PRACTICAL_SESSIONS);
  assert.equal(store.list()[0].id, 54);
  assert.equal(JSON.parse(storage.getItem(PRACTICAL_SESSION_KEY))[0].version, 1);
});

test('storage failures do not crash the simulator', () => {
  const store = createSessionStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  assert.deepEqual(store.list(), []);
  assert.equal(store.add({ id: 1 }), false);
});
