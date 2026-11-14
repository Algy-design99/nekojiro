'use strict';
(() => {
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let catalog,threadId=Number(params.get('thread')),page=0;
document.body.classList.toggle('neko-home-page',!threadId);
const configPromise=fetch('posting.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error('読み込みに失敗しました（'+r.status+'）');return r.json();}
async function bodies(){
 if('DecompressionStream'in window){const r=await fetch('threads.json.gz');if(!r.ok)throw Error('本文を取得できませんでした');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();}
 return getJSON('threads.json');
}
async function loadOriginalRails(){try{const response=await fetch('ads.html');if(!response.ok)return;const wrapper=document.createElement('div');wrapper.innerHTML=await response.text();const rails=wrapper.firstElementChild;if(!rails)return;document.getElementById('bbs').append(rails);const script=document.createElement('script');script.src='ads.js';document.body.append(script);}catch{}}
function link(text,url){const a=document.createElement('a');a.textContent=text;a.href=url;return a;}
function renderList(){
 const board=params.has('board')?Number(params.get('board')):null,q=(params.get('q')||'').normalize('NFKC').toLocaleLowerCase();
 const rows=catalog.threads.filter(t=>(board===null||t.category===board)&&(!q||t.title.normalize('NFKC').toLocaleLowerCase().includes(q)));
 const category=catalog.categories.find(c=>c.id===board);
 $('board-list-title').textContent=(category?category.name:q?'検索結果':'新着スレッド')+' ／ '+rows.length+'件';$('board-query').value=params.get('q')||'';
 $('board-rows').replaceChildren();
 if(!rows.length){const p=document.createElement('p');p.className='board-status';p.textContent='条件に合うスレッドがありません。';p.append(' ',link('すべて見る','./'));$('board-rows').append(p);}
 for(const t of rows.slice(page*30,(page+1)*30)){const row=document.createElement('div');row.className='thread-row';const a=link(t.title,'./?thread='+t.id);a.className='board-row-title';const meta=document.createElement('span');meta.className='thread-date';meta.textContent='['+t.category_name+']';row.append(a,meta);$('board-rows').append(row);}
 const pager=$('board-pagination');pager.replaceChildren();if(rows.length>30){for(const [label,delta]of[['← 前へ',-1],['次へ →',1]]){const button=document.createElement('button');button.textContent=label;button.disabled=page+delta<0||(page+delta)*30>=rows.length;button.onclick=()=>{page+=delta;renderList();$('board-list-title').scrollIntoView({block:'start'});};pager.append(button);}const label=document.createElement('span');label.textContent=(page+1)+' / '+Math.ceil(rows.length/30);pager.append(label);}
}
async function renderThread(){
 $('board-index').hidden=true;$('board-reading').hidden=false;$('board-title').textContent='読み込み中…';
 const post=(await bodies()).find(p=>p.id===threadId);if(!post)throw Error('このスレッドは見つかりませんでした。');
 document.title=post.title+' - 猫じろう掲示板';$('board-title').textContent=post.title;$('neko-original-posts').innerHTML=post.body;$('neko-comment-list').innerHTML=post.comments;
 $('board-back').href='./?board='+post.category;$('board-back').textContent='← '+post.category_name+'へ戻る';
 const at=catalog.threads.findIndex(p=>p.id===threadId),nav=$('board-neighbors');for(const [index,label]of[[at-1,'← 前のスレッド'],[at+1,'次のスレッド →']])if(catalog.threads[index])nav.append(link(label,'./?thread='+catalog.threads[index].id));
 if(location.hash){const id=decodeURIComponent(location.hash.slice(1));document.getElementById(id)?.scrollIntoView();}
 await enablePosting(post);
}
async function enablePosting(post){
 const config=await configPromise;if(!config?.api)return;
 const api=config.api.replace(/\/$/,'')+'/api/threads/'+post.id;
 async function refresh(){const r=await fetch(api,{cache:'no-store'});if(!r.ok)throw Error('閲覧者レスを取得できませんでした');const data=await r.json();const box=$('board-live-comments');box.replaceChildren();for(const comment of data.comments){const item=document.createElement('article');item.className='board-live-reply';item.id='reader-'+comment.id;const meta=document.createElement('div');meta.className='meta';meta.textContent=comment.name+'　'+new Date(comment.createdAt).toLocaleString('ja-JP');const body=document.createElement('p');body.textContent=comment.body;item.append(meta,body);box.append(item);}}
 try{await refresh();}catch(e){$('board-post-status').textContent=e.message;return;}
 $('board-post-status').textContent='名前を省略して投稿できます。';$('board-reply-form').hidden=false;
 $('board-reply-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
 try{const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.elements.name.value,body:form.elements.body.value,website:form.elements.website.value})});const data=await response.json();if(!response.ok)throw Error(data.error||'投稿できませんでした');form.elements.body.value='';$('board-post-status').textContent='投稿しました。';await refresh();}catch(error){$('board-post-status').textContent=error.message;}finally{button.disabled=false;}});
}
$('board-search').addEventListener('submit',event=>{event.preventDefault();const next=new URLSearchParams();if(params.has('board'))next.set('board',params.get('board'));const q=$('board-query').value.trim();if(q)next.set('q',q);location.href='./?'+next;});
getJSON('catalog.json').then(async data=>{catalog=data;if(threadId)await renderThread();else renderList();await loadOriginalRails();}).catch(error=>{const target=threadId?$('board-title'):$('board-rows');target.textContent=error.message;target.classList.add('board-error');});
})();
