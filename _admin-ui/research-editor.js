'use strict';

window.createResearchEditor = function createResearchEditor({onChange, upload, fetchImage, report}) {
  const $ = (id) => document.getElementById(id);
  const editor = $('research-body');
  const panel = $('research-editor');
  const raw = $('body');
  const format = $('format');
  const dialog = $('research-dialog');
  const fields = $('research-dialog-fields');
  const apply = $('research-dialog-apply');
  const coverState = $('research-cover-state');
  const toc = $('research-toc');
  const allowed = new Set('p br div span section article header footer h1 h2 h3 h4 h5 h6 ul ol li dl dt dd strong em b i u s strike small mark code pre blockquote a img figure figcaption table thead tbody tfoot tr th td caption hr details summary time sup sub'.split(' '));
  const drop = 'script,style,iframe,object,embed,form,svg,math,template,link,meta,base';
  const attributes = new Set('class id href src alt title width height colspan rowspan scope open datetime start type target rel loading'.split(' '));
  const emojis = [
    ['🐾','肉球 猫 paw'],['🐈','猫 cat'],['🔎','検索 調査 search'],['📌','ピン pin'],['💡','発見 ヒント idea'],['⚠️','注意 warning'],['✅','確認 check'],['❌','バツ 誤り cross'],['📚','本 資料 books'],['📝','メモ note'],['📊','グラフ chart'],['💰','お金 投資 money'],['🏢','会社 企業 office'],['💻','パソコン 技術 computer'],['🕰️','時計 歴史 clock'],['🌏','地球 社会 world'],['☕','コーヒー coffee'],['🍵','お茶 tea'],['😺','猫 笑顔 cat'],['😊','笑顔 smile'],['🤔','考える thinking'],['👀','見る eyes'],['🔥','火 hot'],['✨','キラキラ sparkle'],['🎉','お祝い celebrate'],['👍','いいね like'],['🙏','ありがとう thanks'],['🔗','リンク link'],['📷','写真 camera'],['📍','場所 location'],['❓','疑問 question'],['➡️','右 矢印 arrow'],['⭐','星 star'],
  ];
  let range, cover, sourceMode = false, active = false, documentId, action, catalog;
  let cursorTimer;
  const imageBlobs=new Map();

  function loadList(key) {
    try { return JSON.parse(localStorage.getItem('research-editor:'+key)) || []; }
    catch { return []; }
  }

  function storeList(key, values) {
    try { localStorage.setItem('research-editor:'+key, JSON.stringify(values)); } catch {}
  }

  function element(tag, text, attrs = {}) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  }

  function safeUrl(value, image = false) {
    const url = value.trim();
    const normalized = url.replace(/[\u0000-\u0020]/g, '');
    return /^(https?:\/\/|\.\.?\/|#)/i.test(normalized) ||
      (image && /^(cms-image:\/\/[0-9a-f-]{36}$|data:image\/(png|jpeg|webp|gif);base64,)/i.test(normalized)) ? url : '';
  }

  function clean(html) {
    const body = new DOMParser().parseFromString(html, 'text/html').body;
    body.querySelectorAll(drop).forEach(node => node.remove());
    for (const node of body.querySelectorAll('*')) {
      if (!allowed.has(node.localName)) { node.replaceWith(...node.childNodes); continue; }
      const draftImage=node.getAttribute('data-draft-image');
      for (const attr of [...node.attributes]) {
        if (!attributes.has(attr.name) || ((attr.name === 'src' || attr.name === 'href') && !safeUrl(attr.value, attr.name === 'src'))) node.removeAttribute(attr.name);
      }
      if (node.localName==='img' && /^cms-image:\/\/[0-9a-f-]{36}$/.test(draftImage||''))node.setAttribute('src',draftImage);
      if (node.localName === 'a') node.rel = 'noopener noreferrer';
    }
    return body;
  }

  function hydrate(){
    for(const image of editor.querySelectorAll('img[src^="cms-image://"]')){
      const src=image.getAttribute('src');
      if(!imageBlobs.has(src)){
        const pending=fetchImage(src).then(blob=>blob?URL.createObjectURL(blob):null).catch(()=>null);
        imageBlobs.set(src,pending);
        pending.then(url=>{if(!url)imageBlobs.delete(src);});
      }
      imageBlobs.get(src).then(url=>{
        if(!url||!image.isConnected||image.getAttribute('src')!==src)return;
        image.dataset.draftImage=src;
        image.src=url;
      });
    }
  }

  function stableHeadings(body) {
    const ids = new Set([...body.querySelectorAll('[id]')].filter(node => !/^h[2-6]$/.test(node.localName)).map(node => node.id));
    return [...body.querySelectorAll('h2,h3,h4,h5,h6')].filter(node => !node.closest('.research-sources')).map(heading => {
      if (!heading.id || ids.has(heading.id)) heading.id = 'section-'+crypto.randomUUID().slice(0,12);
      ids.add(heading.id);
      return heading;
    });
  }

  function numberSources(body) {
    const sources = [...body.querySelectorAll('.research-sources li[id]')];
    const numbers = new Map();
    for (const ref of body.querySelectorAll('a.research-citation[href^="#source-"]')) {
      const id = ref.getAttribute('href').slice(1);
      if (!sources.some(source => source.id === id)) continue;
      if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
      ref.textContent = '['+numbers.get(id)+']';
    }
    for (const source of sources) {
      if (!numbers.has(source.id)) numbers.set(source.id, numbers.size + 1);
    }
    const list = sources[0]?.parentElement;
    if (list) sources.sort((a,b)=>numbers.get(a.id)-numbers.get(b.id)).forEach(source=>list.append(source));
  }

  function savedBody() {
    const html = sourceMode ? raw.value : editor.innerHTML;
    const body = clean(html);
    body.querySelectorAll('.research-toc,.research-cover').forEach(node=>node.remove());
    const headings = stableHeadings(body);
    numberSources(body);
    if (toc.checked && headings.length) {
      const details = element('details', undefined, {class:'research-toc'});
      const list = element('ol');
      details.append(element('summary','目次'),list);
      for (const heading of headings) {
        const row = element('li',undefined,{class:'toc-'+heading.localName});
        row.append(element('a',heading.textContent,{href:'#'+heading.id}));
        list.append(row);
      }
      body.prepend(details);
    }
    if (cover) {
      const figure = element('figure',undefined,{class:'research-cover'});
      figure.append(element('img',undefined,{src:cover.src,alt:cover.alt}));
      body.append(figure);
    }
    return body.innerHTML;
  }

  function status(text) { $('research-save-state').textContent = text; }

  function updateCover() { coverState.textContent = cover ? 'カード画像を指定済み' : '本文の先頭画像を記事カードに使用します。'; }

  function changed() {
    if (!sourceMode) stableHeadings(editor);
    status('保存中…');
    onChange();
  }

  function noteSelection() {
    const selection = getSelection();
    if (!active || sourceMode || !selection.rangeCount || !editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
    range = selection.getRangeAt(0).cloneRange();
    const point = range.cloneRange();
    point.selectNodeContents(editor);
    point.setEnd(range.startContainer,range.startOffset);
    const offset = point.toString().length;
    clearTimeout(cursorTimer);
    const id=documentId;
    cursorTimer=setTimeout(()=>{try{localStorage.setItem('research-editor:cursor:'+id,String(offset));}catch{}},280);
  }

  function restoreSelection() {
    editor.focus();
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function restoreCursor() {
    let offset = 0;
    try { offset = Number(localStorage.getItem('research-editor:cursor:'+documentId)); } catch {}
    const walker = document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode()){
      if(offset<=node.length){range=document.createRange();range.setStart(node,offset);range.collapse(true);return;}
      offset-=node.length;
    }
  }

  function execute(command, value) {
    restoreSelection();
    document.execCommand(command,false,value);
    noteSelection();
    changed();
  }

  function insert(node) { execute('insertHTML',node.outerHTML); }

  function field(label, name, type = 'text', value = '') {
    const title = element('label',label,{for:'research-field-'+name});
    const input = element('input',undefined,{id:'research-field-'+name,type});
    if (type !== 'file') input.value = value;
    fields.append(title,input);
    return input;
  }

  function showDialog(title) {
    noteSelection();
    fields.replaceChildren(element('h3',title));
    dialog.setAttribute('aria-label',title);
    apply.hidden = false;
    apply.textContent = '挿入する';
    apply.disabled = false;
    action = null;
    dialog.showModal();
  }

  function emojiDialog() {
    const search = field('絵文字を検索','emoji','search');
    const favorite = element('label','お気に入りを編集 ');
    const edit = element('input',undefined,{type:'checkbox'});
    edit.style.width='auto';
    favorite.append(edit);
    const list = element('div',undefined,{class:'editor-tools emoji-list'});
    fields.append(favorite,list);
    apply.hidden=true;
    const render = () => {
      list.replaceChildren();
      const favorites=loadList('favorites');
      const ordered=[...new Set([...favorites,...loadList('recent'),...emojis.map(row=>row[0])])];
      for(const emoji of ordered){
        const key=emojis.find(row=>row[0]===emoji)?.[1]||'';
        if(![emoji,key].join(' ').includes(search.value.trim().toLowerCase()))continue;
        const button=element('button',emoji,{type:'button',title:key,'aria-label':emoji+' '+key});
        if(edit.checked)button.setAttribute('aria-pressed',String(favorites.includes(emoji)));
        button.onclick=()=>{
          if(edit.checked){
            storeList('favorites',favorites.includes(emoji)?favorites.filter(item=>item!==emoji):[emoji,...favorites]);
            render();
          } else {
            storeList('recent',[emoji,...loadList('recent').filter(item=>item!==emoji)].slice(0,16));
            dialog.close();
            execute('insertText',emoji);
          }
        };
        list.append(button);
      }
    };
    search.oninput=render;
    edit.onchange=render;
    render();
  }

  async function imageDialog(asCover, file) {
    const selected = field('写真を選ぶ','file','file');
    selected.accept='image/png,image/jpeg,image/webp,image/gif';
    const url=field('画像URL','image-url','url',asCover && cover?.src?.startsWith('http')?cover.src:'');
    const alt=field('画像の説明（代替テキスト）','alt','text',asCover?cover?.alt||'':'');
    const caption=asCover?null:field('キャプション','caption');
    const credit=asCover?null:field('画像の出典','credit');
    if(file)fields.append(element('p',file.name));
    if(asCover){
      apply.textContent='設定する';
      const remove=element('button','カード画像の指定を解除',{type:'button'});
      remove.onclick=()=>{cover=null;updateCover();changed();dialog.close();};
      fields.append(remove);
    }
    action=async()=>{
      const chosen=selected.files[0]||file;
      const src=chosen?await upload(chosen):safeUrl(url.value,true)||(asCover&&!url.value&&cover?.src);
      if(!src)throw Error('画像ファイルか有効な画像URLを指定してください。');
      if(asCover){cover={src,alt:alt.value};updateCover();changed();return;}
      const figure=element('figure');
      figure.append(element('img',undefined,{src,alt:alt.value}));
      if(caption.value||credit.value)figure.append(element('figcaption',[caption.value,credit.value&&'出典 '+credit.value].filter(Boolean).join(' · ')));
      insert(figure);
      hydrate();
    };
  }

  async function openTool(kind, file) {
    if(dialog.open)return;
    const titles={emoji:'絵文字',image:'本文に画像を入れる',cover:'記事カード画像',link:'リンク',table:'表',note:'囲み枠',source:'出典を登録',internal:'過去記事リンク',anchor:'見出しリンク'};
    if(kind==='mark'){
      const mark=element('mark',range?.toString()||'強調する文章');
      insert(mark);
      return;
    }
    showDialog(titles[kind]);
    if(kind==='emoji'){emojiDialog();return;}
    if(kind==='image'||kind==='cover'){await imageDialog(kind==='cover',file);return;}
    if(kind==='link'||kind==='source'){
      const label=field(kind==='source'?'資料名':'リンクの文字','label','text',range?.toString()||'');
      const url=field('URL','url','url');
      const date=kind==='source'?field('確認日','date','date',new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})):null;
      action=()=>{
        const href=safeUrl(url.value);
        if(!href)throw Error('有効なURLを入力してください。');
        const link=element('a',label.value.trim()||href,{href});
        if(kind==='link'){insert(link);return;}
        const id='source-'+crypto.randomUUID().slice(0,12);
        let list=editor.querySelector('.research-sources ol');
        if(!list){const section=element('section',undefined,{class:'research-sources'});list=element('ol');section.append(element('h2','出典'),list);editor.append(section);}
        const item=element('li',undefined,{id});
        item.append(link);
        if(date.value)item.append(document.createTextNode('（確認日 '+date.value+'）'));
        list.append(item);
        const ref=element('a','['+list.children.length+']',{href:'#'+id,class:'research-citation'});

        if(range&&list.parentElement.contains(range.commonAncestorContainer)){
          range=document.createRange();range.setStartBefore(list.parentElement);range.collapse(true);
        } else if(!range) {
          range=document.createRange();range.setStartBefore(list.parentElement);range.collapse(true);
        }
        if(range&&!range.collapsed)range.collapse(false);
        insert(ref);
        numberSources(editor);
        changed();
      };
      return;
    }
    if(kind==='note'){
      const type=element('select',undefined,{'aria-label':'囲み枠の種類'});
      for(const value of ['要点','補足','注意'])type.append(element('option',value));
      fields.append(type);
      action=()=>{const box=element('blockquote',undefined,{class:'research-note'});box.append(element('strong',type.value),element('p',range?.toString()||'ここに入力'));insert(box);};
      return;
    }
    if(kind==='table'){
      const rows=field('行数','rows','number','3');
      const columns=field('列数','columns','number','2');
      action=()=>{
        const r=Number(rows.value),c=Number(columns.value);
        if(!Number.isInteger(r)||!Number.isInteger(c)||r<2||r>15||c<1||c>8)throw Error('行は2〜15、列は1〜8で指定してください。');
        const table=element('table',undefined,{class:'research-table'}),body=element('tbody');
        for(let i=0;i<r;i++){const row=element('tr');for(let j=0;j<c;j++)row.append(element(i?'td':'th',i?'入力':'見出し'));body.append(row);}
        table.append(body);
        insert(table);
      };
      return;
    }
    if(kind==='anchor'){
      const pick=element('select',undefined,{'aria-label':'見出し'});
      for(const heading of stableHeadings(editor))pick.append(element('option',heading.textContent,{value:heading.id}));
      fields.append(pick);
      apply.textContent='リンクをコピー';
      apply.disabled=!pick.options.length;
      action=async()=>{
        const url=new URL('../research/archives/managed-'+documentId+'.html',location.href);url.hash=pick.value;
        await navigator.clipboard.writeText(url.href);
        report('公開時の見出しリンクをコピーしました。');
      };
      return;
    }
    const search=field('記事タイトルを検索','search','search');
    const results=element('div',undefined,{class:'editor-tools'});
    fields.append(results);
    apply.hidden=true;
    try {
      if(!catalog){
        const response=await fetch('../research/');
        if(!response.ok)throw Error('記事一覧を取得できませんでした。');
        const index=new DOMParser().parseFromString(await response.text(),'text/html');
        catalog=[...index.querySelectorAll('.report-card h3 a')].map(node=>({title:node.textContent,url:'./'+node.getAttribute('href').split('/').pop()}));
      }
      const render=()=>{
        results.replaceChildren();
        const query=search.value.trim().normalize('NFKC').toLowerCase();
        for(const post of catalog.filter(item=>item.title.normalize('NFKC').toLowerCase().includes(query)).slice(0,16)){
          const button=element('button',post.title,{type:'button'});
          button.onclick=()=>{dialog.close();insert(element('a',range?.toString()||post.title,{href:post.url}));};
          results.append(button);
        }
        if(!results.childElementCount)results.append(element('p','該当する記事がありません。'));
      };
      search.oninput=render;
      render();
    }catch(error){fields.append(element('p',error.message));}
  }

  apply.onclick=async()=>{
    if(!action)return;
    apply.disabled=true;
    try{
      dialog.close();
      await action();
    }catch(error){
      report(error.message,true);
      if(!dialog.open)dialog.showModal();
      fields.querySelector('.dialog-error')?.remove();
      fields.append(element('p',error.message,{class:'dialog-error',role:'alert'}));
    }finally{apply.disabled=false;}
  };
  $('research-dialog-cancel').onclick=()=>dialog.close();
  document.addEventListener('selectionchange',noteSelection);
  editor.addEventListener('focus',()=>{
    const selection=getSelection();
    if(range&&(!selection.rangeCount||!editor.contains(selection.anchorNode)))restoreSelection();
  });
  editor.addEventListener('input',changed);
  toc.onchange=changed;
  panel.addEventListener('pointerdown',event=>{if(event.target.closest('.editor-tools button'))noteSelection();});
  panel.addEventListener('click',event=>{
    const button=event.target.closest('[data-command],[data-insert]');
    if(!button)return;
    if(button.dataset.command)execute(button.dataset.command,button.dataset.value);
    else openTool(button.dataset.insert).catch(error=>report(error.message,true));
  });

  function pastedImage(file) { openTool('image',file).catch(error=>report(error.message,true)); }
  editor.addEventListener('paste',event=>{
    event.preventDefault();
    const file=[...event.clipboardData.files].find(item=>item.type.startsWith('image/'));
    if(file){pastedImage(file);return;}
    const html=event.clipboardData.getData('text/html');
    if(html&&!$('research-plain-paste').checked)execute('insertHTML',clean(html).innerHTML);
    else execute('insertText',event.clipboardData.getData('text/plain'));
  });
  editor.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();});
  editor.addEventListener('drop',event=>{
    if(!event.dataTransfer.files.length)return;
    event.preventDefault();
    const point=document.caretRangeFromPoint?.(event.clientX,event.clientY);
    if(point&&editor.contains(point.startContainer))range=point;
    const file=[...event.dataTransfer.files].find(item=>item.type.startsWith('image/'));
    if(file)pastedImage(file);
  });
  function updateRawLabel() {
    const html = active ? sourceMode : format.value === 'html';
    $('body-label').textContent = html ? '本文のHTMLコード' : '本文';
    $('body-mode-hint').hidden = raw.hidden;
    $('body-mode-hint').textContent = html
      ? 'この欄にHTMLコードを貼り付け、下の「プレビュー」で表示を確認します。'
      : 'HTMLコードを貼る場合は、入力形式で「HTMLコードを貼り付ける」を選びます。';
    raw.placeholder = html ? '<p>本文</p>' : '本文を入力';
  }
  format.addEventListener('change', updateRawLabel);

  function displayMode() {
    raw.hidden=active&&!sourceMode;
    $('body-label').hidden=active&&!sourceMode;
    $('research-body-label').hidden=sourceMode;
    updateRawLabel();
    format.closest('label').hidden=active;
    $('image').closest('label').hidden=active;
    editor.hidden=sourceMode;
    panel.querySelectorAll('[data-command],[data-insert]').forEach(button=>button.disabled=sourceMode);
    $('rich-html-toggle').setAttribute('aria-pressed',String(sourceMode));
    $('rich-html-toggle').textContent=sourceMode?'見たまま編集に戻る':'HTMLコードを貼り付ける';
  }
  $('rich-html-toggle').onclick=()=>{
    if(!sourceMode){
      raw.value=clean(editor.innerHTML).innerHTML;
      format.value='html';
      sourceMode=true;
    }else{
      const body=clean(raw.value);
      body.querySelectorAll('.research-toc,.research-cover').forEach(node=>node.remove());
      editor.innerHTML=body.innerHTML;
      sourceMode=false;
      range=null;
      stableHeadings(editor);
      hydrate();
    }
    displayMode();
    if (sourceMode) raw.focus();
    else editor.focus();
  };

  function load(enabled,html,id) {
    active=enabled;
    panel.hidden=!enabled;
    sourceMode=false;
    range=null;
    cover=null;
    documentId=id;
    if(enabled){
      const body=clean(html);
      const image=body.querySelector('.research-cover img[src]');
      if(image)cover={src:image.getAttribute('src'),alt:image.alt};
      toc.checked=!!body.querySelector('.research-toc')||!body.textContent.trim();
      body.querySelectorAll('.research-toc,.research-cover').forEach(node=>node.remove());
      stableHeadings(body);
      editor.innerHTML=body.innerHTML;
      updateCover();
      hydrate();
      restoreCursor();
      status('変更するとこの端末に自動保存します。');
    }
    displayMode();
  }

  function issues() {
    const body=clean(savedBody());
    const notes=[];
    const blank=[...body.querySelectorAll('img[src]')].filter(img=>!img.alt.trim()).length;
    if(blank)notes.push('代替テキストが空欄の画像 '+blank+'件');
    const ids=new Set([...body.querySelectorAll('[id]')].map(node=>node.id));
    const broken=[...body.querySelectorAll('a[href^="#"]')].filter(a=>!ids.has(a.hash.slice(1))).length;
    if(broken)notes.push('リンク先が見つからない本文内リンク '+broken+'件');
    return notes;
  }

  return {load,body:savedBody,issues,status,hydrate};
};

