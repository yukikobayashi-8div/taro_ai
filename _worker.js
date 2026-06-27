// 簡易アクセス認証(⑯) — taro-ai 公開サイト(Cloudflare Workers Static Assets)用エントリ。
// 方針: トークン方式。?key=<token> でCookie発行 → 以降はCookieで通す。未認証は簡易ログイン画面。
// フェイルオープン: 環境変数 SITE_TOKEN 未設定なら従来どおり全公開(=設定するまでサイトを壊さない)。
//   トークン設定:  cd cron-dispatch相当ではなく公開リポのWorker → `wrangler secret put SITE_TOKEN`
//   (または Cloudflareダッシュボードの Variables で SITE_TOKEN を設定)
// 注意: noindex/robots は従来どおり。トークンはURL共有で配布する想定の「簡易」認証。

const COOKIE = "taro_auth";

function loginHTML() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>AI太郎の競馬予想</title>
<style>
 body{font-family:system-ui,'Hiragino Sans',sans-serif;background:#0f172a;color:#e2e8f0;
   display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
 .box{background:#1e293b;padding:28px 22px;border-radius:14px;max-width:320px;width:88%;
   text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.4)}
 h2{margin:0 0 6px;font-size:18px} p{color:#94a3b8;font-size:13px;margin:6px 0 12px}
 input{width:100%;padding:11px;border-radius:9px;border:1px solid #334155;background:#0f172a;
   color:#e2e8f0;margin:8px 0;box-sizing:border-box;font-size:15px}
 button{width:100%;padding:11px;border-radius:9px;border:0;background:#0d9488;color:#fff;
   font-weight:700;font-size:15px;cursor:pointer}
 .err{color:#fca5a5;font-size:12px;min-height:16px}
</style></head><body>
<div class="box">
  <h2>🏇 AI太郎の競馬予想</h2>
  <p>アクセスキーを入力してやんす</p>
  <form onsubmit="var v=document.getElementById('k').value;if(v){location.href='?key='+encodeURIComponent(v)}return false">
    <input id="k" type="password" placeholder="アクセスキー" autocomplete="off" autofocus>
    <button type="submit">入る</button>
  </form>
</div></body></html>`;
}

export default {
  async fetch(req, env) {
    const token = env.SITE_TOKEN;
    // フェイルオープン: 未設定なら従来どおり全公開
    if (!token) return env.ASSETS.fetch(req);

    const url = new URL(req.url);
    // Workerソース等の内部ファイルは露出させない
    if (url.pathname.startsWith("/_worker")) return new Response("Not found", { status: 404 });

    const key = url.searchParams.get("key");
    const cookie = req.headers.get("cookie") || "";
    const hasCookie = cookie.split(/;\s*/).includes(`${COOKIE}=${token}`);

    if (key === token) {
      // 正しいkey → Cookie発行し、keyを除いたURLへリダイレクト(URLにkeyを残さない)
      url.searchParams.delete("key");
      return new Response(null, {
        status: 302,
        headers: {
          "Location": url.pathname + (url.search || ""),
          "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      });
    }
    if (hasCookie) return env.ASSETS.fetch(req);

    return new Response(loginHTML(), {
      status: 401,
      headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  },
};
