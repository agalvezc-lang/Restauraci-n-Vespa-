/* =========================================================
   RESTAURACIONES — Service Worker
   Estrategia: network-first + fallback a caché (offline básico)
   IMPORTANTE: sube este archivo (sw.js) y manifest.json en la
   misma carpeta que index.html, en un hosting http/https
   (ej. GitHub Pages). Los navegadores no permiten registrar
   Service Workers desde data:/blob: URLs, así que no pueden ir
   embebidos dentro del propio .html — deben ser archivos aparte.
   ========================================================= */

const CACHE_NAME = "restauraciones-cache-v8-08082026";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/splash-1284x2778.jpg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
