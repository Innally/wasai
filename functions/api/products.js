function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function readStaticProducts(request) {
  const url = new URL(request.url);
  const dataUrl = new URL("/data/products.json", `${url.origin}/`);
  const response = await fetch(dataUrl.toString());
  if (!response.ok) {
    throw new Error(`Cannot load products.json: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

async function readPriceOverrides(env) {
  if (!env.DB) {
    return new Map();
  }
  const map = new Map();
  try {
    const result = await env.DB.prepare(
      "SELECT product_id, price_usd FROM product_prices WHERE is_active = 1",
    ).all();
    for (const row of result.results || []) {
      if (row?.product_id && typeof row.price_usd === "number") {
        map.set(row.product_id, row.price_usd);
      }
    }
  } catch (error) {
    console.warn("price override lookup failed; using static products", error);
  }
  return map;
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const products = await readStaticProducts(request);
    const overrides = await readPriceOverrides(env);

    const merged = products.map((item) => {
      const override = overrides.get(item.id);
      if (typeof override === "number" && override > 0) {
        return { ...item, priceUsd: Number(override.toFixed(2)) };
      }
      return item;
    });

    return json({ products: merged });
  } catch (error) {
    console.error("products api error", error);
    return json({ error: "Failed to load products." }, 500);
  }
}
