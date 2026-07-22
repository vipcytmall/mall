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

  function getCode() {
    return String((window.AKG_STATS || {}).goatCounterCode || "").trim();
  }

  function configured(code) {
    return Boolean(code && code !== "CHANGE-ME" && /^[a-z0-9-]+$/i.test(code));
  }

  function endpoint(code, path) {
    return "https://" + code + ".goatcounter.com/counter/" + encodeURIComponent(path) + ".json";
  }

  function parseCount(value) {
    var n = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function formatCount(value) {
    return new Intl.NumberFormat("zh-TW").format(value);
  }

  async function fetchCount(code, path) {
    var response = await fetch(endpoint(code, path), { cache: "no-store" });
    if (response.status === 404) return 0;
    if (!response.ok) throw new Error("HTTP " + response.status);
    var data = await response.json();
    return parseCount(data.count);
  }

  function renderRows(rows) {
    var max = Math.max.apply(null, rows.map(function (row) { return row.count; }).concat([1]));
    var total = rows.reduce(function (sum, row) { return sum + row.count; }, 0);

    tbody.innerHTML = rows.map(function (row, index) {
      var width = row.error ? 0 : Math.max(2, Math.round((row.count / max) * 100));
      var share = total > 0 ? ((row.count / total) * 100).toFixed(1) : "0.0";
      var countText = row.error ? "讀取失敗" : formatCount(row.count);
      return '<tr>' +
        '<td class="rank">' + (index + 1) + '</td>' +
        '<td><div class="language-cell">' +
          '<img src="https://flagcdn.com/w40/' + row.flag + '.png" alt="" width="30" height="21" loading="lazy">' +
          '<div><strong>' + row.native + '</strong><small>' + row.name + '</small></div>' +
        '</div></td>' +
        '<td><a href=".' + row.path + '" target="_blank" rel="noopener">' + row.path + '</a></td>' +
        '<td class="count ' + (row.error ? 'error' : '') + '">' + countText + '</td>' +
        '<td class="share">' + (row.error ? '—' : share + '%') + '</td>' +
        '<td><div class="bar-track" aria-label="' + row.native + ' ' + countText + '"><span style="width:' + width + '%"></span></div></td>' +
      '</tr>';
    }).join("");

    totalEl.textContent = formatCount(total);
  }

  function renderSkeleton() {
    tbody.innerHTML = LANGUAGES.map(function (lang, index) {
      return '<tr class="loading-row">' +
        '<td class="rank">' + (index + 1) + '</td>' +
        '<td><div class="language-cell"><img src="https://flagcdn.com/w40/' + lang.flag + '.png" alt="" width="30" height="21"><div><strong>' + lang.native + '</strong><small>' + lang.name + '</small></div></div></td>' +
        '<td>' + lang.path + '</td><td class="count">載入中…</td><td>—</td><td><div class="bar-track"></div></td></tr>';
    }).join("");
  }

  async function loadStats() {
    var code = getCode();
    if (!configured(code)) {
      configPanel.hidden = false;
      statusEl.textContent = "尚未設定 GoatCounter code";
      totalEl.textContent = "—";
      renderSkeleton();
      return;
    }

    configPanel.hidden = true;
    refreshBtn.disabled = true;
    statusEl.textContent = "正在讀取 15 個語系資料…";
    renderSkeleton();

    var results = await Promise.all(LANGUAGES.map(async function (lang) {
      try {
        var count = await fetchCount(code, lang.path);
        return Object.assign({}, lang, { count: count, error: false });
      } catch (error) {
        console.error("Failed to load", lang.path, error);
        return Object.assign({}, lang, { count: 0, error: true });
      }
    }));

    renderRows(results);
    var failures = results.filter(function (row) { return row.error; }).length;
    statusEl.textContent = failures ? ("完成，但有 " + failures + " 個語系讀取失敗") : "15 個語系已全部載入";
    updatedEl.textContent = new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "medium", timeStyle: "medium"
    }).format(new Date());
    refreshBtn.disabled = false;
  }

  refreshBtn.addEventListener("click", loadStats);
  loadStats();
})();
