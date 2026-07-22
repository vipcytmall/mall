(function () {
  "use strict";

  var LANGUAGES = [
    { code: "zh-tw", name: "繁體中文", native: "繁體中文", path: "/zh-tw/", flag: "tw" },
    { code: "zh-cn", name: "簡體中文", native: "简体中文", path: "/zh-cn/", flag: "cn" },
    { code: "en", name: "英文", native: "English", path: "/en/", flag: "us" },
    { code: "ja", name: "日文", native: "日本語", path: "/ja/", flag: "jp" },
    { code: "ko", name: "韓文", native: "한국어", path: "/ko/", flag: "kr" },
    { code: "ms", name: "馬來文", native: "Bahasa Melayu", path: "/ms/", flag: "my" },
    { code: "th", name: "泰文", native: "ภาษาไทย", path: "/th/", flag: "th" },
    { code: "vi", name: "越南文", native: "Tiếng Việt", path: "/vi/", flag: "vn" },
    { code: "id", name: "印尼文", native: "Bahasa Indonesia", path: "/id/", flag: "id" },
    { code: "ru", name: "俄文", native: "Русский", path: "/ru/", flag: "ru" },
    { code: "my", name: "緬甸文", native: "မြန်မာဘာသာ", path: "/my/", flag: "mm" },
    { code: "hi", name: "印地文", native: "हिन्दी", path: "/hi/", flag: "in" },
    { code: "mn", name: "蒙古文", native: "Монгол", path: "/mn/", flag: "mn" },
    { code: "km", name: "高棉文", native: "ភាសាខ្មែរ", path: "/km/", flag: "kh" },
    { code: "lo", name: "寮文", native: "ພາສາລາວ", path: "/lo/", flag: "la" }
  ];

  var tbody = document.getElementById("language-stats-body");
  var totalEl = document.getElementById("total-visits");
  var statusEl = document.getElementById("stats-status");
  var updatedEl = document.getElementById("last-updated");
  var refreshBtn = document.getElementById("refresh-stats");
  var configPanel = document.getElementById("config-warning");

  function getConfig() {
    var config = window.AKG_COUNTER || {};
    return {
      apiBase: String(config.apiBase || "").trim().replace(/\/+$/, ""),
      siteKey: String(config.siteKey || "vipcytmall-mall").trim()
    };
  }

  function configured(config) {
    return Boolean(
      /^https:\/\//i.test(config.apiBase) &&
      config.apiBase.indexOf("REPLACE-WITH-") === -1 &&
      /^[a-z0-9-]+$/i.test(config.siteKey)
    );
  }

  function formatCount(value) {
    return new Intl.NumberFormat("zh-TW").format(Number(value) || 0);
  }

  function renderRows(rows, total) {
    var max = Math.max.apply(null, rows.map(function (row) { return row.count; }).concat([1]));

    tbody.innerHTML = rows.map(function (row, index) {
      var width = Math.max(row.count > 0 ? 2 : 0, Math.round((row.count / max) * 100));
      var share = total > 0 ? ((row.count / total) * 100).toFixed(1) : "0.0";
      return '<tr>' +
        '<td class="rank">' + (index + 1) + '</td>' +
        '<td><div class="language-cell">' +
          '<img src="https://flagcdn.com/w40/' + row.flag + '.png" alt="" width="30" height="21" loading="lazy">' +
          '<div><strong>' + row.native + '</strong><small>' + row.name + '</small></div>' +
        '</div></td>' +
        '<td><a href=".' + row.path + '" target="_blank" rel="noopener">' + row.path + '</a></td>' +
        '<td class="count">' + formatCount(row.count) + '</td>' +
        '<td class="share">' + share + '%</td>' +
        '<td><div class="bar-track" aria-label="' + row.native + ' ' + formatCount(row.count) + '"><span style="width:' + width + '%"></span></div></td>' +
      '</tr>';
    }).join("");

    totalEl.textContent = formatCount(total);
  }

  function renderSkeleton(label) {
    tbody.innerHTML = LANGUAGES.map(function (lang, index) {
      return '<tr class="loading-row">' +
        '<td class="rank">' + (index + 1) + '</td>' +
        '<td><div class="language-cell"><img src="https://flagcdn.com/w40/' + lang.flag + '.png" alt="" width="30" height="21"><div><strong>' + lang.native + '</strong><small>' + lang.name + '</small></div></div></td>' +
        '<td>' + lang.path + '</td><td class="count">' + label + '</td><td>—</td><td><div class="bar-track"></div></td></tr>';
    }).join("");
  }

  async function loadStats() {
    var config = getConfig();
    if (!configured(config)) {
      configPanel.hidden = false;
      statusEl.textContent = "尚未設定 Cloudflare Worker 網址";
      totalEl.textContent = "—";
      renderSkeleton("尚未設定");
      return;
    }

    configPanel.hidden = true;
    refreshBtn.disabled = true;
    statusEl.textContent = "正在讀取 Cloudflare D1 統計…";
    renderSkeleton("載入中…");

    try {
      var url = config.apiBase + "/stats?siteKey=" + encodeURIComponent(config.siteKey) + "&_=" + Date.now();
      var response = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit"
      });
      if (!response.ok) throw new Error("HTTP " + response.status);

      var data = await response.json();
      var counts = data.languages || {};
      var rows = LANGUAGES.map(function (lang) {
        return Object.assign({}, lang, { count: Number(counts[lang.code]) || 0 });
      });
      var calculatedTotal = rows.reduce(function (sum, row) { return sum + row.count; }, 0);
      var total = Number(data.total);
      if (!Number.isFinite(total)) total = calculatedTotal;

      renderRows(rows, total);
      statusEl.textContent = "15 個語系已全部載入（近即時）";
      updatedEl.textContent = new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "medium", timeStyle: "medium"
      }).format(new Date());
    } catch (error) {
      console.error("Failed to load Cloudflare D1 statistics", error);
      statusEl.textContent = "統計 API 讀取失敗，請檢查 Worker 網址、D1 綁定與 CORS";
      totalEl.textContent = "—";
      renderSkeleton("讀取失敗");
    } finally {
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener("click", loadStats);
  loadStats();
})();
