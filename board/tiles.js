/* 猫じろう掲示板: 板メニューをアイコン付きタイルにする(fc2版と同じ見た目) */
(function(){
  if(!document.querySelector('.board-directory'))return;
  function enhance(){
    var folders=document.querySelectorAll('.board-directory .neko-board-folder');
    var descriptions={
      '生活':'暮らし・健康・育児・料理など','雑談・ネタ':'雑談・日常・面白ネタなど',
      '文化・学問':'歴史・文学・科学・教養など','学校・仕事':'学校・仕事・資格・就職など',
      'PC・ネット':'パソコン・スマホ・ネット全般','ゲーム':'ゲーム全般・レトロ・エミュなど',
      '漫画・アニメ・特撮':'漫画・アニメ・特撮・声優など','音楽・映画・テレビ':'音楽・映画・ドラマ・バラエティ',
      '趣味・旅行・乗り物':'趣味・旅行・鉄道・車・バイクなど','食文化':'飲食・グルメ・食材・料理など',
      'スポーツ':'スポーツ全般・プロ・アマなど','ニュース・社会':'ニュース・政治・経済・社会など',
      '地域':'地域情報・地元の話題など'
    };
    var iconPaths=[
'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
'<path d="M4 5h16v12H8l-4 3z"/><path d="M8 10h8M8 14h5"/>',
'<path d="M4 5h7a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H4zM20 5h-6a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h6z"/>',
'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8m-4-3v3"/>',
'<rect x="3" y="8" width="18" height="11" rx="5"/><path d="M8 11v5m-2.5-2.5h5M16 12h.01M18 15h.01"/>',
'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/>',
'<path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
'<path d="M4 16h16M5 16l2-7h10l2 7M7 20h.01M17 20h.01"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
'<path d="M4 4v8a4 4 0 0 0 8 0V4M8 4v16M16 4v16M20 4v16M16 11h4"/>',
'<path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h6"/>',
'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
'<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2"/>'
];
    folders.forEach(function(folder,i){
      var summary=folder.querySelector('summary');if(!summary||summary.querySelector('.neko-tile-text'))return;
      var label=summary.textContent.trim(),name=label.replace(/\s*[（(]\d+板[）)]\s*$/,'');
      summary.textContent='';
      var icon=document.createElement('span');icon.className='neko-tile-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+iconPaths[i%iconPaths.length]+'</svg>';
      var content=document.createElement('span');content.className='neko-tile-text';
      var title=document.createElement('span');title.className='neko-tile-title';title.textContent=label;
      var desc=document.createElement('span');desc.className='neko-tile-desc';desc.textContent=descriptions[name]||'板を開いてスレッドを探す';
      content.append(title,desc);summary.append(icon,content);
    });
  }
  function run(){enhance();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  /* board.js等が板メニューを再描画しても、タイル化をやり直す */
  var dir=document.getElementById('restored-directory')||document.querySelector('.board-directory');
  if(dir&&window.MutationObserver){var t;new MutationObserver(function(){clearTimeout(t);t=setTimeout(enhance,50)}).observe(dir,{childList:true,subtree:true});}
})();
