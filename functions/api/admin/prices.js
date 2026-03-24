function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isAuthorized(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  return Boolean(env.ADMIN_API_TOKEN) && token === env.ADMIN_API_TOKEN;
}

function toPriceMap(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  return payload;
}

function validPrice(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 100000;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!env.DB) {
    return json({ error: "DB binding is not configured." }, 500);
  }

  try {
    const result = await env.DB.prepare(
      "SELECT product_id, price_usd, updated_at, updated_by FROM product_prices WHERE is_active = 1 ORDER BY product_id",
    ).all();
    return json({ prices: result.results || [] });
  } catch (error) {
    console.error("admin prices get error", error);
    return json({ error: "Failed to load prices." }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!env.DB) {
    return json({ error: "DB binding is not configured." }, 500);
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Expected application/json request body." }, 415);
    }

    const body = await request.json();
    const priceMap = toPriceMap(body?.prices);
    if (!priceMap) {
      return json({ error: "Missing prices object." }, 400);
    }

    const entries = Object.entries(priceMap).filter(([productId, price]) => {
      return typeof productId === "string" && productId.trim() && validPrice(price);
    });
    if (!entries.length) {
      return json({ error: "No valid price updates." }, 400);
    }

    const actor = request.headers.get("x-admin-user") || "admin";
    const sql = `
      INSERT INTO product_prices (product_id, price_usd, updated_by, is_active)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(product_id) DO UPDATE SET
        price_usd = excluded.price_usd,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = excluded.updated_by,
        is_active = 1
    `;

    for (const [productId, price] of entries) {
      await env.DB.prepare(sql).bind(productId, Number(price), actor).run();
    }

    return json({ ok: true, updated: entries.length });
  } catch (error) {
    console.error("admin prices post error", error);
    return json({ error: "Failed to save prices." }, 500);
  }
}
