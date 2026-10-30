/* Weather Iran - service worker: app shell works offline, live data and map tiles always come from the network */
const V = "wx-v8";
const SHELL = ["./", "index.html", "basic.html", "advanced.html", "manifest.webmanifest", "icon/icon-192.png", "icon/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (/open-meteo\.com$|openstreetmap\.org$/.test(u.hostname)) return;
  e.respondWith((async () => {
    const hit = await caches.match(r);
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === "opaque") && (u.origin === location.origin || /^(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(u.hostname))) {
        const cp = res.clone();
        caches.open(V).then(c => c.put(r, cp));
      }
      return res;
    });
    if (hit) { e.waitUntil(net.catch(() => 0)); return hit; }
    try { return await net; }
    catch (err) { return r.mode === "navigate" ? (await caches.match("index.html")) : Response.error(); }
  })());
});
