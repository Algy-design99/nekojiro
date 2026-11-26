'use strict';
(()=>{
const $=id=>document.getElementById(id),ORIGIN='https://algy-design99.github.io/nekojiro/';let api=location.origin+'/console',token='console-session',current=null,articles=[],boards=[],busy=false,dirty=false;const blobURLs=[];
let researchEnabled=false, draftTimer, changeVersion=0;
const labels={draft:'下書き',published:'公開中',publishing:'反映待ち',local:'この端末の下書き',unpublished:'非公開'};
const themes={research:['歴史','企業','テクノロジー','投資','社会','その他'],work:['ほどく','整える','試す'],living:['空間','動線','居場所'],food:['一杯','ひと皿','ひと息'],travel:['街歩き','食と店','風景'],craft:['使う','比べる','作る']};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function localKey(site,id){return 'tsukasa-cms-draft:'+site+':'+id;}
const researchSelected=()=>$('site').value==='research';
const researchEditor=createResearchEditor({
 onChange:editorChanged,
 upload:async file=>{
  if(!token||!researchEnabled)throw Error('画像ファイルのアップロードには管理者ログインが必要です。画像URLはログイン前でも使えます。');
  return uploadImage(file);
 },
 fetchImage:async src=>{
  if(!token)return null;
  const response=await fetch(api+'/api/admin/image?id='+encodeURIComponent(src.slice(12)),{headers:{Authorization:'Bearer '+token}});
  return response.ok?await response.blob():null;
 },
 report:message,
});
function bodyHTML(){if(researchSelected())return researchEditor.body();return rawBodyHTML();}
function rawBodyHTML(){const value=$('body').value;return $('format').value==='html'?value:value.split(/\n\s*\n/).map(p=>'<p>'+esc(p).replaceAll('\n','<br>')+'</p>').join('\n');}
function documentValue(){return {site:$('site').value,id:current?.id||String(Date.now()),title:$('title').value.trim(),category:$('site').value==='board'?Number($('category').value):$('category').value,category_name:$('category').selectedOptions[0]?.textContent||'',body:bodyHTML(),baseRevision:current?.revision||0};}
function documentRaw(){return researchSelected()?bodyHTML():$('body').value;}
function localSave(){if(!current||!dirty)return;try{const payload=documentValue();const data={...payload,rawBody:researchSelected()?payload.body:$('body').value,format:researchSelected()?'html':$('format').value,updatedAt:new Date().toISOString(),revision:current.revision||0,status:'local'};localStorage.setItem(localKey(data.site,data.id),JSON.stringify(data));if(researchSelected())researchEditor.status('この端末に保存済み');}catch{if(researchSelected())researchEditor.status('端末への保存に失敗');message('この端末の保存容量が不足しています。「下書きをファイル保存」を使ってください。',true);}}
function updateButtons(){const connected=token&&($('site').value!=='research'||researchEnabled);$('publish').textContent=current&&(current.wasPublished||['published','publishing'].includes(current.status))?'更新する':'公開する';for(const id of ['save','publish','unpublish','delete'])$(id).disabled=!connected||busy;$('image').disabled=!connected||busy;$('login-button').disabled=!api||busy;}
$('copy-public-link').onclick=()=>action(async()=>{
 await navigator.clipboard.writeText(publicURL());message('記事URLをコピーしました。');
});
function showPublicLink(visible){
 const doc=current;
 const url=visible?publicURL():null;
 const show=()=>{
  $('public-link').hidden=false;
  $('public-link').href=url;
  $('copy-public-link').hidden=doc.site!=='research';
 };
 $('public-link').hidden=true;
 $('copy-public-link').hidden=true;
 if(!url)return;
 if(doc.site==='board'){show();return;}
 checkPagesLink(doc,url,show);
}

async function checkPagesLink(doc,url,show){
 for(let attempt=0;attempt<15&&current===doc;attempt++){
  try{
   const response=await fetch(url,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(current!==doc||!['published','publishing'].includes(doc.status))return;
   if(response.ok){
    show();
    if(doc.status==='publishing')$('article-state').textContent='公開ページに接続済み';
    return;
   }
  }catch{}
  if(current!==doc||!['published','publishing'].includes(doc.status))return;
  $('article-state').textContent='公開ページの反映を確認中';
  await new Promise(resolve=>setTimeout(resolve,8000));
 }
 if(current===doc&&['published','publishing'].includes(doc.status)){
  $('article-state').textContent='公開ページを確認できません。時間をおいて記事を開き直してください';
 }
}
function publicURL(){if(current.site==='research')return new URL('research/archives/managed-'+current.id+'.html',ORIGIN).href;return ORIGIN+current.site+'/'+(current.site==='board'?'?thread='+current.id:current.id+'.html');}
function categories(value){const list=$('site').value==='board'?[{id:0,name:'未分類'},...boards.filter(b=>b.id!==0)]:themes[$('site').value].map(n=>({id:n,name:n}));$('category').replaceChildren();for(const item of list){const o=document.createElement('option');o.value=item.id;o.textContent=item.name;$('category').append(o);}if(value!==undefined){if(![...$('category').options].some(o=>o.value===String(value))){const o=document.createElement('option');o.value=String(value);o.textContent=String(value);$('category').append(o);}$('category').value=String(value);}$('category-label').textContent=$('site').value==='board'?'板':'カテゴリ';}
function show(doc){clearTimeout(draftTimer);changeVersion++;dirty=doc.status==='local';current={...doc,id:String(doc.id),revision:doc.revision||0};$('title').value=doc.title||'';$('body').value=doc.rawBody??doc.body??'';$('format').value=doc.format||'html';researchEditor.load(researchSelected(),rawBodyHTML(),current.id);categories(doc.category);$('editor-heading').textContent=doc.title?'記事の編集':'新しい記事';$('article-state').textContent=labels[doc.status]||'下書き';$('preview-area').hidden=true;showPublicLink(['published','publishing'].includes(doc.status));updateButtons();}
function newArticle(){show({site:$('site').value,id:String(Date.now()),title:'',body:'',format:'plain',category:$('site').value==='board'?12:themes[$('site').value][0],status:'local',revision:0});}
async function request(path,{method='GET',data}={}){
 let response;
 try{
  response=await fetch(api+'/api/admin'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});
 }catch{
  localSave();
  throw Error('管理サーバーに接続できません。通信を確認し、入力内容は画面を閉じる前に下書きファイルにも保存してください。');
 }
 if(response.status===401){
  localSave();
  throw Error('管理画面のログインが切れました。このタブは閉じず、別のタブで管理画面にログインしてから操作をやり直してください。');
 }
 let output;
 try{output=await response.json();}catch{
  if(response.status===413)throw Error('送信内容が大きすぎます。本文に埋め込んだ画像があれば、画像のアップロード機能を使ってください。');
  if(response.status===403)throw Error('管理画面からの操作を確認できませんでした。この管理画面を直接開き直してください。');
  throw Error('管理サーバーから読み取れない応答が返りました（HTTP '+response.status+'）。少し待ってからもう一度お試しください。');
 }
 if(!response.ok)throw Error(output?.error||'処理に失敗しました（HTTP '+response.status+'）。');
 return output;
}

function displayList(){const q=$('search').value.normalize('NFKC').toLowerCase();$('article-list').replaceChildren();for(const doc of articles.filter(x=>(x.title||'').normalize('NFKC').toLowerCase().includes(q))){const li=document.createElement('li'),button=document.createElement('button'),small=document.createElement('small');button.type='button';button.textContent=doc.title||'無題';small.textContent=(labels[doc.status]||doc.status)+' · '+(doc.category_name||doc.category||'');button.append(small);button.onclick=()=>openArticle(doc);li.append(button);$('article-list').append(li);}}
async function list(){try{let data;if(token&&($('site').value!=='research'||researchEnabled))data=(await request('/list?site='+encodeURIComponent($('site').value))).articles;else{const r=await fetch(ORIGIN+'content/'+$('site').value+'/index.json',{cache:'no-store'});data=r.ok?await r.json():[];}
 const merged=new Map(data.map(x=>[String(x.id),x]));for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('tsukasa-cms-draft:'+$('site').value+':')){try{const local=JSON.parse(localStorage.getItem(k));if(!merged.has(String(local.id))||(local.updatedAt||'')>(merged.get(String(local.id)).updatedAt||''))merged.set(String(local.id),local);}catch{}}}articles=[...merged.values()].sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));$('list-note').textContent=articles.length+'件 · '+(token?'公開記事と保存済み下書き':'公開記事とこの端末の下書き');displayList();}catch(e){message(e.message,true);}}
