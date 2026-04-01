import crypto from 'crypto';

let pool;

const DAY_MS = 24 * 60 * 60 * 1000;


const ALL_PERMISSIONS = [
  'products.manage',
  'products.delete',
  'customers.manage',
  'orders.create',
  'orders.view',
  'purchases.manage',
  'adjustments.manage',
  'settings.manage',
  'users.manage'
];

function defaultPermissions(role) {
  if (role === 'owner') return [...ALL_PERMISSIONS];
  return ['orders.create', 'orders.view', 'purchases.manage', 'adjustments.manage'];
}

function normalizePermissionList(list, role) {
  const fallback = defaultPermissions(role);
  if (!Array.isArray(list) || list.length === 0) return fallback;
  return [...new Set(list.filter((item) => ALL_PERMISSIONS.includes(item)))];
}


function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function isSameOrAfter(dateStr, compareDate) {
  return new Date(dateStr).getTime() >= compareDate.getTime();
}

function buildPeriodMetrics(orders, sinceDate) {
  const filtered = orders.filter((order) => isSameOrAfter(order.created_at, sinceDate));
  const revenue = filtered.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const cost = filtered.reduce((sum, item) => sum + Number(item.cost_total || 0), 0);
  return {
    revenue,
    cost,
    profit: revenue - cost,
    orders: filtered.length,
    quantity: filtered.reduce((sum, item) => sum + Number(item.item_count || 0), 0)
  };
}

