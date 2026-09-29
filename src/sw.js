const CACHE='xuanli-v0.5.0';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png','./lunar.js','./bazi-engine.js','./bazi-advanced.js','./bazi-v05.js'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'})));await self.skipWaiting();})());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('xuanli-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request.mode==='navigate'?'./index.html':event.request);if(cached)return cached;return fetch(event.request);})());
});
