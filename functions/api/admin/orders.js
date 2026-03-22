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

function sanitizeLimit(value) {
  const parsed = Number.parseInt(value || "50", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 50;
  }
  return Math.min(parsed, 200);
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
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = sanitizeLimit(url.searchParams.get("limit"));

    let sql = `
      SELECT
        id,
        stripe_session_id,
        stripe_payment_intent_id,
        product_id,
        sku,
        amount_total_cents,
        currency,
        customer_email,
        customer_name,
        customer_phone,
        shipping_name,
        shipping_city,
        shipping_state,
        shipping_postal_code,
        shipping_country,
        payment_status,
        created_at
      FROM orders
    `;
    const binds = [];

    if (q) {
      sql += `
        WHERE
          lower(customer_email) LIKE lower(?)
          OR lower(customer_name) LIKE lower(?)
          OR lower(sku) LIKE lower(?)
          OR lower(product_id) LIKE lower(?)
          OR lower(stripe_session_id) LIKE lower(?)
      `;
      const term = `%${q}%`;
      binds.push(term, term, term, term, term);
    }

    sql += " ORDER BY datetime(created_at) DESC LIMIT ?";
    binds.push(limit);

    const result = await env.DB.prepare(sql).bind(...binds).all();
    return json({ orders: result.results || [] });
  } catch (error) {
    console.error("admin orders error", error);
    return json({ error: "Failed to load orders." }, 500);
  }
}
