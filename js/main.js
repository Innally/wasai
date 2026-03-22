import { getProduct, getProducts } from "./api.js";
import { applyLanguage, initLanguage } from "./language.js";

/**
 * Hero video playlist (paths relative to site root).
 * Set HERO_VIDEO_ENABLED to false to use the image slideshow only (no video load / decode).
 */
const HERO_VIDEO_ENABLED = false;
const HERO_VIDEO_PLAYLIST = HERO_VIDEO_ENABLED
  ? [
      "assets/video/2025-06-24 151416.mov",
      "assets/video/2025-06-24 151439.mov",
      "assets/video/2025-06-24 151450.mov",
      "assets/video/2025-06-24 151523.mov",
    ].map((path) => encodeURI(path))
  : [];

function initRevealAnimations() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) {
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  targets.forEach((el) => observer.observe(el));
}

function initParallax() {
  const blocks = document.querySelectorAll("[data-parallax]");
  if (!blocks.length) {
    return;
  }

  const onScroll = () => {
    const scrollY = window.scrollY;
    blocks.forEach((block) => {
      if (block.classList.contains("hero-media")) {
        block.style.transform = `translate3d(0, ${Math.round(scrollY * 0.06)}px, 0)`;
        return;
      }
      block.style.backgroundPosition = `center ${Math.round(scrollY * 0.2)}px`;
    });
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) {
    return;
  }
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileNav() {
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("navToggle");
  const backdrop = document.getElementById("navBackdrop");
  const nav = document.getElementById("siteNav");
  if (!header || !toggle || !nav) {
    return;
  }

  const setOpen = (open) => {
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (backdrop) {
      backdrop.hidden = !open;
    }
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () => {
    setOpen(!header.classList.contains("is-open"));
  });

  if (backdrop) {
    backdrop.addEventListener("click", () => setOpen(false));
  }

  nav.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });
}

function initHeroMedia() {
  const media = document.querySelector(".hero-media");
  const a = document.getElementById("heroVideoA");
  const b = document.getElementById("heroVideoB");
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let slideTimer;

  const nextSlide = () => {
    const active = document.querySelector(".hero-slide.is-active");
    if (!active) {
      return;
    }
    active.classList.remove("is-active");
    const next = active.nextElementSibling || slides[0];
    next.classList.add("is-active");
  };

  const startSlides = () => {
    if (media) {
      media.classList.remove("hero-media--playlist-active");
    }
    [a, b].forEach((el) => {
      if (!el) {
        return;
      }
      el.classList.remove("is-playing");
      delete el.dataset.wasaiClip;
      el.removeAttribute("src");
      el.load();
    });
    if (reduceMotion) {
      return;
    }
    slideTimer = window.setInterval(nextSlide, 6500);
  };

  const stopSlides = () => {
    if (slideTimer) {
      window.clearInterval(slideTimer);
      slideTimer = undefined;
    }
  };

  if (!a || !b || !HERO_VIDEO_PLAYLIST.length) {
    startSlides();
    return;
  }

  const clips = HERO_VIDEO_PLAYLIST;
  const n = clips.length;

  const removePosters = () => {
    a.removeAttribute("poster");
    b.removeAttribute("poster");
  };

  const setClip = (el, clipIndex) => {
    const idx = ((clipIndex % n) + n) % n;
    const key = String(idx);
    if (el.dataset.wasaiClip === key) {
      return;
    }
    el.dataset.wasaiClip = key;
    el.src = clips[idx];
    el.load();
  };

  const onPlaying = (playingEl, otherEl) => {
    playingEl.classList.add("is-playing");
    otherEl.classList.remove("is-playing");
    if (media) {
      media.classList.add("hero-media--playlist-active");
    }
    removePosters();
    stopSlides();
    const cur = Number.parseInt(playingEl.dataset.wasaiClip ?? "0", 10);
    const nextIdx = (cur + 1) % n;
    setClip(otherEl, nextIdx);
  };

  a.addEventListener("playing", () => onPlaying(a, b));
  b.addEventListener("playing", () => onPlaying(b, a));

  a.addEventListener("ended", () => {
    a.classList.remove("is-playing");
    b.play().catch(() => {
      startSlides();
    });
  });

  b.addEventListener("ended", () => {
    b.classList.remove("is-playing");
    a.play().catch(() => {
      startSlides();
    });
  });

  const onVideoError = () => {
    startSlides();
  };
  a.addEventListener("error", onVideoError);
  b.addEventListener("error", onVideoError);

  // Prime: A = clip 0, B = clip 1 (ready when A ends)
  setClip(a, 0);
  setClip(b, 1);

  a.play().catch(() => {
    startSlides();
  });
}

function getActiveLanguage() {
  return document.documentElement.lang.startsWith("zh") ? "zh" : "en";
}

function resolveText(obj, lang) {
  return lang === "zh" ? obj.zh : obj.en;
}

function productCardTemplate(product, lang) {
  return `
    <article class="product-card reveal">
      <img src="${product.image}" alt="${resolveText(product.name, lang)}" loading="lazy" />
      <div class="product-card-body">
        <span class="product-chip">${resolveText(product.categoryLabel, lang)}</span>
        <h3>${resolveText(product.name, lang)}</h3>
        <p>${resolveText(product.shortDescription, lang)}</p>
        <a class="btn btn-gold" href="product-detail.html?id=${encodeURIComponent(product.id)}">${
          lang === "zh" ? "查看详情" : "View Details"
        }</a>
      </div>
    </article>
  `;
}

