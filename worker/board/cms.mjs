const ORIGIN='https://algy-design99.github.io';
const REPO='Algy-design99/nekojiro';
const SITES=['board','work','living','food','travel','craft'];
const encoder=new TextEncoder(),decoder=new TextDecoder();
const cors={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Vary':'Origin'};
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const b64=data=>btoa(String.fromCharCode(...data));
const un64=data=>Uint8Array.from(atob(data),x=>x.charCodeAt(0));
const url64=data=>b64(data).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const fromURL64=s=>un64(s.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(s.length/4)*4,'='));
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function session(secret,now=Date.now()){const payload=url64(encoder.encode(JSON.stringify({exp:now+7200000,nonce:crypto.randomUUID(),scope:'content-admin'})));return payload+'.'+url64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload))));}
export async function authorized(request,secret,now=Date.now()){try{const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');const parts=token.split('.');if(parts.length!==2)return false;const valid=await crypto.subtle.verify('HMAC',await key(secret),fromURL64(parts[1]),encoder.encode(parts[0]));const data=JSON.parse(decoder.decode(fromURL64(parts[0])));return valid&&data.scope==='content-admin'&&Number.isFinite(data.exp)&&data.exp>now&&data.exp<=now+7200000;}catch{return false;}}
async function sameSecret(a,b){const aa=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(a))),bb=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(b)));let mismatch=0;for(let i=0;i<aa.length;i++)mismatch|=aa[i]^bb[i];return mismatch===0;}
export function validKey(site,id){return SITES.includes(site)&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(String(id));}
export function validate(input){
 if(!input||typeof input!=='object'||!SITES.includes(input.site))throw Error('投稿先を選んでください。');
 const id=String(input.id||Date.now());if(!validKey(input.site,id)||(input.site==='board'&&(!/^\d+$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)<1)))throw Error('記事IDが不正です。');
 const title=String(input.title||'').trim(),body=String(input.body||'');
 if(!title||title.length>180)throw Error('タイトルは1〜180文字で入力してください。');
 if(!body.trim()||encoder.encode(body).length>384000)throw Error('本文は空欄にせず、384KB以内にしてください。');
 const category=input.site==='board'?Number(input.category):String(input.category||'').trim();
 if(input.site==='board'&&(!Number.isSafeInteger(category)||category<0))throw Error('板を選んでください。');
 if(typeof category==='string'&&(!category||category.length>80))throw Error('カテゴリを選んでください。');
 return {site:input.site,id,title,body,category,category_name:String(input.category_name||category).slice(0,80),baseRevision:Number(input.baseRevision||0)};
}
const ALLOWED=new Set('p br div span section article header footer h1 h2 h3 h4 h5 h6 ul ol li dl dt dd strong em b i u s small mark code pre blockquote a img figure figcaption table thead tbody tfoot tr th td caption hr details summary time'.split(' '));
export function sanitizeElement(el){
 if(['script','style','iframe','object','embed','form','input','button','textarea','select','svg','math','template','link','meta','base'].includes(el.tagName)){el.remove();return;}
 if(!ALLOWED.has(el.tagName)){el.removeAndKeepContent();return;}
 for(const [name,value]of [...el.attributes]){
  if(!['class','id','style','href','src','alt','title','width','height','colspan','rowspan','scope','open','datetime','start','type','target','rel','loading'].includes(name)){el.removeAttribute(name);continue;}
  if(name==='href'||name==='src'){
   const normalized=value.trim().replace(/[\u0000-\u0020]/g,'');
   const safe=/^(?:https?:\/\/|\.\.?\/|#)/i.test(normalized)||(name==='src'&&/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(normalized));
   if(!safe)el.removeAttribute(name);
  }
  if(name==='style'&&/(?:url\s*\(|expression\s*\(|@import|behavior\s*:|-moz-binding)/i.test(value))el.removeAttribute(name);
 }
 if(el.tagName==='a')el.setAttribute('rel','noopener noreferrer');
}
async function sanitize(body){return new HTMLRewriter().on('*',{element:sanitizeElement}).transform(new Response(body)).text();}
async function inputJSON(request,limit=600000){if(Number(request.headers.get('Content-Length'))>limit)throw Error('データが大きすぎます。');const raw=await request.text();if(encoder.encode(raw).length>limit)throw Error('データが大きすぎます。');return JSON.parse(raw);}
export class GitHub {
 constructor(token,fetcher=(...args)=>fetch(...args)){this.token=token;this.fetcher=fetcher;}
 async call(path,method='GET',body){const r=await this.fetcher('https://api.github.com/repos/'+REPO+'/'+path,{method,headers:{'Authorization':'Bearer '+this.token,'Accept':'application/vnd.github+json','User-Agent':'TSUKASA-Content-Admin','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(r.status===404)return null;if(!r.ok){const e=Error('GitHubの処理に失敗しました（'+r.status+'）。');e.status=r.status;throw e;}return r.status===204?{}:r.json();}
 async read(path){const d=await this.call('contents/'+path+'?ref=main');if(!d)return null;if(d.encoding!=='base64'||!d.content)throw Error('記事データを読み込めませんでした。');return JSON.parse(decoder.decode(un64(d.content.replace(/\s/g,''))));}
 async publish(path,document,assets=[]){
  for(let attempt=0;attempt<3;attempt++){
   const ref=await this.call('git/ref/heads/main');const parent=ref.object.sha;const commit=await this.call('git/commits/'+parent);
   const tree=await this.call('git/trees','POST',{base_tree:commit.tree.sha,tree:[{path,mode:'100644',type:'blob',content:JSON.stringify(document,null,2)},...assets]});
   const next=await this.call('git/commits','POST',{message:(document.status==='published'?'Publish':'Unpublish')+' '+document.site+'/'+document.id,tree:tree.sha,parents:[parent]});
   try{await this.call('git/refs/heads/main','PATCH',{sha:next.sha,force:false});return next.sha;}catch(e){if(![409,422].includes(e.status)||attempt===2)throw e;}
  }
 }
}
export class ContentAdmin {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.github=new GitHub(env.CMS_GITHUB_TOKEN);}
 async body(site,id,meta){const parts=[];for(let i=0;i<(meta.chunks||0);i++)parts.push(await this.ctx.storage.get('draft-body:'+site+':'+id+':'+i)||'');return parts.join('');}
 async fetch(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url),path=url.pathname.replace('/api/admin','');
  if((this.env.CMS_ADMIN_PASSWORD||'').length<16||!this.env.CMS_GITHUB_TOKEN)return json({error:'管理画面の接続設定がまだ完了していません。'},503);
  if(request.headers.get('Origin')!==ORIGIN)return json({error:'管理画面から操作してください。'},403);
  try{
   if(path==='/login'&&request.method==='POST'){
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(ip)));const rateKey='login:'+url64(digest);const state=await this.ctx.storage.get(rateKey)||{count:0,until:0};
    if(state.until>Date.now()&&state.count>=5)return json({error:'ログイン試行が多いため、15分ほど待ってください。'},429);
    const data=await inputJSON(request,2000);if(!await sameSecret(String(data.password||''),this.env.CMS_ADMIN_PASSWORD)){await this.ctx.storage.put(rateKey,{count:state.until>Date.now()?state.count+1:1,until:Date.now()+900000});return json({error:'パスワードが違います。'},401);}
    await this.ctx.storage.delete(rateKey);return json({token:await session(this.env.CMS_ADMIN_PASSWORD),expiresIn:7200});
   }
   if(!await authorized(request,this.env.CMS_ADMIN_PASSWORD))return json({error:'ログインしてください。'},401);
   if(path==='/options'&&request.method==='GET'){const catalog=await this.github.read('board/catalog.json');return json({sites:SITES,boards:catalog.categories});}
   if(path==='/list'&&request.method==='GET'){
    const site=url.searchParams.get('site')||'board';if(!SITES.includes(site))return json({error:'投稿先が不正です。'},400);
    const published=await this.github.read('content/'+site+'/index.json')||[];const drafts=await this.ctx.storage.list({prefix:'draft-meta:'+site+':',limit:1000});const merged=new Map(published.map(x=>[String(x.id),x]));for(const meta of drafts.values()){const live=merged.get(meta.id);merged.set(meta.id,{...live,...meta,status:meta.status==='publishing'&&live?.status==='published'&&live.revision>=meta.revision?'published':meta.status});}return json({articles:[...merged.values()].filter(x=>x.status!=='trash').map(({chunks,...x})=>x)});
   }
   const site=url.searchParams.get('site'),id=url.searchParams.get('id');
   if(path==='/article'&&request.method==='GET'){
    if(!validKey(site,id))return json({error:'記事が不正です。'},400);const meta=await this.ctx.storage.get('draft-meta:'+site+':'+id);if(meta)return json({...meta,body:await this.body(site,id,meta)});const article=await this.github.read('content/'+site+'/'+id+'.json');return article?json(article):json({error:'記事が見つかりません。'},404);
   }
   if(path==='/image'&&request.method==='GET'){
    const imageId=url.searchParams.get('id');if(!/^[0-9a-f-]{36}$/.test(imageId||''))return json({error:'画像が不正です。'},400);const meta=await this.ctx.storage.get('image-meta:'+imageId);if(!meta)return json({error:'画像がありません。'},404);let encoded='';for(let i=0;i<meta.chunks;i++)encoded+=await this.ctx.storage.get('image-body:'+imageId+':'+i)||'';return new Response(un64(encoded),{headers:{...cors,'Content-Type':meta.type}});
   }
   if(path==='/draft'&&request.method==='PUT'){
    const doc=validate(await inputJSON(request));const prefix='draft-meta:'+doc.site+':'+doc.id;const old=await this.ctx.storage.get(prefix);const remote=old?null:await this.github.read('content/'+doc.site+'/'+doc.id+'.json');const existing=old||remote;const expected=existing?.revision||0;if(doc.baseRevision!==expected)return json({error:'別の更新があります。記事を開き直してください。'},409);
    const chunks=[];for(let i=0;i<doc.body.length;i+=12000)chunks.push(doc.body.slice(i,i+12000));const {body,baseRevision,...fields}=doc;const preserved=Object.fromEntries(['comments','legacyDate','order'].filter(k=>k in (existing||{})).map(k=>[k,existing[k]]));const meta={...preserved,...fields,status:'draft',createdAt:existing?existing.createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),revision:expected+1,chunks:chunks.length,wasPublished:old?.wasPublished||remote?.status==='published'||false};
    await this.ctx.storage.transaction(async storage=>{const latest=await storage.get(prefix);if((latest?.revision||remote?.revision||0)!==expected)throw Error('別の更新があります。記事を開き直してください。');for(let i=0;i<chunks.length;i++)await storage.put('draft-body:'+doc.site+':'+doc.id+':'+i,chunks[i]);await storage.put(prefix,meta);});return json(meta);
   }
   if(path==='/publish'&&request.method==='POST'){
    const req=await inputJSON(request,4000);if(!validKey(req.site,req.id))return json({error:'記事が不正です。'},400);const k='draft-meta:'+req.site+':'+req.id,meta=await this.ctx.storage.get(k);if(!meta||meta.revision!==req.revision)return json({error:'下書きを保存してから公開してください。'},409);
    let body=await this.body(req.site,req.id,meta);const imageIds=[...new Set([...body.matchAll(/cms-image:\/\/([0-9a-f-]{36})/g)].map(m=>m[1]))];if(imageIds.length>8)return json({error:'画像は1記事につき8枚までです。'},400);const assets=[];
    for(const imageId of imageIds){const image=await this.ctx.storage.get('image-meta:'+imageId);if(!image)throw Error('下書き画像が見つかりません。画像を追加し直してください。');let encoded='';for(let i=0;i<image.chunks;i++)encoded+=await this.ctx.storage.get('image-body:'+imageId+':'+i)||'';const blob=await this.github.call('git/blobs','POST',{content:encoded,encoding:'base64'});const imagePath='media/'+imageId+'.'+image.ext;assets.push({path:imagePath,mode:'100644',type:'blob',sha:blob.sha});body=body.replaceAll('cms-image://'+imageId,ORIGIN+'/nekojiro/'+imagePath);}
    body=await sanitize(body);const {chunks,wasPublished,...fields}=meta;const doc={...fields,body,status:'published',publishedAt:new Date().toISOString()};const sha=await this.github.publish('content/'+req.site+'/'+req.id+'.json',doc,assets);
    const latest=await this.ctx.storage.get(k);if(latest?.revision===meta.revision)await this.ctx.storage.put(k,{...meta,status:'publishing',wasPublished:true,publishCommit:sha});return json({commit:sha,status:'publishing',message:'公開処理を受け付けました。サイトへの反映を待っています。'});
   }
   if((path==='/unpublish'||path==='/delete')&&request.method==='POST'){
    const req=await inputJSON(request,4000);if(!validKey(req.site,req.id))return json({error:'記事が不正です。'},400);const k='draft-meta:'+req.site+':'+req.id;let meta=await this.ctx.storage.get(k);const remote=await this.github.read('content/'+req.site+'/'+req.id+'.json');let commit=null;if((meta?.revision??remote?.revision??0)!==req.revision)return json({error:'別の更新があります。記事を開き直してください。'},409);
    if(remote?.status==='published'){
     if(!meta){const {body,...rest}=remote;const chunks=[];for(let i=0;i<body.length;i+=12000)chunks.push(body.slice(i,i+12000));meta={...rest,chunks:chunks.length,wasPublished:true};for(let i=0;i<chunks.length;i++)await this.ctx.storage.put('draft-body:'+req.site+':'+req.id+':'+i,chunks[i]);}
     commit=await this.github.publish('content/'+req.site+'/'+req.id+'.json',{site:req.site,id:String(req.id),status:'unpublished',updatedAt:new Date().toISOString(),revision:meta.revision});
    }
    if(!meta)return json({error:'記事が見つかりません。'},404);await this.ctx.storage.put(k,{...meta,status:path==='/delete'?'trash':'draft',updatedAt:new Date().toISOString()});return json({status:path==='/delete'?'trash':'draft',commit,message:commit?'非公開処理を受け付けました。':'下書きを更新しました。'});
   }
   if(path==='/image'&&request.method==='POST'){
    const data=await inputJSON(request,3000000);const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'},ext=types[data.type];if(!ext||typeof data.base64!=='string')return json({error:'PNG・JPEG・WebP・GIF画像を選んでください。'},400);
    const bytes=un64(data.base64);if(!bytes.length||bytes.length>2097152)return json({error:'画像は2MB以内にしてください。'},400);
    const magic=(ext==='png'&&bytes[0]===137&&bytes[1]===80)||(ext==='jpg'&&bytes[0]===255&&bytes[1]===216)||(ext==='gif'&&decoder.decode(bytes.slice(0,3))==='GIF')||(ext==='webp'&&decoder.decode(bytes.slice(0,4))==='RIFF'&&decoder.decode(bytes.slice(8,12))==='WEBP');if(!magic)return json({error:'画像形式を確認できません。'},400);
    const imageId=crypto.randomUUID(),chunks=[];for(let i=0;i<data.base64.length;i+=60000)chunks.push(data.base64.slice(i,i+60000));for(let i=0;i<chunks.length;i++)await this.ctx.storage.put('image-body:'+imageId+':'+i,chunks[i]);await this.ctx.storage.put('image-meta:'+imageId,{type:data.type,ext,chunks:chunks.length,createdAt:new Date().toISOString()});return json({id:imageId,url:'cms-image://'+imageId});
   }
   return json({error:'Not found'},404);
  }catch(error){return json({error:error.status?'外部サービスへの保存に失敗しました。時間をおいて再試行してください。':error.message||'処理に失敗しました。'},error.status||400);}
 }
}
