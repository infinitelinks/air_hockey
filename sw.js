const CACHE = "airhockey-pro-v3";
const ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./sw.js",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
            const fresh = await fetch(req);
            if (req.method === "GET" && new URL(req.url).origin === location.origin) {
                cache.put(req, fresh.clone());
            }
            return fresh;
        } catch {
            return cache.match("./index.html");
        }
    })());
});
