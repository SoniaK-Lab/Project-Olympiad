// Static educational shell only. Never caches /ui, authentication, member APIs or messages.
const CACHE='bridge-continuity-static-v1';
const FILES=['/continuity-offline/','/continuity-offline/index.html','/continuity-offline/library.js','/continuity-offline/offline.js','/continuity-offline/manifest.webmanifest','/continuity-offline/icon.svg','/fonts/vazir/Vazir-Regular.woff2'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bridge-continuity-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.search||!FILES.includes(u.pathname))return;e.respondWith(caches.open(CACHE).then(async c=>{const cached=await c.match(u.pathname);return cached||fetch(e.request)}))});