async function renderHomeProducts() {
  const grid = document.getElementById("homeProductGrid");
  if (!grid) {
    return;
  }

  const lang = getActiveLanguage();
  const products = await getProducts();
  const featured = products.slice(0, 6);
  grid.innerHTML = featured.map((item) => productCardTemplate(item, lang)).join("");
  initRevealAnimations();
}

function uniqueCategories(products) {
  const map = new Map();
  products.forEach((item) => {
    map.set(item.category, item.categoryLabel);
  });
  return [...map.entries()].map(([value, label]) => ({ value, label }));
}

const catalogState = {
  active: "all",
  products: [],
  filterBound: false,
};

function renderCatalogGrid() {
  const grid = document.getElementById("catalogGrid");
  const filterRow = document.getElementById("filterRow");
  if (!grid || !filterRow) {
    return;
  }

  const lang = getActiveLanguage();
  const filtered =
    catalogState.active === "all"
      ? catalogState.products
      : catalogState.products.filter((item) => item.category === catalogState.active);
  grid.innerHTML = filtered.map((item) => productCardTemplate(item, lang)).join("");
  initRevealAnimations();
}

async function renderCatalog() {
  const grid = document.getElementById("catalogGrid");
  const filterRow = document.getElementById("filterRow");
  if (!grid || !filterRow) {
    return;
  }

  catalogState.products = await getProducts();

  const lang = getActiveLanguage();
  const categories = uniqueCategories(catalogState.products);
  const allLabel = lang === "zh" ? "全部" : "All";
  filterRow.innerHTML = `
    <button class="filter-btn ${catalogState.active === "all" ? "is-active" : ""}" data-filter="all">${allLabel}</button>
    ${categories
      .map(
        (entry) =>
          `<button class="filter-btn ${catalogState.active === entry.value ? "is-active" : ""}" data-filter="${entry.value}">${resolveText(entry.label, lang)}</button>`,
      )
      .join("")}
  `;

  if (!catalogState.filterBound) {
    filterRow.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.dataset.filter) {
        return;
      }
      catalogState.active = target.dataset.filter;
      filterRow.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("is-active"));
      target.classList.add("is-active");
      renderCatalogGrid();
    });
    catalogState.filterBound = true;
  }

  renderCatalogGrid();
}

function readProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("id");
  if (fromQuery) {
    return fromQuery;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length > 1 && segments[0] === "product") {
    return segments[1];
  }

  return "";
}

async function startCheckout(product) {
  const lang = getActiveLanguage();
  const label = lang === "zh" ? "立即购买" : "Buy Now";
  const button = document.querySelector("[data-checkout-btn]");
  const original = button?.textContent || label;
  if (button) {
    button.textContent = lang === "zh" ? "跳转支付中..." : "Redirecting...";
    button.setAttribute("disabled", "true");
    button.setAttribute("aria-busy", "true");
  }

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        quantity: 1,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.url) {
      throw new Error(body.error || "Unable to start checkout.");
    }
    window.location.href = body.url;
  } catch (error) {
    console.error(error);
    window.alert(lang === "zh" ? "暂时无法发起支付，请稍后重试。" : "Unable to start checkout right now. Please try again.");
    if (button) {
      button.textContent = original;
      button.removeAttribute("disabled");
      button.removeAttribute("aria-busy");
    }
  }
}

async function renderProductDetail() {
  const host = document.getElementById("detailLayout");
  if (!host) {
    return;
  }

  const productId = readProductIdFromUrl();
  const product = await getProduct(productId);
  const lang = getActiveLanguage();
  if (!product) {
    host.innerHTML = `<p>${lang === "zh" ? "未找到该产品。" : "Product not found."}</p>`;
    return;
  }

  const price = product.priceUsd ? `$${product.priceUsd}` : lang === "zh" ? "价格咨询" : "Price on request";
  host.innerHTML = `
    <img class="detail-image" src="${product.image}" alt="${resolveText(product.name, lang)}" />
    <div class="detail-panel">
      <span class="product-chip">${resolveText(product.categoryLabel, lang)}</span>
      <h1>${resolveText(product.name, lang)}</h1>
      <p>${resolveText(product.description, lang)}</p>
      <p><strong>${lang === "zh" ? "规格：" : "SKU:"}</strong> ${product.sku}</p>
      <p><strong>${lang === "zh" ? "价格：" : "Price:"}</strong> ${price}</p>
      <div class="detail-actions">
        <button type="button" class="btn btn-gold" data-checkout-btn ${product.priceUsd ? "" : "disabled"}>
          ${lang === "zh" ? "立即购买" : "Buy Now"}
        </button>
        <a class="btn btn-outline-dark" href="index.html#contact">${lang === "zh" ? "咨询此产品" : "Inquire About This Tea"}</a>
      </div>
    </div>
  `;

  const checkoutBtn = host.querySelector("[data-checkout-btn]");
  if (checkoutBtn && product.priceUsd) {
    checkoutBtn.addEventListener("click", () => {
      startCheckout(product);
    });
  }
}

function attachLanguageRerender() {
  window.addEventListener("wasai:language-changed", async () => {
    applyLanguage(getActiveLanguage());
    await Promise.all([renderHomeProducts(), renderCatalog(), renderProductDetail()]);
  });
}

async function init() {
  initLanguage();
  initRevealAnimations();
  initParallax();
  initHeaderScroll();
  initMobileNav();
  initHeroMedia();
  attachLanguageRerender();
  await Promise.all([renderHomeProducts(), renderCatalog(), renderProductDetail()]);
}

init().catch((error) => {
  console.error(error);
});
