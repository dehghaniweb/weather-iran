/* Weather Iran - service worker.
   Pages: network first (new versions show up immediately; the cache is the offline / slow-network fallback).
   Static files: cache first with a background refresh. Live data and map tiles always come from the network. */
const V = "wx-v10";
const SHELL = ["./", "index.html", "basic.html", "advanced.html", "manifest.webmanifest", "icon/icon-192.png"];
const CDN = /^(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => 0)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
function keep(r, res) {
  if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)).catch(() => 0); }
  return res;
}
async function pageFirst(e, r) {
  const net = fetch(r).then(res => keep(r, res));
  try { return await Promise.race([net, new Promise((_, no) => setTimeout(no, 4000))]); }
  catch (err) {
    const hit = await caches.match(r, { ignoreSearch: true });
    if (hit) { e.waitUntil(net.catch(() => 0)); return hit; }
    try { return await net; }
    catch (x) { return r.destination === "document" ? ((await caches.match("index.html")) || Response.error()) : Response.error(); }
  }
}
async function assetFirst(e, r) {
  const hit = await caches.match(r);
  const net = fetch(r).then(res => keep(r, res));
  if (hit) { e.waitUntil(net.catch(() => 0)); return hit; }
  try { return await net; } catch (x) { return Response.error(); }
}
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || (u.origin !== location.origin && !CDN.test(u.hostname))) return;
  const page = r.mode === "navigate" || /\.(html|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/");
  e.respondWith(page ? pageFirst(e, r) : assetFirst(e, r));
});
