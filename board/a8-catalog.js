(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const version = '20261126-a8bulk';
  const normal = s => (s || '').normalize('NFKC').toLowerCase();
  const rules = [
    [/楽天モバイル|格安sim|携帯料金|携帯回線|モバイル回線|esim/, /楽天モバイル|格安sim|esim|simカード/],
    [/wifi|wi-fi|光回線|プロバイダ|インターネット回線/, /wimax|光回線|プロバイダ|wi-fi/],
    [/セキュリティ|個人情報|ウイルス対策|vpn|不正アクセス/, /vpn|ウイルス対策|セキュリティ|antivirus/],
    [/動画編集|画面録画|obs|映像編集|配信ソフト/, /動画編集|画面録画|映像編集|bandicam|bandicut/],
    [/ゲーム機|ゲームソフト|レトロゲーム|アニメ|漫画/, /ゲームソフト|ゲーム買取|レトロゲーム|漫画|アニメ/],
    [/転職|求人|就職/, /転職|求人|就職/],
    [/アンケート|ポイ活|副業/, /アンケートモニター|ポイ活|副業/],
    [/ホテル|旅行|観光|宿泊|航空券|レンタカー/, /ホテル|旅行|宿泊|航空券|レンタカー/],
    [/株式|証券|投資|nisa|為替|fx/, /株式|証券|nisa|fx口座/],
    [/ラーメン|宅配食|料理|食材|調味料/, /ラーメン|宅配食|ミールキット|食材宅配|調味料/],
    [/英会話|英語学習|資格試験|プログラミング学習/, /英会話|資格講座|プログラミングスクール/],
    [/睡眠|寝具|枕|マットレス/, /寝具|枕|マットレス/],
    [/ゴルフ|登山|野球|サッカー|ダーツ/, /ゴルフ|登山用品|野球用品|サッカー用品|ダーツ/],
    [/ペット|猫砂|ドッグフード|キャットフード/, /ペット用品|猫砂|ドッグフード|キャットフード/],
    [/引っ越し|引越し|賃貸|不動産/, /引越し|引っ越し|賃貸|不動産/],
    [/レンタルサーバー|独自ドメイン|サーバー移転/, /レンタルサーバー|独自ドメイン|mixhost/]
  ];
  function relevance(name, title, body) {
    const terms = [...name.matchAll(/【([^】]+)】|「([^」]+)」/g)]
      .map(match => (match[1] || match[2]).trim());
    if (name.length <= 26) terms.push(name);
    const exact = terms.filter(s => s.length >= 4 && s.length <= 32 &&
      !/^(new|公式|初回|限定)|[!！?？★☆]/.test(s));
    if (exact.some(s => title.includes(s))) return 420;
    if (exact.some(s => body.includes(s))) return 330;
    return rules.some(([topic, ad]) => topic.test(title) && ad.test(name)) ? 240 : 0;
  }
  function creativeTemplate(code) {
    const template = document.createElement('template');
    template.dataset.a8Code = '';
    template.innerHTML = code;
    return template;
  }
  window.NekoA8Bulk = async function addBanners(root, site, title, body) {
    const rail = root.querySelector('.neko-a8-rail');
    if (!rail || !['fc2', 'github'].includes(site) || !('DecompressionStream' in window)) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(new URL('a8-' + site + '.json.gz?v=' + version, base), {signal: controller.signal});
      if (!response.ok) return;
      const catalog = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
      const slots = Array.from(root.querySelectorAll('.neko-a8-slot'));
      const existing = new Map(slots.map(slot => {
        const img = slot.querySelector('img[data-a8-src], .neko-a8-banner-link img');
        const src = img?.getAttribute('data-a8-src') || img?.getAttribute('src') || '';
        return [slot.dataset.a8Program || src.match(/[?&]mid=(s\d{14})/)?.[1], slot];
      }));
      if (site === 'github') {
        const creatives = new Map(catalog.map(([id, , code]) => [id, code]));
        for (const slot of slots) {
          const id = slot.dataset.a8Program || slot.innerHTML.match(/mid=(s\d{14})/)?.[1];
          const code = creatives.get(id);
          const creative = slot.querySelector('.neko-a8-creative');
          if (!code || !creative || !/[?&](?:amp;)?wid=008(?:&|["'])/.test(code)) continue;
          creative.replaceChildren(creativeTemplate(code));
          slot.dataset.a8Verified = 'github';
        }
      }
      if (!title && !body) return;
      const ranked = catalog.map(([id, name, code]) => ({id, name, code,
        score: relevance(normal(name), normal(title), normal(body).slice(0, 10000))}))
        .filter(entry => entry.score > 0 && entry.id !== 's00000027494001')
        .sort((a, b) => b.score - a.score).slice(0, 5);
      for (const {id, name, code, score} of ranked) {
        const slot = document.createElement('div');
        slot.className = 'neko-a8-slot';
        slot.hidden = true;
        slot.dataset.threadOnly = '';
        slot.dataset.a8Program = id;
        slot.dataset.a8BulkScore = score;
        slot.dataset.label = name;
        const label = document.createElement('div');
        label.className = 'neko-a8-label';
        label.textContent = 'PR・' + name;
        const creative = document.createElement('div');
        creative.className = 'neko-a8-creative';
        if (site === 'github') {
          if (!/[?&](?:amp;)?wid=008(?:&|["'])/.test(code)) continue;
          slot.dataset.a8Verified = 'github';
        }
        creative.append(creativeTemplate(code));
        slot.append(label, creative);
        existing.get(id)?.remove();
        rail.append(slot);
      }
    } finally {
      clearTimeout(timeout);
    }
  };
}());
