import {ContentAdmin} from './cms.mjs';
export {ContentAdmin};
const ORIGIN='https://algy-design99.github.io';
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store','Vary':'Origin'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export default {async fetch(request,env){
 const url=new URL(request.url),match=url.pathname.match(/^\/api\/threads\/(\d+)$/);
 if(url.pathname.startsWith('/api/admin'))return env.ADMIN.get(env.ADMIN.idFromName('content-admin-v1')).fetch(request);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(url.pathname==='/health')return reply({ok:true,service:'nekojiro-board-posts',cmsReady:(env.CMS_ADMIN_PASSWORD||'').length>=16&&!!env.CMS_GITHUB_TOKEN});
 if(!match)return reply({error:'Not found'},404);
 const thread=Number(match[1]);if(!Number.isSafeInteger(thread)||thread<1)return reply({error:'スレッドが見つかりません'},404);
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(request.method==='POST'){
  if(request.headers.get('Origin')!==ORIGIN)return reply({error:'投稿元を確認できません'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return reply({error:'JSONが必要です'},415);
  if(Number(request.headers.get('Content-Length'))>20000)return reply({error:'本文が長すぎます'},413);
 }
 const id=env.BOARD.idFromName('nekojiro-board-v1');return env.BOARD.get(id).fetch(request);
}};

export class BoardRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.ready=ctx.blockConcurrencyWhile(async()=>{let salt=await ctx.storage.get('salt');if(!salt){salt=crypto.randomUUID();await ctx.storage.put('salt',salt);}this.salt=salt;});}
 async fetch(request){
  await this.ready;const thread=Number(new URL(request.url).pathname.split('/').pop());
  if(request.method==='GET'){const rows=await this.ctx.storage.list({prefix:'post:'+thread+':',limit:500});return reply({comments:[...rows.values()].map(({ipHash,...row})=>row)});}
  let data;try{const text=await request.text();if(text.length>12000)return reply({error:'本文が長すぎます'},413);data=JSON.parse(text);}catch{return reply({error:'入力を確認してください'},400);}
  if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'入力を確認してください'},400);
  if(data.website)return reply({error:'投稿を受け付けられませんでした'},400);
  const name=String(data.name||'名無しさん').trim().slice(0,40)||'名無しさん',body=String(data.body||'').trim();
  if(!body||body.length>3000)return reply({error:'本文は1〜3000文字で入力してください'},400);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(this.salt+ip));const ipHash=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const now=Date.now(),record={id:crypto.randomUUID(),name,body,createdAt:new Date(now).toISOString(),ipHash};
  const result=await this.ctx.storage.transaction(async storage=>{
   const last=await storage.get('rate:'+ipHash);if(last&&now-last<60000)return {error:'連続投稿は1分ほど間をあけてください',status:429};
   const day=new Date(now).toISOString().slice(0,10),counterKey='daily:'+day,count=await storage.get(counterKey)||0;
   if(count>=500)return {error:'本日の投稿受付数に達しました。時間をおいてください',status:429};
   const threadCount=await storage.get('count:'+thread)||0;if(threadCount>=500)return {error:'このスレッドの投稿受付を終了しました',status:409};
   await storage.put({['rate:'+ipHash]:now,[counterKey]:count+1,['count:'+thread]:threadCount+1,['post:'+thread+':'+String(now)+':'+record.id]:record});return {ok:true};
  });
  if(result.error)return reply({error:result.error},result.status);const {ipHash:_,...publicRecord}=record;return reply({comment:publicRecord},201);
 }
}
