const toolbar = document.querySelector(".toolbar");
const search = document.querySelector("#archive-search");
const more = document.querySelector("#archive-more");
const count = document.querySelector("#archive-count");
const random = document.querySelector("#archive-random");
const chips = Array.from(document.querySelectorAll(".chip"));
const cards = Array.from(document.querySelectorAll(".report-card"), (element) => ({
  element,
  link: element.querySelector("h3 a"),
  text: ((element.dataset.topic || "") + " " + element.textContent).normalize("NFKC").toLocaleLowerCase("ja"),
}));
const batchSize = 12;
let visible = batchSize;
let matches = cards;

function render() {
  const query = search.value.normalize("NFKC").trim().toLocaleLowerCase("ja");
  const terms = query.split(/\s+/).filter(Boolean);
  matches = [];
  cards.forEach((card) => {
    const match = terms.every((term) => card.text.includes(term));
    card.element.hidden = !match || matches.length >= visible;
    if (match) matches.push(card);
  });
  count.textContent = matches.length ? `${matches.length}件中 ${Math.min(visible, matches.length)}件を表示` : "該当する記事が見つかりませんでした。";
  more.hidden = matches.length <= visible;
  random.disabled = !matches.length;
  chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.query === query)));
}

function filter(value) {
  search.value = value;
  visible = batchSize;
  render();
}

toolbar.hidden = false;
search.addEventListener("input", () => filter(search.value));
chips.forEach((chip) => chip.addEventListener("click", () => filter(chip.dataset.query)));
document.querySelectorAll("[data-topic]").forEach((link) => {
  link.addEventListener("click", () => filter(link.dataset.topic));
});
more.addEventListener("click", () => {
  const firstNew = matches[visible];
  visible += batchSize;
  render();
  firstNew?.link.focus();
});
random.addEventListener("click", () => {
  if (matches.length) location.href = matches[Math.floor(Math.random() * matches.length)].link.href;
});
render();
