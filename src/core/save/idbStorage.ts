import { openDB } from 'idb';

export const SMASH_DB_NAME = 'chaikuaidi-smash-save';
export const SMASH_DB_VERSION = 1;
export const RUN_STORE = 'runs';
export const META_STORE = 'meta';

export async function openSmashDb() {
  return openDB(SMASH_DB_NAME, SMASH_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(RUN_STORE)) db.createObjectStore(RUN_STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    },
  });
}
