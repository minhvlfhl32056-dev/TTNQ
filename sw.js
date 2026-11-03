
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  const title = data.title || "FINORA";
  const options = {
    body: data.body || "Bạn có khoản công nợ cần kiểm tra.",
    data: { url: "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
    for (const client of list) {
      if ("focus" in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow("./");
  }));
});
