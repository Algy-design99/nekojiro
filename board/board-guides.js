(function () {
  'use strict';
  const base = 'https://algy-design99.github.io/nekojiro/research/';
  const guides = [
    {topic:'配信・録画', title:'HDMIダミープラグの仕組みと使い道', id:'15928596', match:/HDMI|ダミープラグ|遠隔操作|映像配信|OBS|画面録画/i},
    {topic:'中古PC・GPU', title:'古い高性能GPUは中古で買いか', id:'15896435', match:/GPU|グラフィックボード|グラボ|中古(?:PC|パソコン)/i},
    {topic:'カードリーダー', title:'古いPaSoRiが今も使われる理由', id:'15928356', match:/PaSoRi|ICカードリーダー|マイナンバーカード|RC-S380/i},
    {topic:'通販・価格比較', title:'検索順位と最安値はどう違うのか', id:'15879585', match:/最安値|価格比較|通販|ネットショッピング|買い物/i},
    {topic:'買い物の安全', title:'通販の偽ショップを見分けるには', id:'15881328', match:/偽ショップ|偽通販|通販詐欺|偽サイト|フィッシング/i},
    {topic:'食と道具', title:'大豆から豆腐を作ると何が起きるのか', id:'managed-1795609330614', match:/豆腐|豆乳|にがり/},
    {topic:'お茶', title:'なぜ人は苦くて渋いお茶を飲むようになったのか', id:'15930697', match:/緑茶|日本茶|煎茶|お茶|茶葉/}
  ];
  function render(mount, entries, heading) {
    if (!entries.length) return;
    const title = document.createElement('h2');
    title.textContent = heading;
    mount.setAttribute('aria-label', heading);
    const disclosure = document.createElement('p');
    disclosure.textContent = 'リンク先の記事には広告・アフィリエイトリンクが含まれます。';
    const links = document.createElement('ul');
    for (const guide of entries) {
      const item = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = base + 'archives/' + guide.id + '.html';
      const topic = document.createElement('span');
      topic.textContent = guide.topic;
      const name = document.createElement('strong');
      name.textContent = guide.title;
      anchor.append(topic, name);
      item.append(anchor);
      links.append(item);
    }
    mount.replaceChildren(title, disclosure, links);
    mount.hidden = false;
  }
  const home = document.getElementById('board-guides-home');
  if (home && !new URLSearchParams(location.search).size) {
    render(home, guides.filter(guide => ['15928596','15896435','15879585'].includes(guide.id)), '猫じろう調査室のおすすめ記事');
  }
  const thread = document.getElementById('board-guides-thread');
  const body = document.getElementById('neko-original-posts');
  if (!thread || !body) return;
  function renderRelated() {
    if (!body.textContent.trim()) return false;
    const title = document.querySelector('.neko-entry-title')?.textContent || '';
    const text = body.textContent.slice(0, 2800);
    const entries = guides.map(guide => ({guide, score:guide.match.test(title) ? 2 : guide.match.test(text) ? 1 : 0}))
      .filter(entry => entry.score).sort((a,b) => b.score-a.score).slice(0,2).map(entry => entry.guide);
    render(thread, entries, 'この話題の関連記事');
    return true;
  }
  if (!renderRelated()) {
    const observer = new MutationObserver(() => { if (renderRelated()) observer.disconnect(); });
    observer.observe(body, {childList:true});
  }
}());
