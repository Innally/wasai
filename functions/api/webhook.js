import Stripe from "stripe";

function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function saveOrderInD1(env, session) {
  if (!env.DB) {
    console.log("DB binding not configured. Skipping D1 order log.");
    return;
  }

  const shipping = session.shipping_details?.address || {};
  const sql = `
    INSERT INTO orders (
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
      shipping_line1,
      shipping_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      shipping_country,
      payment_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stripe_session_id) DO UPDATE SET
      stripe_payment_intent_id = excluded.stripe_payment_intent_id,
      product_id = excluded.product_id,
      sku = excluded.sku,
      amount_total_cents = excluded.amount_total_cents,
      currency = excluded.currency,
      customer_email = excluded.customer_email,
      customer_name = excluded.customer_name,
      customer_phone = excluded.customer_phone,
      shipping_name = excluded.shipping_name,
      shipping_line1 = excluded.shipping_line1,
      shipping_line2 = excluded.shipping_line2,
      shipping_city = excluded.shipping_city,
      shipping_state = excluded.shipping_state,
      shipping_postal_code = excluded.shipping_postal_code,
      shipping_country = excluded.shipping_country,
      payment_status = excluded.payment_status
  `;

  await env.DB.prepare(sql)
    .bind(
      session.id || "",
      session.payment_intent || "",
      session.metadata?.productId || "",
      session.metadata?.sku || "",
      Number(session.amount_total || 0),
      (session.currency || "usd").toLowerCase(),
      session.customer_details?.email || "",
      session.customer_details?.name || "",
      session.customer_details?.phone || "",
      session.shipping_details?.name || "",
      shipping.line1 || "",
      shipping.line2 || "",
      shipping.city || "",
      shipping.state || "",
      shipping.postal_code || "",
      shipping.country || "",
      session.payment_status || "",
    )
    .run();
}

async function sendOrderEmail(env, session) {
  if (!env.FORMSPREE_ENDPOINT) {
    console.log("FORMSPREE_ENDPOINT not set. Skipping email notification.");
    return;
  }

  const subject = `New WASAI order: ${session.metadata?.sku || session.id}`;
  const amount = (session.amount_total ?? 0) / 100;
  const body = [
    `Stripe checkout completed.`,
    `Session ID: ${session.id}`,
    `Product ID: ${session.metadata?.productId || "n/a"}`,
    `SKU: ${session.metadata?.sku || "n/a"}`,
    `Amount: USD ${amount.toFixed(2)}`,
    `Customer email: ${session.customer_details?.email || "n/a"}`,
    `Name: ${session.customer_details?.name || "n/a"}`,
    `Phone: ${session.customer_details?.phone || "n/a"}`,
    `Shipping: ${session.shipping_details?.address ? JSON.stringify(session.shipping_details.address) : "n/a"}`,
  ].join("\n");

  const response = await fetch(env.FORMSPREE_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      subject,
      message: body,
      sessionId: session.id,
      productId: session.metadata?.productId || "",
      sku: session.metadata?.sku || "",
      email: session.customer_details?.email || "",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Formspree failed: ${response.status} ${detail}`);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return textResponse("Missing Stripe env vars.", 500);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return textResponse("Missing stripe-signature header.", 400);
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const rawBody = await request.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await saveOrderInD1(env, session);
      await sendOrderEmail(env, session);
    }

    return textResponse("ok", 200);
  } catch (error) {
    console.error("webhook error", error);
    return textResponse("Webhook error.", 400);
  }
}
