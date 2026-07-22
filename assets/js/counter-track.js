(function () {
  "use strict";

  var current = document.currentScript;
  var path = current && current.dataset ? String(current.dataset.akgPath || "") : "";
  var config = window.AKG_COUNTER || {};
  var apiBase = String(config.apiBase || "").trim().replace(/\/+$/, "");
  var siteKey = String(config.siteKey || "vipcytmall-mall").trim();

  if (!/^\/[a-z0-9-]+\/$/i.test(path)) {
    console.warn("AKG visitor counter: invalid or missing page path.");
    return;
  }

  if (!/^https:\/\//i.test(apiBase) || apiBase.indexOf("REPLACE-WITH-") !== -1) {
    console.info("AKG visitor counter is not configured. Edit assets/js/counter-config.js.");
    return;
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    var bytes = new Uint8Array(16);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function (value) {
        return value.toString(16).padStart(2, "0");
      }).join("");
    }
    return "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);
  }

  function getVisitorId() {
    var key = "akgVisitorIdV1";
    try {
      var existing = localStorage.getItem(key);
      if (existing && /^[a-z0-9-]{16,80}$/i.test(existing)) return existing;
      var created = randomId();
      localStorage.setItem(key, created);
      return created;
    } catch (error) {
      return randomId();
    }
  }

  var language = path.slice(1, -1).toLowerCase();
  var payload = {
    siteKey: siteKey,
    language: language,
    path: path,
    visitorId: getVisitorId()
  };

  fetch(apiBase + "/visit", {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    credentials: "omit",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(function (error) {
    console.warn("AKG visitor counter request failed:", error);
  });
})();
