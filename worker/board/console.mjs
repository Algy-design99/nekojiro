import {authorized} from './cms.mjs';

const PUBLIC_ORIGIN = 'https://algy-design99.github.io';
const COOKIE = '__Secure-neko-console';
const SESSION = '; Path=/console/; Secure; HttpOnly; SameSite=Strict';
const types = new Map([
  ['/console/', 'index.html'],
  ['/console/style.css', 'style.css'],
  ['/console/admin.js', 'admin.js'],
  ['/console/research-editor.js', 'research-editor.js'],
]);

function response(body, status, extra = {}) {
  return new Response(body, {status, headers: {
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    ...extra,
  }});
}

function login(status = 401, error = '') {
  return response(`<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>管理者ログイン</title>
<style>body{font:1rem/1.7 Meiryo,system-ui,sans-serif;background:#f4f7f5;color:#18312b;margin:0;padding:2rem 1rem}main{max-width:28rem;margin:auto;background:white;border:1px solid #d5e1db;border-radius:.6rem;padding:1.4rem}label{display:block}input,button{font:inherit;padding:.5rem;min-height:2.75rem;box-sizing:border-box}input{width:100%;margin-bottom:.75rem}button{background:#175e4b;color:white;border:0;border-radius:.3rem;padding-inline:1rem}p{color:#8b352b}</style>
<main><h1>管理者ログイン</h1><p aria-live="polite">${error}</p><form method="post"><label for="password">管理者パスワード</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>ログイン</button></form></main></html>`, status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  });
}

function cookieToken(request) {
  return request.headers.get('Cookie')?.split(/;\s*/).find(x => x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
}

function adminService(env) {
  return env.ADMIN.get(env.ADMIN.idFromName('content-admin-v1'));
}

export async function consoleResponse(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const isHome = path === '/console/';
  const isAPI = /^\/console\/api\/(admin|content)\//.test(path);
  const apiError = (status, error) => response(JSON.stringify({error}),status,{'Content-Type':'application/json; charset=utf-8'});
  if (path === '/console') return response(null, 308, {Location: '/console/'+url.search});
  if ((env.CMS_ADMIN_PASSWORD || '').length < 16 || !env.CMS_GITHUB_TOKEN) {
    return isAPI ? apiError(503,'管理サーバーは一時的に利用できません。') : response('Service unavailable', 503);
  }
  const isRead = request.method === 'GET' || request.method === 'HEAD';
  if (!isRead && request.headers.get('Origin') !== url.origin) {
    return isHome ? login(403, 'このページを開き直してからログインしてください。') : isAPI ? apiError(403,'この管理画面を直接開いて操作してください。') : response('Forbidden', 403);
  }

  if (isHome && request.method === 'POST') {
    if (Number(request.headers.get('Content-Length')) > 4096) return response('Payload too large', 413);
    if (!(request.headers.get('Content-Type') || '').startsWith('application/x-www-form-urlencoded')) return response('Unsupported media type',415);
    const body = await request.text();
    if (body.length > 4096) return response('Payload too large',413);
    const password = new URLSearchParams(body).get('password') || '';
    const result = await adminService(env).fetch(new Request(new URL('/api/admin/login',url), {
      method:'POST',
      headers:{Origin:PUBLIC_ORIGIN,'Content-Type':'application/json','CF-Connecting-IP':request.headers.get('CF-Connecting-IP') || 'unknown'},
      body:JSON.stringify({password}),
    }));
    if (!result.ok) return login(result.status, result.status === 429 ? 'しばらく待ってからもう一度お試しください。' : 'ログインできませんでした。');
    const {token} = await result.json();
    return response(null,303,{Location:'/console/'+url.search,'Set-Cookie':COOKIE+'='+token+SESSION+'; Max-Age=7200'});
  }
  const token = cookieToken(request);
  const auth = new Request(url, {headers:{Authorization:'Bearer '+token}});
  if (!token || !await authorized(auth,env.CMS_ADMIN_PASSWORD)) return isHome && isRead ? login() : isAPI ? apiError(401,'ログインし直してください。') : response('Unauthorized',401);
  if (path === '/console/logout' && request.method === 'POST') {
    return response(null,204,{'Set-Cookie':COOKIE+'='+SESSION+'; Max-Age=0'});
  }
  if (/^\/console\/api\/(admin|content)\//.test(path)) {
    if (path === '/console/api/admin/login') return response('Not found',404);
    const target = new URL(path.slice('/console'.length)+url.search,url);
    const headers = new Headers({Origin:PUBLIC_ORIGIN, Authorization:'Bearer '+token});
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type',contentType);
    const result = await adminService(env).fetch(new Request(target,{method:request.method,headers,body:isRead ? null : request.body,duplex:'half'}));
    return response(result.body,result.status,{'Content-Type':result.headers.get('Content-Type') || 'application/json'});
  }
  if (!isRead || !types.has(path)) return response('Not found',404);
  const asset = await env.CONSOLE_ASSETS.fetch(new Request(new URL('/secured/'+types.get(path),url),{method:request.method}));
  return response(asset.body,asset.status,{'Content-Type':asset.headers.get('Content-Type') || 'application/octet-stream'});
}