const STORAGE_KEY = "wasai-lang";
const SUPPORTED = new Set(["en", "zh"]);

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.has(saved)) {
    return saved;
  }
  return "en";
}

function updateElementLanguage(el, lang) {
  const nextText = el.dataset[lang];
  if (!nextText) {
    return;
  }
  el.textContent = nextText;
}

function updatePlaceholderLanguage(el, lang) {
  const placeholder = el.dataset[`${lang}Placeholder`];
  if (placeholder) {
    el.placeholder = placeholder;
  }
}

export function applyLanguage(lang) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-en][data-zh]").forEach((el) => updateElementLanguage(el, lang));
  document.querySelectorAll("[data-en-placeholder], [data-zh-placeholder]").forEach((el) => updatePlaceholderLanguage(el, lang));

  document.querySelectorAll(".lang-toggle").forEach((toggle) => {
    toggle.textContent = lang === "en" ? "中文" : "EN";
  });

  localStorage.setItem(STORAGE_KEY, lang);
}

export function initLanguage() {
  let current = getInitialLanguage();
  applyLanguage(current);

  document.body.addEventListener("click", (event) => {
    const toggle = event.target.closest(".lang-toggle");
    if (!toggle) {
      return;
    }
    current = current === "en" ? "zh" : "en";
    applyLanguage(current);
    window.dispatchEvent(new CustomEvent("wasai:language-changed", { detail: { lang: current } }));
  });

  return current;
}