function defaultUsers(now) {
  return [
    {
      username: process.env.BOSS_USERNAME || 'vinper619623',
      password: process.env.BOSS_PASSWORD || 'Vinper.619623!',
      name: process.env.BOSS_NAME || 'Sang',
      role: 'owner',
      permissions: defaultPermissions('owner'),
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      username: process.env.ASSISTANT_USERNAME || 'baobao619623',
      password: process.env.ASSISTANT_PASSWORD || 'Baobaoshop',
      name: process.env.ASSISTANT_NAME || 'Trợ lý BaoBao',
      role: 'assistant',
      permissions: defaultPermissions('assistant'),
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];
}

function buildDefaultData() {
  const now = new Date().toISOString();
  return {
    settings: {
      storeName: process.env.STORE_NAME || 'BaoBao POS',
      storePhone: process.env.STORE_PHONE || '0824 005 119',
      storeAddress: process.env.STORE_ADDRESS || 'BaoBao Pijama',
      invoiceFooter: process.env.INVOICE_FOOTER || 'Cảm ơn bạn đã mua hàng tại BaoBao 💖',
      currency: 'VND'
    },
    users: defaultUsers(now),
    products: [
      { sku: 'BB-PJ-001', name: 'Áo lụa Latin cu shin', category: 'Pyjama', price: 199000, cost: 110000, stock: 24, unit: 'áo', image_url: '', is_active: true, created_at: now, updated_at: now },
      { sku: 'BB-PJ-002', name: 'Set pyjama Dâu Tây', category: 'Pyjama', price: 219000, cost: 125000, stock: 18, unit: 'bộ', image_url: '', is_active: true, created_at: now, updated_at: now },
      { sku: 'BB-PJ-003', name: 'Set pyjama Kem Xanh', category: 'Pyjama', price: 239000, cost: 132000, stock: 9, unit: 'bộ', image_url: '', is_active: true, created_at: now, updated_at: now },
      { sku: 'BB-HM-001', name: 'Đầm ngủ lụa Latin', category: 'Homewear', price: 269000, cost: 150000, stock: 7, unit: 'cái', image_url: '', is_active: true, created_at: now, updated_at: now },
      { sku: 'BB-AC-001', name: 'Kẹp tóc nơ mềm', category: 'Phụ kiện', price: 39000, cost: 12000, stock: 32, unit: 'cái', image_url: '', is_active: true, created_at: now, updated_at: now },
      { sku: 'BB-AC-002', name: 'Túi quà BaoBao', category: 'Phụ kiện', price: 12000, cost: 4000, stock: 55, unit: 'cái', image_url: '', is_active: true, created_at: now, updated_at: now }
    ],
    customers: [
      { name: 'Khách lẻ', phone: '', email: '', points: 0, note: 'Khách mua tại quầy', created_at: now, updated_at: now },
      { name: 'Ngọc Anh', phone: '0909000111', email: 'ngocanh@example.com', points: 120, note: 'Khách thân thiết', created_at: now, updated_at: now },
      { name: 'Mai Trinh', phone: '0909000222', email: '', points: 45, note: 'Hay mua pyjama mùa hè', created_at: now, updated_at: now }
    ]
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.includes(':')) return stored === password;
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: normalizePermissionList(user.permissions, user.role),
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

async function q(text, params = [], client = pool) {
  const result = await client.query(text, params);
  return result.rows;
}

export async function initializePostgresStore() {
  if (pool) return;
  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      store_name TEXT NOT NULL,
      store_phone TEXT DEFAULT '',
      store_address TEXT DEFAULT '',
      invoice_footer TEXT DEFAULT '',
      currency TEXT DEFAULT 'VND'
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      cost INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'cái',
      image_url TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      note TEXT DEFAULT '',
      points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'direct',
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      note TEXT DEFAULT '',
      cashier_id INTEGER NOT NULL,
      cashier_name TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      cost_total INTEGER NOT NULL DEFAULT 0,
      profit INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL,
      total INTEGER NOT NULL,
      profit INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      supplier TEXT DEFAULT '',
      quantity INTEGER NOT NULL,
      cost INTEGER NOT NULL,
      total_cost INTEGER NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT NOT NULL,
      created_by_role TEXT NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT '';
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit_cost INTEGER DEFAULT 0;
    ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS total_cost INTEGER DEFAULT 0;
  `);

  const defaults = buildDefaultData();
  const settingRows = await q('SELECT id FROM settings LIMIT 1');
  if (settingRows.length === 0) {
    await q(
      'INSERT INTO settings (id, store_name, store_phone, store_address, invoice_footer, currency) VALUES (1, $1, $2, $3, $4, $5)',
      [defaults.settings.storeName, defaults.settings.storePhone, defaults.settings.storeAddress, defaults.settings.invoiceFooter, defaults.settings.currency]
    );
  }

  const userRows = await q('SELECT id FROM users LIMIT 1');
  if (userRows.length === 0) {
    for (const user of defaults.users) {
      await q(
        'INSERT INTO users (username, password_hash, name, role, permissions, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.username, hashPassword(user.password), user.name, user.role, JSON.stringify(user.permissions), user.is_active, user.created_at, user.updated_at]
      );
    }
  }


  const allUsers = await q('SELECT id, role, permissions FROM users');
  for (const user of allUsers) {
    const normalized = normalizePermissionList(user.permissions, user.role);
    if (JSON.stringify(normalized) !== JSON.stringify(user.permissions || [])) {
      await q('UPDATE users SET permissions = $2, updated_at = NOW() WHERE id = $1', [user.id, JSON.stringify(normalized)]);
    }
  }

  const productRows = await q('SELECT id FROM products LIMIT 1');
  if (productRows.length === 0) {
    for (const product of defaults.products) {
      await q(
        'INSERT INTO products (sku, name, category, price, cost, stock, unit, image_url, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [product.sku, product.name, product.category, product.price, product.cost, product.stock, product.unit, product.image_url || '', product.is_active, product.created_at, product.updated_at]
      );
    }
  }

  const customerRows = await q('SELECT id FROM customers LIMIT 1');
  if (customerRows.length === 0) {
    for (const customer of defaults.customers) {
      await q(
        'INSERT INTO customers (name, phone, email, note, points, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [customer.name, customer.phone, customer.email, customer.note, customer.points, customer.created_at, customer.updated_at]
      );
    }
  }
}

export async function closePostgresStore() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function authenticateUser(username, password) {
  const rows = await q('SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = TRUE LIMIT 1', [String(username || '').trim()]);
  const user = rows[0];
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    throw new Error('Sai tài khoản hoặc mật khẩu.');
  }
  const token = crypto.randomUUID();
  await q('DELETE FROM sessions WHERE user_id = $1', [user.id]);
  await q('INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, NOW())', [token, user.id]);
  return { token, user: sanitizeUser(user) };
}

export async function getUserByToken(token) {
  if (!token) return null;
  const rows = await q(
    `SELECT u.*
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND u.is_active = TRUE
     LIMIT 1`,
    [token]
  );
  return rows[0] ? sanitizeUser(rows[0]) : null;
}

export async function logoutToken(token) {
  await q('DELETE FROM sessions WHERE token = $1', [token]);
}

export async function getUsers() {
  const rows = await q('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map(sanitizeUser);
}

export async function createUser(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '');
  const name = String(payload.name || '').trim();
  const role = String(payload.role || 'assistant') === 'owner' ? 'owner' : 'assistant';
  if (!username || !password || !name) throw new Error('Tên, tài khoản và mật khẩu là bắt buộc.');
  const exists = await q('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
  if (exists[0]) throw new Error('Tài khoản đã tồn tại.');
  const rows = await q(
    `INSERT INTO users (username, password_hash, name, role, permissions, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
    [username, hashPassword(password), name, role, JSON.stringify(normalizePermissionList(payload.permissions, role)), Number(payload.is_active ?? 1) === 1]
  );
  return sanitizeUser(rows[0]);
}

export async function updateUser(id, payload, actor) {
  const rows = await q('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  const current = rows[0];
  if (!current) throw new Error('Không tìm thấy tài khoản.');
  if (Number(current.id) === Number(actor.id) && Number(payload.is_active ?? 1) !== 1) {
    throw new Error('Không thể tự khóa tài khoản đang đăng nhập.');
  }
  const role = current.role === 'owner' ? 'owner' : (String(payload.role || current.role || 'assistant') === 'owner' ? 'owner' : 'assistant');
  const permissions = current.role === 'owner' ? defaultPermissions('owner') : normalizePermissionList(payload.permissions, role);
  const updated = await q(
    `UPDATE users SET name = $2, role = $3, permissions = $4, is_active = $5, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, String(payload.name || current.name).trim(), role, JSON.stringify(permissions), current.role === 'owner' ? true : (Number(payload.is_active ?? current.is_active) === 1)]
  )
  return sanitizeUser(updated[0]);
}

export async function getSettings() {
  const rows = await q('SELECT * FROM settings WHERE id = 1 LIMIT 1');
  const row = rows[0];
  return {
    storeName: row.store_name,
    storePhone: row.store_phone,
    storeAddress: row.store_address,
    invoiceFooter: row.invoice_footer,
    currency: row.currency
  };
}

export async function updateSettings(payload) {
  await q(
    `UPDATE settings
     SET store_name = $1, store_phone = $2, store_address = $3, invoice_footer = $4, currency = 'VND'
     WHERE id = 1`,
    [
      String(payload.storeName || '').trim() || 'BaoBao POS',
      String(payload.storePhone || '').trim(),
      String(payload.storeAddress || '').trim(),
      String(payload.invoiceFooter || '').trim()
    ]
  );
  return getSettings();
}

function mapProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    cost: Number(row.cost),
    stock: Number(row.stock),
    unit: row.unit,
    image_url: row.image_url || '',
    is_active: row.is_active ? 1 : 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    note: row.note,
    points: Number(row.points),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapOrder(row) {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    item_count: Number(row.item_count),
    cost_total: Number(row.cost_total),
    profit: Number(row.profit)
  };
}

export async function getProducts(search = '') {
  const keyword = `%${search.trim().toLowerCase()}%`;
  const baseQuery = `
    SELECT p.*,
           lp.created_at AS last_purchase_at,
           lp.cost AS last_purchase_cost,
           lp.supplier AS last_purchase_supplier
    FROM products p
    LEFT JOIN LATERAL (
      SELECT created_at, cost, supplier
      FROM purchases pu
      WHERE pu.product_id = p.id
      ORDER BY pu.created_at DESC
      LIMIT 1
    ) lp ON TRUE
  `;
  const rows = search.trim()
    ? await q(
        `${baseQuery}
         WHERE p.is_active = TRUE
           AND (LOWER(p.name) LIKE $1 OR LOWER(p.sku) LIKE $1 OR LOWER(p.category) LIKE $1)
         ORDER BY p.created_at DESC`,
        [keyword]
      )
    : await q(`${baseQuery} WHERE p.is_active = TRUE ORDER BY p.created_at DESC`);
  return rows.map((row) => ({
    ...mapProduct(row),
    last_purchase_at: row.last_purchase_at,
    last_purchase_cost: Number(row.last_purchase_cost || 0),
    last_purchase_supplier: row.last_purchase_supplier || ''
  }));
}

export async function getCustomers(search = '') {
  const keyword = `%${search.trim().toLowerCase()}%`;
  const rows = search.trim()
    ? await q(
        `SELECT * FROM customers
         WHERE LOWER(name) LIKE $1 OR LOWER(phone) LIKE $1 OR LOWER(email) LIKE $1
         ORDER BY created_at DESC`,
        [keyword]
      )
    : await q('SELECT * FROM customers ORDER BY created_at DESC');
  return rows.map(mapCustomer);
}

export async function getOrders() {
  const rows = await q('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100');
  return rows.map(mapOrder);
}

export async function getOrderById(id) {
  const rows = await q('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
  const order = rows[0];
  if (!order) return null;
  const items = await q(`SELECT oi.*, COALESCE(p.image_url, '') AS image_url FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1 ORDER BY oi.id ASC`, [id]);
  const settings = await getSettings();
  return {
    ...mapOrder(order),
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      price: Number(item.price),
      unit_cost: Number(item.unit_cost),
      total: Number(item.total),
      profit: Number(item.profit)
    })),
    settings
  };
}

export async function createProduct(payload) {
  const duplicate = await q('SELECT id FROM products WHERE LOWER(sku) = LOWER($1) LIMIT 1', [String(payload.sku).trim()]);
  if (duplicate[0]) throw new Error('SKU đã tồn tại.');
  const rows = await q(
    `INSERT INTO products (sku, name, category, price, cost, stock, unit, image_url, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW(),NOW()) RETURNING *`,
    [
      String(payload.sku).trim(),
      String(payload.name).trim(),
      String(payload.category || '').trim(),
      Number(payload.price || 0),
      Number(payload.cost || 0),
      Number(payload.stock || 0),
      String(payload.unit || 'cái').trim(),
      String(payload.image_url || '').trim()
    ]
  );
  return mapProduct(rows[0]);
}

export async function updateProduct(id, payload) {
  const duplicate = await q('SELECT id FROM products WHERE id <> $1 AND LOWER(sku) = LOWER($2) LIMIT 1', [id, String(payload.sku).trim()]);
  if (duplicate[0]) throw new Error('SKU đã tồn tại.');
  const rows = await q(
    `UPDATE products
     SET sku = $2, name = $3, category = $4, price = $5, cost = $6, stock = $7, unit = $8, image_url = $9, is_active = $10, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      String(payload.sku).trim(),
      String(payload.name).trim(),
      String(payload.category || '').trim(),
      Number(payload.price || 0),
      Number(payload.cost || 0),
      Number(payload.stock || 0),
      String(payload.unit || 'cái').trim(),
      String(payload.image_url || '').trim(),
      Number(payload.is_active ?? 1) === 1
    ]
  );
  if (!rows[0]) throw new Error('Không tìm thấy sản phẩm.');
  return mapProduct(rows[0]);
}

export async function hideProduct(id) {
  const rows = await q('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) throw new Error('Không tìm thấy sản phẩm.');
}

export async function deleteProduct(id) {
  const refs = await q(
    `SELECT
       (SELECT COUNT(*)::int FROM order_items WHERE product_id = $1) AS order_count,
       (SELECT COUNT(*)::int FROM inventory_transactions WHERE product_id = $1) AS inventory_count,
       (SELECT COUNT(*)::int FROM purchases WHERE product_id = $1) AS purchase_count`,
    [id]
  );
  const ref = refs[0];
  if (!ref) throw new Error('Không tìm thấy sản phẩm.');
  if (Number(ref.order_count) > 0 || Number(ref.inventory_count) > 0 || Number(ref.purchase_count) > 0) {
    throw new Error('Sản phẩm này đã có phát sinh kho hoặc đơn hàng, chỉ nên ẩn chứ không xóa hẳn.');
  }
  const rows = await q('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) throw new Error('Không tìm thấy sản phẩm.');
}

export async function createCustomer(payload) {
  const rows = await q(
    `INSERT INTO customers (name, phone, email, note, points, created_at, updated_at)
     VALUES ($1,$2,$3,$4,0,NOW(),NOW()) RETURNING *`,
    [String(payload.name).trim(), String(payload.phone || '').trim(), String(payload.email || '').trim(), String(payload.note || '').trim()]
  );
  return mapCustomer(rows[0]);
}

export async function deleteCustomer(id) {
  const rows = await q('SELECT * FROM customers WHERE id = $1 LIMIT 1', [id]);
  const customer = rows[0];
  if (!customer) throw new Error('Không tìm thấy khách hàng.');
  if (String(customer.name).trim().toLowerCase() === 'khách lẻ') {
    throw new Error('Không thể xóa khách lẻ mặc định.');
  }
  await q('DELETE FROM customers WHERE id = $1', [id]);
}

export async function createOrder(payload, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) throw new Error('Giỏ hàng đang trống.');

    const productIds = items.map((item) => Number(item.product_id));
    const productRows = await q('SELECT * FROM products WHERE id = ANY($1::int[]) AND is_active = TRUE FOR UPDATE', [productIds], client);
    const productMap = new Map(productRows.map((row) => [row.id, row]));

    for (const item of items) {
      const product = productMap.get(Number(item.product_id));
      if (!product) throw new Error(`Sản phẩm ID ${item.product_id} không tồn tại.`);
      if (Number(product.stock) < Number(item.quantity)) throw new Error(`Tồn kho không đủ cho sản phẩm ${product.name}.`);
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const discount = Math.max(0, Number(payload.discount || 0));
    const total = Math.max(0, subtotal - discount);
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const orderInsert = await q(
      `INSERT INTO orders (order_no, customer_id, customer_name, source, subtotal, discount, total, payment_method, note, cashier_id, cashier_name, item_count, cost_total, profit, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,0,NOW()) RETURNING *`,
      [`TEMP-${Date.now()}`, payload.customer_id ? Number(payload.customer_id) : null, String(payload.customer_name || 'Khách lẻ'), String(payload.source || 'direct'), subtotal, discount, total, String(payload.payment_method || 'cash'), String(payload.note || ''), user.id, user.name],
      client
    );
    const orderId = orderInsert[0].id;
    const orderNo = `BB${datePart}-${1000 + orderId}`;
    await q('UPDATE orders SET order_no = $2 WHERE id = $1', [orderId, orderNo], client);

    let costTotal = 0;
    let itemCount = 0;

    for (const item of items) {
      const product = productMap.get(Number(item.product_id));
      const quantity = Number(item.quantity);
      const price = Number(item.price);
      const lineCost = Number(product.cost || 0) * quantity;
      costTotal += lineCost;
      itemCount += quantity;

      await q(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, unit_cost, total, profit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, product.id, String(item.product_name), quantity, price, Number(product.cost || 0), price * quantity, price * quantity - lineCost],
        client
      );

      await q('UPDATE products SET stock = stock - $2, updated_at = NOW() WHERE id = $1', [product.id, quantity], client);
      await q(
        `INSERT INTO inventory_transactions (product_id, product_name, type, quantity, note, reason, unit_cost, total_cost, created_at, created_by)
         VALUES ($1, $2, 'sale', $3, $4, '', $5, $6, NOW(), $7)`,
        [product.id, product.name, -Math.abs(quantity), `Bán hàng ${orderNo}`, Number(product.cost || 0), lineCost, user.name],
        client
      );
    }

    await q('UPDATE orders SET item_count = $2, cost_total = $3, profit = $4 WHERE id = $1', [orderId, itemCount, costTotal, total - costTotal], client);

    if (payload.customer_id) {
      await q('UPDATE customers SET points = points + $2, updated_at = NOW() WHERE id = $1', [Number(payload.customer_id), Math.floor(total / 10000)], client);
    }

    await client.query('COMMIT');
    return await getOrderById(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createPurchase(payload, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productId = Number(payload.product_id);
    const quantity = Number(payload.quantity || 0);
    const cost = Number(payload.cost || 0);
    if (!productId || quantity <= 0 || cost < 0) throw new Error('Sản phẩm, số lượng và giá nhập phải hợp lệ.');

    const rows = await q('SELECT * FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE', [productId], client);
    const product = rows[0];
    if (!product) throw new Error('Không tìm thấy sản phẩm để nhập hàng.');

    const purchaseRows = await q(
      `INSERT INTO purchases (product_id, product_name, supplier, quantity, cost, total_cost, note, created_at, created_by, created_by_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9)
       RETURNING *`,
      [productId, product.name, String(payload.supplier || '').trim(), quantity, cost, quantity * cost, String(payload.note || '').trim(), user.name, user.role],
      client
    );

    await q('UPDATE products SET stock = stock + $2, cost = $3, updated_at = NOW() WHERE id = $1', [productId, quantity, cost], client);
    await q(
      `INSERT INTO inventory_transactions (product_id, product_name, type, quantity, note, reason, unit_cost, total_cost, created_at, created_by)
       VALUES ($1, $2, 'purchase', $3, $4, '', $5, $6, NOW(), $7)`,
      [productId, product.name, quantity, `Nhập hàng #${purchaseRows[0].id}`, cost, quantity * cost, user.name],
      client
    );

    await client.query('COMMIT');
    return {
      ...purchaseRows[0],
      quantity: Number(purchaseRows[0].quantity),
      cost: Number(purchaseRows[0].cost),
      total_cost: Number(purchaseRows[0].total_cost)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getPurchases() {
  const rows = await q(`SELECT pu.*, COALESCE(p.image_url, '') AS image_url FROM purchases pu LEFT JOIN products p ON p.id = pu.product_id ORDER BY pu.created_at DESC LIMIT 100`);
  return rows.map((row) => ({ ...row, quantity: Number(row.quantity), cost: Number(row.cost), total_cost: Number(row.total_cost), image_url: row.image_url || '' }));
}

export async function createAdjustment(payload, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const productId = Number(payload.product_id);
    const quantity = Number(payload.quantity || 0);
    if (!productId || quantity <= 0) throw new Error('Sản phẩm và số lượng xuất hủy phải hợp lệ.');

    const rows = await q('SELECT * FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE', [productId], client);
    const product = rows[0];
    if (!product) throw new Error('Không tìm thấy sản phẩm để xuất hủy.');
    if (Number(product.stock) < quantity) throw new Error(`Tồn kho của ${product.name} không đủ để xuất hủy.`);

    const reason = String(payload.reason || 'Hàng lỗi').trim();
    const note = String(payload.note || '').trim();
    const unitCost = Number(product.cost || 0);
    const txRows = await q(
      `INSERT INTO inventory_transactions (product_id, product_name, type, quantity, note, reason, unit_cost, total_cost, created_at, created_by)
       VALUES ($1, $2, 'adjustment_out', $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING *`,
      [productId, product.name, -Math.abs(quantity), note, reason, unitCost, unitCost * quantity, user.name],
      client
    );

    await q('UPDATE products SET stock = stock - $2, updated_at = NOW() WHERE id = $1', [productId, quantity], client);
    await client.query('COMMIT');
    const row = txRows[0];
    return { ...row, quantity: Math.abs(Number(row.quantity)), unit_cost: Number(row.unit_cost), total_cost: Number(row.total_cost) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getAdjustments() {
  const rows = await q(`SELECT id, product_id, COALESCE(product_name, p.name) AS product_name, COALESCE(p.image_url, '') AS image_url, quantity, note, COALESCE(reason, '') AS reason, unit_cost, total_cost, created_at, created_by
                        FROM inventory_transactions it
                        LEFT JOIN products p ON p.id = it.product_id
                        WHERE type = 'adjustment_out'
                        ORDER BY created_at DESC
                        LIMIT 100`);
  return rows.map((row) => ({
    ...row,
    quantity: Math.abs(Number(row.quantity)),
    unit_cost: Number(row.unit_cost || 0),
    total_cost: Number(row.total_cost || 0),
    reason: row.reason || 'Hàng lỗi',
    image_url: row.image_url || ''
  }));
}

export async function getDashboard() {
  const [orders, purchases, adjustments, products, customers, orderItems] = await Promise.all([
    getOrders(),
    getPurchases(),
    getAdjustments(),
    getProducts(),
    getCustomers(),
    q('SELECT product_name, quantity FROM order_items')
  ]);
  const now = new Date();
  const day = buildPeriodMetrics(orders, startOfDay(now));
  const week = buildPeriodMetrics(orders, startOfWeek(now));
  const month = buildPeriodMetrics(orders, startOfMonth(now));

  const topMap = new Map();
  for (const item of orderItems) {
    const current = topMap.get(item.product_name) || 0;
    topMap.set(item.product_name, current + Number(item.quantity || 0));
  }
  const topProducts = [...topMap.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    periods: { day, week, month },
    productCount: products.filter((item) => item.is_active === 1).length,
    customerCount: customers.length,
    purchaseCount: purchases.length,
    adjustmentCount: adjustments.length,
    lowStock: products.filter((item) => item.is_active === 1 && Number(item.stock) <= 10).sort((a, b) => a.stock - b.stock).slice(0, 8),
    topProducts,
    recentOrders: orders.slice(0, 8),
    recentPurchases: purchases.slice(0, 6),
    recentAdjustments: adjustments.slice(0, 6)
  };
}

export async function getReports() {
  const [orders, purchases, adjustments] = await Promise.all([getOrders(), getPurchases(), getAdjustments()]);
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const day = buildPeriodMetrics(orders, dayStart);
  const week = buildPeriodMetrics(orders, weekStart);
  const month = buildPeriodMetrics(orders, monthStart);
  const sumPurchases = (sinceDate) => purchases.filter((item) => isSameOrAfter(item.created_at, sinceDate)).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const sumAdjustments = (sinceDate) => adjustments.filter((item) => isSameOrAfter(item.created_at, sinceDate)).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  return {
    revenue: { day, week, month },
    purchases: { day: sumPurchases(dayStart), week: sumPurchases(weekStart), month: sumPurchases(monthStart) },
    adjustments: { day: sumAdjustments(dayStart), week: sumAdjustments(weekStart), month: sumAdjustments(monthStart) }
  };
}
