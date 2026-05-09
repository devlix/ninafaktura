/* ***********************************************
      SERVICE WORKER - for offline capability
   *********************************************** */

// For å unngå at det serveres "gamle" filer fra cache, kan du tvinge
// ny nedlasting (når online) ved å endre CACHE_NAME til f.eks. "faktura-v2"
const CACHE_NAME = "faktura-v1";
// Her legger du inn ALT som trengs for å vise siden
const ASSETS = [
  "/", // Selve roten
  "/index.html", // HTML-strukturen
  "/css/style.css", // All styling
  "/js/app.js", // Firebase-logikk og UI-kode
  "/js/ui.js",
  "/js/firebase.js",
  "/js/invoices.js",

  "/manifest.json", // Viktig for at mobilen skal gjenkjenne PWA-en
  // '/img/logo.png',       // Logoen din
  "/favicon.ico", // Ikonet i fanen
];

// Installerer og lagrer faste filer
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// Strategi: "Stale-while-revalidate"
// Viser gammelt innhold umiddelbart, men oppdaterer i bakgrunnen
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      });
      return response || fetchPromise;
    })
  );
});
