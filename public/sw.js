/* Dagsform service worker – tar emot push-notiser även när appen är stängd. */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: "Dagsform", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Dagsform";
  const options = {
    body: data.body || "",
    icon: "/__l5e/assets-v1/0635ec47-a3ce-44b7-963a-acd3fff88cd9/dagsform-icon.png",
    badge: "/__l5e/assets-v1/0635ec47-a3ce-44b7-963a-acd3fff88cd9/dagsform-icon.png",
    tag: data.tag || "dagsform",
    renotify: true,
    data: { url: data.url || "/idag" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/idag";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
