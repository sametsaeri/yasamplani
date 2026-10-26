// Hesap Planım — Service Worker (PWA)
// Amaç:
//  1) Uygulamayı "kurulabilir" yapmak (manifest + SW şart)
//  2) Çevrimdışında dahi arayüzün açılması (önbellek → veriler tarayıcıda
//     zaten localStorage'da durur, veri kaybı olmaz)
// Strateji:
//  - Sayfa gezinmeleri: network-first (bağlantı varsa güncel sayfa; yoksa önbellek)
//  - Statik dosyalar (_next/*, ikonlar, manifest): cache-first + arka planda güncelleme
//  - API çağrıları: asla önbelleğe alınmaz (veri bütünlüğü)
const CACHE = "hp-pwa-v1";
const ONB = ["./", "./manifest.webmanifest", "./ikonlar/ikon-192.png", "./ikonlar/ikon-512.png", "./ikonlar/ikon-maske-192.png", "./ikonlar/ikon-maske-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ONB)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((k) =>
      Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const g = e.request;
  if (g.method !== "GET") return; // POST/PUT → ağa bırak
  const url = new URL(g.url);
  if (url.origin !== self.location.origin) return; // harici istek → ağ
  if (url.pathname.startsWith("/api/")) return; // API asla önbelleğe alınmaz

  if (g.mode === "navigate") {
    // Sayfa: önce ağ, düşerse önbellekten
    e.respondWith(
      fetch(g)
        .then((r) => {
          const k = r.clone();
          caches.open(CACHE).then((c) => c.put("./__gezgin", k)).catch(() => {});
          return r;
        })
        .catch(() =>
          caches.match(g).then((c) => c || caches.match("./"))
        )
    );
    return;
  }

  // Statik: önce önbellek, yoksa ağdan çek ve önbelleğe yaz
  e.respondWith(
    caches.match(g).then((kayıt) => {
      const ag = fetch(g)
        .then((r) => {
          if (r && r.status === 200) {
            const k = r.clone();
            caches.open(CACHE).then((c) => c.put(g, k)).catch(() => {});
          }
          return r;
        })
        .catch(() => kayıt);
      return kayıt || ag;
    })
  );
});
