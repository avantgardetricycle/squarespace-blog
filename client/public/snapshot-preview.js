/**
 * Boots the overlay inside a same-origin preview snapshot.
 * The snapshot document is served with script-src 'self', so init config lives in
 * a JSON script tag and this file (same origin) applies it.
 */
(function () {
  var el = document.getElementById("bb-snapshot-init");
  if (!el || !window.BlogOverlayRenderer || typeof window.BlogOverlayRenderer.init !== "function") return;
  var config = {};
  try {
    config = JSON.parse(el.textContent || "{}");
  } catch (e) {
    return;
  }
  window.BlogOverlayRenderer.init(config);
})();
