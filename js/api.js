const DATA_URL = "./data/products.json";
let productsDataPromise = null;
let productsDataCache = null;

async function readJson({ forceRefresh = false } = {}) {
  if (!forceRefresh && productsDataCache) {
    return productsDataCache;
  }
  if (!forceRefresh && productsDataPromise) {
    return productsDataPromise;
  }

  productsDataPromise = fetch(DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load product data: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      productsDataCache = data;
      return data;
    })
    .finally(() => {
      productsDataPromise = null;
    });

  return productsDataPromise;
}

export async function getProducts(options) {
  const data = await readJson(options);
  return data.products ?? [];
}

export async function getProduct(id, options) {
  const products = await getProducts(options);
  return products.find((item) => item.id === id) ?? null;
}

// Future backend switch point:
// Replace DATA_URL fetch with API endpoint calls such as:
// GET /api/products and GET /api/products/:id
