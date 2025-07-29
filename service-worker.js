self.addEventListener("install", (event) => {
    // activate immediately
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    // take control of uncontrolled clients
    event.waitUntil(self.clients.claim());
});