async function openArticle(doc){localSave();try{if(doc.status==='local'){show(doc);return;}let data;if(token&&(doc.site!=='research'||researchEnabled))data=await request('/article?site='+doc.site+'&id='+doc.id);else{let r;if(api&&doc.site==='board')r=await fetch(api+'/api/content/article?site=board&id='+encodeURIComponent(doc.id),{cache:'no-store'});if(r?.status===410)throw Error('この記事は非公開です。ログインして開いてください。');if(!r?.ok)r=await fetch(ORIGIN+'content/'+doc.site+'/'+doc.id+'.json',{cache:'no-store'});if(!r.ok)throw Error('記事を開けませんでした。');data=await r.json();}show(data);}catch(e){message(e.message,true);}}
const previewViewport=$('preview-viewport');
new ResizeObserver(([entry])=>{
 const width=entry.contentRect.width;
 if(width>0)previewViewport.style.setProperty('--desktop-scale',Math.min(1,width/1100));
}).observe(previewViewport);
document.querySelectorAll('[data-preview-width]').forEach(button=>button.onclick=()=>{
 const width=button.dataset.previewWidth;
 $('preview-frame').dataset.width=width;
 document.querySelectorAll('[data-preview-width]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
});
async function researchPreview(body){
 const url=new URL('research/archives/15930697.html',ORIGIN);
 const response=await fetch(url);
 if(!response.ok)throw Error('調査室のプレビューを読み込めませんでした。');
 const page=new DOMParser().parseFromString(await response.text(),'text/html');
 page.querySelectorAll('script,iframe,object,embed,form').forEach(el=>el.remove());
 const base=page.createElement('base');base.href=url.href;page.head.prepend(base);
 const csp=page.createElement('meta');csp.httpEquiv='Content-Security-Policy';
 csp.content="default-src 'none'; style-src 'unsafe-inline' "+url.origin+"; img-src "+url.origin+" https: data: blob:; base-uri "+url.origin;
 page.head.prepend(csp);
 page.title=$('title').value||'無題';
 page.querySelector('.reading-header h1').textContent=page.title;
 const time=page.querySelector('.reading-header time');
 time.dateTime=new Date().toISOString();time.textContent=new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'});
 page.querySelector('.reading-label').textContent=$('category').value;
 page.querySelector('.reading-body').innerHTML=body;
 page.querySelectorAll('.side a').forEach(link=>link.removeAttribute('href'));
 return '<!doctype html>'+page.documentElement.outerHTML;
}
async function preview(){for(const u of blobURLs)URL.revokeObjectURL(u);blobURLs.length=0;const parsed=new DOMParser().parseFromString(bodyHTML(),'text/html');parsed.querySelectorAll('script,iframe,object,embed,form,link,meta,base').forEach(x=>x.remove());parsed.querySelectorAll('*').forEach(el=>{for(const a of [...el.attributes])if(a.name.startsWith('on')||(['href','src'].includes(a.name)&&/^\s*javascript:/i.test(a.value)))el.removeAttribute(a.name);});
 for(const image of parsed.querySelectorAll('img')){const src=image.getAttribute('src')||'';if(src.startsWith('cms-image://')&&token){try{const r=await fetch(api+'/api/admin/image?id='+encodeURIComponent(src.slice(12)),{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error();const u=URL.createObjectURL(await r.blob());blobURLs.push(u);image.src=u;}catch{image.alt='下書き画像を取得できません';image.removeAttribute('src');}}}
 const research=researchSelected();
 const check=$('research-preview-check');
 check.hidden=!research;
 if(research){
  const issues=researchEditor.issues();
  if(!$('title').value.trim())issues.unshift('タイトルが未入力');
  if(!hasContent({site:'research',title:'preview',body:parsed.body.innerHTML}))issues.unshift('本文が未入力');
  check.textContent=issues.length?'確認項目 · '+issues.join(' / '):'画像の説明と本文内リンクを確認済み';
 }
 const card=$('research-card-preview');
 card.hidden=!research;
 if(research){
  const image=parsed.querySelector('.research-cover img[src]')||parsed.querySelector('img[src]');
  const heading=document.createElement('strong');heading.textContent='記事カードのプレビュー';
  const title=document.createElement('p');title.textContent=$('title').value||'無題';
  card.replaceChildren(heading);
  if(image)card.append(image.cloneNode());
  card.append(title);
 }
 $('preview-widths').hidden=!research;
 $('preview-note').textContent=research?'PCとスマホの表示幅を切り替えられます。':'本文の確認用です。';
 if(!research)delete $('preview-frame').dataset.width;
 else $('preview-frame').dataset.width=document.querySelector('[data-preview-width][aria-pressed=true]').dataset.previewWidth;
 $('preview-frame').srcdoc=research?await researchPreview(parsed.body.innerHTML):'<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data: blob:; style-src \'unsafe-inline\'"><style>body{font:16px/1.85 system-ui,sans-serif;color:#26343c;margin:24px;overflow-wrap:anywhere}img{max-width:100%;height:auto}h1{font-size:25px}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ccc;padding:7px}blockquote{border-left:3px solid #adbfc6;padding-left:15px;color:#60717b}.res{margin-bottom:18px}.meta{font-size:13px;color:#466754}</style><h1>'+esc($('title').value)+'</h1>'+parsed.body.innerHTML;$('preview-area').hidden=false;$('preview-area').scrollIntoView({behavior:'smooth',block:'start'});}
function editorChanged(){
 dirty=true;changeVersion++;localSave();
 if(!researchSelected()||!researchEnabled||!token)return;
 clearTimeout(draftTimer);
 draftTimer=setTimeout(autoSaveResearch,1800);
}
function autoSaveResearch(){
 if(!dirty||!researchSelected()||!researchEnabled||!token)return;
 if(busy){draftTimer=setTimeout(autoSaveResearch,1000);return;}
 const payload=documentValue();
 if(!hasContent(payload))return;
 action(async()=>{await save();await list();});
}
function hasContent(payload){
 if(!payload.title)return false;
 if(payload.site!=='research')return !!$('body').value.trim();
 const body=new DOMParser().parseFromString(payload.body,'text/html').body;
 body.querySelectorAll('.research-toc,.research-cover,.research-sources').forEach(node=>node.remove());
 return !!(body.textContent.trim()||body.querySelector('img'));
}
async function save(){
 const payload=documentValue(), version=changeVersion;
 if(!hasContent(payload))throw Error('タイトルと本文を入力してください。');
 localSave();
 if(researchSelected())researchEditor.status('サーバーに保存中…');
 const d=await request('/draft',{method:'PUT',data:payload});
 if(current?.id!==payload.id||current.site!==payload.site)return d;
 current={...current,...d};
 $('article-state').textContent=labels.draft;
 if(version===changeVersion){
  dirty=false;localStorage.removeItem(localKey(current.site,current.id));
  if(researchSelected())researchEditor.status('サーバーに保存済み');
 }else{
  localSave();
 }
 return d;
}
async function action(fn){if(busy)return;busy=true;updateButtons();try{await fn();}catch(e){if(researchSelected())researchEditor.status('エラー · 保存状況を確認してください');message(e.message,true);}finally{busy=false;updateButtons();}}
$('editor-form').addEventListener('submit',e=>e.preventDefault());$('editor-form').addEventListener('input',event=>{if(!$('research-editor').contains(event.target))editorChanged();});$('search').addEventListener('input',displayList);$('new').onclick=()=>{localSave();newArticle();message('新しい下書きを作成します。');};$('reload').onclick=list;$('site').onchange=()=>{newArticle();list();};$('preview').onclick=()=>action(preview);$('close-preview').onclick=()=>{$('preview-area').hidden=true;};
$('save').onclick=()=>action(async()=>{await save();await list();message('下書きを非公開の保存先へ保存しました。');});
$('publish').onclick=()=>action(async()=>{const question=current.wasPublished||['published','publishing'].includes(current.status)?'この記事を更新しますか？':'この記事を公開しますか？';const issues=researchSelected()?researchEditor.issues():[];if(!confirm([question,...issues].join('\n')))return;const saved=await save();if(dirty||current.id!==String(saved.id)||current.site!==saved.site)throw Error('編集内容が変わりました。もう一度公開を押してください。');const r=await request('/publish',{method:'POST',data:{site:current.site,id:current.id,revision:current.revision}});current.status=r.status;$('article-state').textContent=labels[r.status]||r.status;showPublicLink(true);message(r.message);await list();});
for(const name of ['unpublish','delete'])$(name).onclick=()=>action(async()=>{if(!confirm(name==='delete'?'この記事を公開先から外し、管理画面の一覧から削除しますか？':'この記事を非公開にしますか？'))return;const r=await request('/'+name,{method:'POST',data:{site:current.site,id:current.id,revision:current.revision}});localStorage.removeItem(localKey(current.site,current.id));await list();if(name==='delete')newArticle();else{current.status='draft';$('article-state').textContent=labels.draft;current.wasPublished=false;showPublicLink(false);}message(r.message);});
$('logout').onclick=async()=>{const response=await fetch('/console/logout',{method:'POST'});if(response.ok||response.status===401)location.reload();else message('ログアウトできませんでした。');};
$('export').onclick=()=>{localSave();const data={...documentValue(),rawBody:documentRaw(),format:researchSelected()?'html':$('format').value,status:'draft',revision:current?.revision||0};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=($('title').value.trim()||'下書き').replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('下書きファイルを保存しました。');};
$('import').onchange=()=>action(async()=>{const file=$('import').files[0];if(!file)return;if(file.size>600000)throw Error('原稿ファイルは600KB以内にしてください。');const raw=await file.text();if(file.name.endsWith('.json')){const d=JSON.parse(raw);if(!['board',...Object.keys(themes)].includes(d.site)||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(String(d.id)))throw Error('この下書き形式には対応していません。');$('site').value=d.site;show(d);await list();}else{const doc=new DOMParser().parseFromString(raw,'text/html');if(!$('title').value)$('title').value=doc.title||doc.querySelector('h1')?.textContent||'';$('body').value=/\.html?$/i.test(file.name)?doc.body.innerHTML:raw;$('format').value=/\.html?$/i.test(file.name)?'html':'plain';if(researchSelected())researchEditor.load(true,rawBodyHTML(),current.id);}editorChanged();message('原稿を読み込みました。プレビューで確認してください。');$('import').value='';});
async function uploadImage(file){if(file.size>2097152)throw Error('画像は2MB以内にしてください。');const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const r=await request('/image',{method:'POST',data:{type:file.type,base64}});return r.url;}
$('image').onchange=()=>action(async()=>{const file=$('image').files[0];if(!file)return;const src=await uploadImage(file);if($('format').value==='plain'){$('body').value=bodyHTML();$('format').value='html';}$('body').value+='\n<figure><img src="'+esc(src)+'" alt="'+esc(file.name)+'"></figure>';dirty=true;localSave();message('非公開の下書き画像を本文末尾に追加しました。');$('image').value='';});
const editParams=new URLSearchParams(location.search),editSite=editParams.get('site'),editId=editParams.get('id');
async function openRequestedArticle(){if(!['board',...Object.keys(themes)].includes(editSite)||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(editId||''))return;$('site').value=editSite;const local=localStorage.getItem(localKey(editSite,editId));if(local){try{show(JSON.parse(local));await list();return;}catch{}}await openArticle({site:editSite,id:editId});await list();}
async function init(){
 try {
  const options=await request('/options');
  researchEnabled=options.sites.includes('research');
  boards=options.boards;
 } catch(error) { message(error.message); }
 $('logout').hidden=false;
 $('connection-label').textContent='ログイン済み';
 $('connection-note').textContent='公開・非公開下書きを管理できます。';
 if(['board',...Object.keys(themes)].includes(editSite))$('site').value=editSite;
 newArticle();updateButtons();await list();await openRequestedArticle();
}
init();
})();
