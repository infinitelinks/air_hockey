// sw.js — Air Hockey Pro (offline + smooth updates + deep-link support)
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
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll(ASSETS);
    })());
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

    // Only GET requests
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Only handle same-origin (don't cache analytics, CDNs, etc.)
    if (url.origin !== self.location.origin) return;

    // "Navigation" = page loads / refresh / deep links
    const isNav =
        req.mode === "navigate" ||
        (req.headers.get("accept") || "").includes("text/html");

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);

        // NAVIGATION: network-first (fresh), fallback to cached index.html (offline deep links)
        if (isNav) {
            try {
                const fresh = await fetch(req);
                // Keep index.html updated for next offline launch
                cache.put("./index.html", fresh.clone());
                return fresh;
            } catch {
                return (await cache.match("./index.html")) || (await cache.match("./"));
            }
        }

        // STATIC: cache-first, ignore querystrings (?v=123)
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;

        // Otherwise fetch + cache
        try {
            const fresh = await fetch(req);
            cache.put(req, fresh.clone());
            return fresh;
        } catch {
            // Don't return HTML for images/audio; just fail cleanly
            return new Response("", { status: 504, statusText: "Offline" });
        }
    })());
});
