const DATA_URL = "./data/products.json";

async function readJson() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load product data: ${response.status}`);
  }
  return response.json();
}

export async function getProducts() {
  const data = await readJson();
  return data.products ?? [];
}

export async function getProduct(id) {
  const products = await getProducts();
  return products.find((item) => item.id === id) ?? null;
}

// Future backend switch point:
// Replace DATA_URL fetch with API endpoint calls such as:
// GET /api/products and GET /api/products/:id
