// หน้าครอบแอป: เก็บหน้าครอบ + ไอคอนไว้ในเครื่อง (ข้อมูลตารางเวรโหลดจากระบบจริงทุกครั้ง) + รับแจ้งเตือน (Firebase)
const C = 'shift-pwa-v2', FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;   // ไม่ยุ่งกับ Google
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
// กดแจ้งเตือน → เปิด/สลับไปที่แอป (ใช้กับแจ้งเตือนที่ไม่ได้มาจาก Firebase เช่น ข้อความในแอป)
self.addEventListener('notificationclick', e => {
  if (e.notification.data && e.notification.data.FCM_MSG) return;   // แจ้งเตือนจาก Firebase → Firebase จัดการเอง
  const link = (e.notification.data && (e.notification.data.link || (e.notification.data.FCM_MSG && e.notification.data.FCM_MSG.notification && e.notification.data.FCM_MSG.notification.click_action))) || './';
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const w = cs.find(c => c.url.indexOf(self.registration.scope) === 0);
    if (w) { w.postMessage({ shiftGo: new URL(link, self.registration.scope).searchParams.get('go') || '' }); return w.focus(); }
    return self.clients.openWindow(link);
  }));
});
// ===== Firebase Cloud Messaging (ทำงานเมื่อใส่ค่าใน push-config.js แล้ว) =====
try {
  importScripts('push-config.js');
  if (self.FIREBASE_CONFIG) {
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
    firebase.initializeApp(self.FIREBASE_CONFIG);
    const messaging = firebase.messaging();
    // ข้อความแบบ notification → Firebase แสดงให้เอง (กดแล้วเปิดลิงก์ fcm_options.link)
    messaging.onBackgroundMessage(() => {});
  }
} catch (err) { /* ยังไม่ได้ตั้งค่า / โหลด Firebase ไม่ได้ → ใช้งานแบบไม่มีแจ้งเตือน */ }
