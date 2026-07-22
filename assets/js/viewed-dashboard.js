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
  var resetBtn = document.getElementById("reset-stats");
  var configPanel = document.getElementById("config-warning");
  var resetModal = document.getElementById("reset-modal");
  var resetTokenInput = document.getElementById("reset-token");
  var resetMessage = document.getElementById("reset-message");
  var cancelResetBtn = document.getElementById("cancel-reset");
  var confirmResetBtn = document.getElementById("confirm-reset");
  var lastFocusedElement = null;

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
      refreshBtn.disabled = false;
      resetBtn.disabled = true;
      renderSkeleton("尚未設定");
      return;
    }

    configPanel.hidden = true;
    refreshBtn.disabled = true;
    resetBtn.disabled = true;
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
      resetBtn.disabled = false;
    }
  }

  function openResetModal() {
    var config = getConfig();
    if (!configured(config)) {
      statusEl.textContent = "尚未設定 Cloudflare Worker 網址，無法歸零";
      return;
    }
    lastFocusedElement = document.activeElement;
    resetTokenInput.value = "";
    resetMessage.textContent = "";
    confirmResetBtn.disabled = false;
    cancelResetBtn.disabled = false;
    resetModal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(function () { resetTokenInput.focus(); }, 0);
  }

  function closeResetModal() {
    if (confirmResetBtn.disabled) return;
    resetTokenInput.value = "";
    resetMessage.textContent = "";
    resetModal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  async function resetAllStats() {
    var config = getConfig();
    var token = resetTokenInput.value.trim();

    if (!configured(config)) {
      resetMessage.textContent = "尚未設定 Cloudflare Worker 網址。";
      return;
    }
    if (!token) {
      resetMessage.textContent = "請輸入 RESET_TOKEN。";
      resetTokenInput.focus();
      return;
    }

    confirmResetBtn.disabled = true;
    cancelResetBtn.disabled = true;
    resetMessage.textContent = "正在清除全部訪客統計…";

    try {
      var response = await fetch(config.apiBase + "/admin/reset", {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ siteKey: config.siteKey })
      });

      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.ok) {
        if (response.status === 401) throw new Error("歸零密碼錯誤，或 Worker 尚未設定 RESET_TOKEN。 ");
        if (response.status === 403) throw new Error("此網站來源未被 Worker 允許。 ");
        throw new Error("歸零失敗（HTTP " + response.status + "）。");
      }

      resetTokenInput.value = "";
      resetMessage.textContent = "歸零成功，正在重新載入統計…";
      statusEl.textContent = "全部訪客統計已歸零";

      window.setTimeout(async function () {
        resetModal.hidden = true;
        document.body.style.overflow = "";
        confirmResetBtn.disabled = false;
        cancelResetBtn.disabled = false;
        await loadStats();
      }, 450);
    } catch (error) {
      console.error("Failed to reset Cloudflare D1 statistics", error);
      resetMessage.textContent = error && error.message ? error.message : "歸零失敗，請稍後再試。";
      confirmResetBtn.disabled = false;
      cancelResetBtn.disabled = false;
      resetTokenInput.select();
    } finally {
      token = "";
    }
  }

  refreshBtn.addEventListener("click", loadStats);
  resetBtn.addEventListener("click", openResetModal);
  cancelResetBtn.addEventListener("click", closeResetModal);
  confirmResetBtn.addEventListener("click", resetAllStats);
  resetTokenInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") resetAllStats();
  });
  resetModal.addEventListener("click", function (event) {
    if (event.target === resetModal) closeResetModal();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !resetModal.hidden) closeResetModal();
  });

  loadStats();
})();
