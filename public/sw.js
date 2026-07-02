/*
 * BALLAI365 Service Worker — ทำให้เป็น PWA ติดตั้งได้ + มีหน้า offline
 * กติกาสำคัญ: ข้อมูลบอลต้องสด → ใช้ network-first เสมอ (ไม่เสิร์ฟของ cache ค้าง)
 * cache ไว้แค่เป็น fallback ตอนเน็ตหลุด และ static assets ของ Next (/_next/static, ไอคอน)
 */
const CACHE = "ballai-v1";
const STATIC = ["/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ข้าม API ภายนอก/CDN

  // static ของ Next + ไอคอน = cache-first (ไม่เปลี่ยน)
  if (url.pathname.startsWith("/_next/static/") || STATIC.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }))
    );
    return;
  }

  // ทุกอย่างอื่น (หน้าเว็บ/ข้อมูล) = network-first, ล้มค่อยใช้ cache (offline)
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (request.mode === "navigate" && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
  );
});
