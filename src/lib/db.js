import Dexie from 'dexie';

export const db = new Dexie('HiraganaPortfolioDB_v1');
db.version(1).stores({
  users:     '++id',
  settings:  'userId',
  practices: '++id, userId, [userId+char]',
  bestShots: '[userId+char], userId',
  readWords: '[userId+wordId], userId'
});
