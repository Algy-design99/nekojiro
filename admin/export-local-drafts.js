const login = document.querySelector('#console-link');
const current = new URLSearchParams(location.search);
const target = new URL(login.href);
for (const name of ['site', 'id']) {
  const value = current.get(name);
  if (value && /^[A-Za-z0-9_-]+$/.test(value)) target.searchParams.set(name, value);
}
login.href = target.href;
const select = document.querySelector('#drafts');
const drafts = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (!key?.startsWith('tsukasa-cms-draft:')) continue;
  try {
    const draft = JSON.parse(localStorage.getItem(key));
    if (draft?.title && typeof draft.body === 'string') drafts.push(draft);
  } catch {}
}
if (drafts.length) {
  for (const [index, draft] of drafts.entries()) {
    const option = new Option(draft.title, String(index));
    select.add(option);
  }
  document.querySelector('#local-drafts').hidden = false;
  document.querySelector('#download').onclick = () => {
    const draft = drafts[Number(select.value)];
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)],{type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = draft.title.replace(/[\\/:*?"<>|]/g,'_').slice(0,90)+'.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  };
}