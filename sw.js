/* =========================================================
   RESTAURACIONES — Service Worker
   Estrategia: network-first + fallback a caché (offline básico)
   IMPORTANTE: sube este archivo (sw.js) y manifest.json en la
   misma carpeta que index.html, en un hosting http/https
   (ej. GitHub Pages). Los navegadores no permiten registrar
   Service Workers desde data:/blob: URLs, así que no pueden ir
   embebidos dentro del propio .html — deben ser archivos aparte.
   ========================================================= */

const CACHE_NAME = "restauraciones-cache-v9-08082026";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/splash-1284x2778.jpg"
];
const TIEMPO_LIMITE_RED = 1200; // ms: si la red tarda más que esto, usa la copia guardada

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cachea cada archivo por separado: si uno falla (ej. ruta mal escrita),
      // no rompe la instalación de todo el Service Worker
      Promise.allSettled(URLS_TO_CACHE.map((url) => cache.add(url)))
    )
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
    new Promise((resolve, reject) => {
      let resuelto = false;
      const resolver = (respuesta) => {
        if (resuelto) return;
        resuelto = true;
        resolve(respuesta);
      };

      // red, con actualización de caché en segundo plano
      const promesaRed = fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          resolver(response);
          return response;
        })
        .catch(() => null);

      // si la red tarda demasiado, usa la copia guardada mientras la red sigue en segundo plano
      const temporizador = setTimeout(() => {
        caches.match(event.request).then((cacheada) => {
          if (cacheada) resolver(cacheada);
        });
      }, TIEMPO_LIMITE_RED);

      promesaRed
        .then((r) => { clearTimeout(temporizador); if (r === null && !resuelto) {
          caches.match(event.request).then((cacheada) => {
            if (cacheada) resolver(cacheada); else reject(new Error("sin red ni caché"));
          });
        }})
        .catch(() => {});
    }).catch(() => caches.match(event.request))
  );
});
