const CACHE_NAME = "faktura-v2";
const ASSETS = [
  "/", // Selve roten
  "/index.html", // HTML-strukturen
  "/css/style.css", // All styling
  "/js/app.js", // Firebase-logikk og UI-kode
  "/js/ui.js",
  "/js/firebase.js",
  "/js/invoices.js",
  // eksterne filer
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  // FIREBASE / FIRESTORE
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js",
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js",

  "/manifest.json", // Viktig for at mobilen skal gjenkjenne PWA-en
  // '/img/logo.png',       // Logoen din
  "/favicon.ico", // Ikonet i fanen
];

// 1. Installering - lagre statiske filer
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Aktivering - ta kontroll umiddelbart
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// 3. Fetch - håndter forespørsler
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Ignorer Firebase API-trafikk og Google-målinger
  if (url.includes("://googleapis.com") || url.includes("google.com")) {
    return;
  }
  // Sjekk om det er Firebase/Google API-trafikk (Data-trafikk)
  const isFirebaseAPI =
    url.includes("firestore.googleapis.com") || // Firestore (Database)
    url.includes("identitytoolkit.googleapis.com") || // Auth (Innlogging)
    url.includes("securetoken.googleapis.com") || // Auth (Tokens/Fornyelse)
    url.includes("google.com"); // f.eks. Google-målinger

  if (isFirebaseAPI) {
    return; // La nettleseren håndtere dette direkte (Firebase SDK fikser resten)
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Returner fra cache hvis vi har den
      if (cachedResponse) {
        return cachedResponse;
      }

      // Hvis ikke i cache, prøv nettverket
      return fetch(event.request)
        .then((networkResponse) => {
          // Sjekk at vi fikk et gyldig svar før vi prøver å cache det
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // Lagre en kopi i cachen til neste gang
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Her kan du legge inn en fallback hvis både cache og nett feiler
          console.log("Helt offline og fila mangler i cache:", url);
        });
    })
  );
});
