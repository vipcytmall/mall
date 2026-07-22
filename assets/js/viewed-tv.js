(function () {
  "use strict";

  var REFRESH_INTERVAL_MS = 5000;
  var LANGUAGES = [
    { code: "zh-tw", name: "繁體中文", native: "繁體中文", flag: "tw" },
    { code: "zh-cn", name: "簡體中文", native: "简体中文", flag: "cn" },
    { code: "en", name: "英文", native: "English", flag: "us" },
    { code: "ja", name: "日文", native: "日本語", flag: "jp" },
    { code: "ko", name: "韓文", native: "한국어", flag: "kr" },
    { code: "ms", name: "馬來文", native: "Bahasa Melayu", flag: "my" },
    { code: "th", name: "泰文", native: "ภาษาไทย", flag: "th" },
    { code: "vi", name: "越南文", native: "Tiếng Việt", flag: "vn" },
    { code: "id", name: "印尼文", native: "Bahasa Indonesia", flag: "id" },
    { code: "ru", name: "俄文", native: "Русский", flag: "ru" },
    { code: "my", name: "緬甸文", native: "မြန်မာဘာသာ", flag: "mm" },
    { code: "hi", name: "印地文", native: "हिन्दी", flag: "in" },
    { code: "mn", name: "蒙古文", native: "Монгол", flag: "mn" },
    { code: "km", name: "高棉文", native: "ភាសាខ្មែរ", flag: "kh" },
    { code: "lo", name: "寮文", native: "ພາສາລາວ", flag: "la" }
  ];

  var grid = document.getElementById("tv-grid");
  var totalEl = document.getElementById("tv-total");
  var statusEl = document.getElementById("tv-status");
  var statusDot = document.getElementById("tv-status-dot");
  var updatedEl = document.getElementById("tv-updated");
  var clockEl = document.getElementById("tv-clock");
  var dateEl = document.getElementById("tv-date");
  var refreshBtn = document.getElementById("tv-refresh");
  var fullscreenBtn = document.getElementById("tv-fullscreen");
  var errorEl = document.getElementById("tv-error");
  var countdownEl = document.getElementById("tv-countdown");
  var loading = false;
  var secondsUntilRefresh = Math.ceil(REFRESH_INTERVAL_MS / 1000);
  var previousCounts = {};

  function getConfig() {
    var config = window.AKG_COUNTER || {};
    return {
      apiBase: String(config.apiBase || "").trim().replace(/\/+$/, ""),
      siteKey: String(config.siteKey || "vipcytmall-mall").trim()
    };
  }

  function isConfigured(config) {
    return Boolean(
      /^https:\/\//i.test(config.apiBase) &&
      config.apiBase.indexOf("REPLACE-WITH-") === -1 &&
      /^[a-z0-9-]+$/i.test(config.siteKey)
    );
  }

  function formatCount(value) {
    return new Intl.NumberFormat("zh-TW").format(Number(value) || 0);
  }

  function updateClock() {
    var now = new Date();
    clockEl.textContent = new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);
    dateEl.textContent = new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(now);
  }

  function renderLoading() {
    grid.innerHTML = LANGUAGES.map(function (lang, index) {
      return '<article class="card loading">' +
        '<div class="card-head"><div class="language">' +
        '<img class="flag" src="https://flagcdn.com/w80/' + lang.flag + '.png" alt="" loading="eager">' +
        '<div class="language-copy"><span class="native">' + lang.native + '</span><span class="zh-name">' + lang.name + '</span></div>' +
        '</div><span class="rank">#' + (index + 1) + '</span></div>' +
        '<div class="count">載入中</div>' +
        '<div class="bottom"><div class="bar"><span></span></div><span class="share">—</span></div>' +
        '</article>';
    }).join("");
  }

  function renderStats(counts, total) {
    var rows = LANGUAGES.map(function (lang) {
      return Object.assign({}, lang, { count: Number(counts[lang.code]) || 0 });
    });

    var ranking = rows.slice().sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return LANGUAGES.findIndex(function (x) { return x.code === a.code; }) -
             LANGUAGES.findIndex(function (x) { return x.code === b.code; });
    });

    var rankMap = {};
    ranking.forEach(function (row, index) { rankMap[row.code] = index + 1; });
    var max = Math.max.apply(null, rows.map(function (row) { return row.count; }).concat([1]));

    grid.innerHTML = rows.map(function (row) {
      var rank = rankMap[row.code];
      var width = row.count > 0 ? Math.max(3, Math.round((row.count / max) * 100)) : 0;
      var share = total > 0 ? ((row.count / total) * 100).toFixed(1) : "0.0";
      var rankClass = rank <= 3 ? " top-" + rank : "";
      return '<article class="card' + rankClass + '">' +
        '<div class="card-head"><div class="language">' +
        '<img class="flag" src="https://flagcdn.com/w80/' + row.flag + '.png" alt="" loading="eager">' +
        '<div class="language-copy"><span class="native">' + row.native + '</span><span class="zh-name">' + row.name + '</span></div>' +
        '</div><span class="rank">#' + rank + '</span></div>' +
        '<div class="count">' + formatCount(row.count) + '</div>' +
        '<div class="bottom"><div class="bar"><span style="width:' + width + '%"></span></div><span class="share">' + share + '%</span></div>' +
        '</article>';
    }).join("");

    totalEl.textContent = formatCount(total);
    rows.forEach(function (row) { previousCounts[row.code] = row.count; });
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusDot.classList.remove("live", "error");
    if (state) statusDot.classList.add(state);
  }

  async function loadStats() {
    if (loading) return;
    loading = true;
    secondsUntilRefresh = Math.ceil(REFRESH_INTERVAL_MS / 1000);
    refreshBtn.disabled = true;
    errorEl.hidden = true;

    var config = getConfig();
    if (!isConfigured(config)) {
      setStatus("尚未設定 Worker", "error");
      totalEl.textContent = "—";
      renderLoading();
      errorEl.textContent = "尚未設定 Cloudflare Worker 網址，請確認 assets/js/counter-config.js。";
      errorEl.hidden = false;
      loading = false;
      refreshBtn.disabled = false;
      return;
    }

    setStatus("正在更新…", "");
    try {
      var response = await fetch(
        config.apiBase + "/stats?siteKey=" + encodeURIComponent(config.siteKey) + "&_=" + Date.now(),
        {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          credentials: "omit"
        }
      );
      if (!response.ok) throw new Error("HTTP " + response.status);

      var data = await response.json();
      var counts = data.languages || {};
      var calculatedTotal = LANGUAGES.reduce(function (sum, lang) {
        return sum + (Number(counts[lang.code]) || 0);
      }, 0);
      var total = Number(data.total);
      if (!Number.isFinite(total)) total = calculatedTotal;

      renderStats(counts, total);
      var now = new Date();
      updatedEl.textContent = "最後更新：" + new Intl.DateTimeFormat("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(now);
      setStatus("即時連線中", "live");
    } catch (error) {
      console.error("TV wall statistics failed", error);
      setStatus("連線失敗", "error");
      errorEl.textContent = "無法讀取 Cloudflare D1 統計，將在 5 秒後自動重試。";
      errorEl.hidden = false;
    } finally {
      loading = false;
      refreshBtn.disabled = false;
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  }

  refreshBtn.addEventListener("click", loadStats);
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", function () {
    fullscreenBtn.textContent = document.fullscreenElement ? "✕" : "⛶";
    fullscreenBtn.title = document.fullscreenElement ? "離開全螢幕" : "切換全螢幕";
  });

  function updateCountdown() {
    if (loading) {
      countdownEl.textContent = "正在更新…";
      return;
    }
    countdownEl.textContent = "下次更新 " + secondsUntilRefresh + " 秒";
    secondsUntilRefresh -= 1;
    if (secondsUntilRefresh < 0) {
      secondsUntilRefresh = Math.ceil(REFRESH_INTERVAL_MS / 1000);
    }
  }

  renderLoading();
  updateClock();
  updateCountdown();
  loadStats();

  window.setInterval(updateClock, 1000);
  window.setInterval(updateCountdown, 1000);
  window.setInterval(function () {
    secondsUntilRefresh = Math.ceil(REFRESH_INTERVAL_MS / 1000);
    loadStats();
  }, REFRESH_INTERVAL_MS);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      secondsUntilRefresh = Math.ceil(REFRESH_INTERVAL_MS / 1000);
      loadStats();
    }
  });
})();
