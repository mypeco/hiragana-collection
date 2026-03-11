// ========================================
// ひらがなコレクション サービスワーカー
// ========================================

const CACHE_NAME = 'hiragana-collection-v3';

// オフラインでも動かすためにキャッシュするファイル一覧
const APP_SHELL = [
  './index.html',
  './kanjivg-cache.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// CDNのファイルもキャッシュ（ネットなしでも動くように）
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&family=Yuji+Boku&display=swap',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/dexie/dist/dexie.js',
];

// ----------------------------------------
// インストール時：アプリの核となるファイルをキャッシュ
// ----------------------------------------
self.addEventListener('install', (event) => {
  console.log('[SW] インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // アプリ本体のファイルをキャッシュ
      await cache.addAll(APP_SHELL);
      console.log('[SW] アプリファイルをキャッシュしました');

      // CDNファイルは失敗しても続ける（1つずつ試みる）
      for (const url of CDN_URLS) {
        try {
          const res = await fetch(url, { mode: 'no-cors' });
          await cache.put(url, res);
          console.log('[SW] CDNキャッシュ成功:', url);
        } catch (e) {
          console.warn('[SW] CDNキャッシュ失敗（スキップ）:', url);
        }
      }
    })
  );
  // 古いSWを待たずにすぐ有効化
  self.skipWaiting();
});

// ----------------------------------------
// アクティベート時：古いキャッシュを削除
// ----------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] アクティベート中...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] 古いキャッシュを削除:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ----------------------------------------
// フェッチ時の戦略
// ----------------------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase への通信はキャッシュしない（ネット優先）
  if (url.hostname.includes('supabase.co')) {
    return; // ブラウザのデフォルト動作に任せる
  }

  // Google Fonts の CSS はネット優先→失敗時にキャッシュ
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // それ以外はキャッシュ優先（オフラインでも動く）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // キャッシュになければネットから取得してキャッシュに追加
      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // HTMLを要求していてオフラインなら index.html を返す
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

