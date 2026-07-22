/**
 * AKG Cloudflare D1 訪客統計設定
 *
 * 部署 Cloudflare Worker 後，只需把 apiBase 改成 Worker 的完整網址，
 * 例如：https://vipcytmall-visit.example.workers.dev
 */
window.AKG_COUNTER = Object.freeze({
  apiBase: "https://vipcytmall-visit.vipyctmall.workers.dev",
  siteKey: "vipcytmall-mall"
});
