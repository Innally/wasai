CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  product_id TEXT,
  sku TEXT,
  amount_total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  shipping_name TEXT,
  shipping_line1 TEXT,
  shipping_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT,
  payment_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

CREATE TABLE IF NOT EXISTS product_prices (
  product_id TEXT PRIMARY KEY,
  price_usd REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_prices_active ON product_prices(is_active);
