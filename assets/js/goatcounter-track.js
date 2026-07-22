(function () {
  "use strict";

  var current = document.currentScript;
  var path = current && current.dataset ? current.dataset.akgPath : "";
  var config = window.AKG_STATS || {};
  var code = String(config.goatCounterCode || "").trim();

  if (!path || !/^\/[a-z0-9-]+\/$/.test(path)) {
    console.warn("AKG visitor counter: invalid or missing page path.");
    return;
  }

  if (!code || code === "CHANGE-ME" || !/^[a-z0-9-]+$/i.test(code)) {
    console.info("AKG visitor counter is not configured. Edit assets/js/goatcounter-config.js.");
    return;
  }

  // 使用固定語系路徑，避免 GitHub Pages 專案子目錄或 canonical 設定影響統計分類。
  window.goatcounter = Object.assign({}, window.goatcounter || {}, {
    path: path
  });

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = "https://" + code + ".goatcounter.com/count";
  script.referrerPolicy = "strict-origin-when-cross-origin";
  document.head.appendChild(script);
})();
