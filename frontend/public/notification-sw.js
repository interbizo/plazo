self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Mengubah data notifikasi menjadi URL satu-origin yang aman untuk dibuka.
function getTargetUrl(data) {
  const rawUrl = data?.url || data?.route || "/";

  try {
    return new URL(rawUrl, self.location.origin).href;
  } catch {
    return new URL("/", self.location.origin).href;
  }
}

// Mengambil pathname URL tanpa meneruskan data notifikasi yang tidak valid.
function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

// Memilih prefix dashboard yang perlu difokuskan untuk route tujuan.
function getPreferredPrefix(targetUrl) {
  const pathname = getPathname(targetUrl);

  if (pathname.startsWith("/seller/dashboard")) return "/seller/dashboard";
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/dashboard")) return "/dashboard";

  return "";
}

// Memfokuskan tab aplikasi yang sesuai atau membuka tab baru pada tujuan notifikasi.
async function focusOrOpenTarget(targetUrl) {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const targetOrigin = new URL(targetUrl).origin;
  const preferredPrefix = getPreferredPrefix(targetUrl);
  const sameOriginClients = windowClients.filter((client) => {
    try {
      return new URL(client.url).origin === targetOrigin;
    } catch {
      return false;
    }
  });

  const preferredClient =
    preferredPrefix &&
    sameOriginClients.find((client) =>
      getPathname(client.url).startsWith(preferredPrefix),
    );
  const targetClient = preferredClient || sameOriginClients[0];

  if (targetClient && "navigate" in targetClient) {
    try {
      const navigatedClient = await targetClient.navigate(targetUrl);
      const clientToFocus = navigatedClient || targetClient;

      if ("focus" in clientToFocus) {
        return clientToFocus.focus();
      }

      return clientToFocus;
    } catch {
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }
  }

  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl);
  }

  return undefined;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = getTargetUrl(event.notification?.data);

  event.waitUntil(focusOrOpenTarget(targetUrl));
});
