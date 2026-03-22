import Stripe from "stripe";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readQuantity(input) {
  const qty = Number(input);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    return 1;
  }
  return qty;
}

async function getProductById(request, productId) {
  const url = new URL(request.url);
  const dataUrl = new URL("/data/products.json", `${url.origin}/`);
  const response = await fetch(dataUrl.toString());
  if (!response.ok) {
    throw new Error(`Cannot load products.json: ${response.status}`);
  }
  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];
  return products.find((item) => item.id === productId) || null;
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ error: "Expected application/json request body." }, 415);
    }

    const payload = await request.json();
    const productId = payload?.productId;
    const quantity = readQuantity(payload?.quantity);
    if (!productId || typeof productId !== "string") {
      return json({ error: "Missing productId." }, 400);
    }
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: "Server is missing STRIPE_SECRET_KEY." }, 500);
    }

    const product = await getProductById(request, productId);
    if (!product) {
      return json({ error: "Product not found." }, 404);
    }
    if (typeof product.priceUsd !== "number" || product.priceUsd <= 0) {
      return json({ error: "Product is not purchasable yet." }, 400);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/cancel.html?product=${encodeURIComponent(product.id)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(product.priceUsd * 100),
            product_data: {
              name: product?.name?.en || product.id,
              description: product?.shortDescription?.en || "",
              images: product.image ? [`${origin}/${product.image.replace(/^\/+/, "")}`] : [],
              metadata: {
                productId: product.id,
                sku: product.sku || "",
              },
            },
          },
        },
      ],
      metadata: {
        productId: product.id,
        sku: product.sku || "",
      },
      // Must be false until Stripe Tax is configured in Dashboard (true causes session.create to fail).
      automatic_tax: { enabled: false },
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      customer_creation: "always",
      phone_number_collection: { enabled: true },
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("checkout error", error);
    const detail =
      error?.raw?.message ||
      error?.message ||
      (typeof error === "string" ? error : null) ||
      "unknown error";
    return json(
      {
        error: "Unable to create checkout session.",
        detail,
      },
      500,
    );
  }
}
