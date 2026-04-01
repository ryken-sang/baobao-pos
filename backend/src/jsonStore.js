import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, '..', 'data', 'store.json');
const seedFile = path.join(__dirname, '..', 'data', 'store.seed.json');

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
      id: 1,
      username: 'vinper619623',
      password: 'Vinper.619623!',
      name: 'Sang',
      role: 'owner',
      is_active: 1,
      created_at: now,
      updated_at: now
    },
    {
      id: 2,
      username: 'baobao619623',
      password: 'Baobaoshop',
      name: 'Trợ lý BaoBao',
      role: 'assistant',
      is_active: 1,
      created_at: now,
      updated_at: now
    }
  ];
}

function buildDefaultData() {
  const now = new Date().toISOString();
  return {
    counters: {
      products: 6,
      customers: 3,
      orders: 0,
      orderItems: 0,
      inventoryTransactions: 0,
      purchases: 0,
      users: 2
    },
    settings: {
      storeName: 'BaoBao POS',
      storePhone: '0824 005 119',
      storeAddress: 'BaoBao Pijama',
      invoiceFooter: 'Cảm ơn bạn đã mua hàng tại BaoBao 💖',
      currency: 'VND'
    },
    users: defaultUsers(now),
    sessions: [],
    products: [
      { id: 1, sku: 'BB-PJ-001', name: 'Áo lụa Latin cu shin', category: 'Pyjama', price: 199000, cost: 110000, stock: 24, unit: 'áo', is_active: 1, created_at: now, updated_at: now },
      { id: 2, sku: 'BB-PJ-002', name: 'Set pyjama Dâu Tây', category: 'Pyjama', price: 219000, cost: 125000, stock: 18, unit: 'bộ', is_active: 1, created_at: now, updated_at: now },
      { id: 3, sku: 'BB-PJ-003', name: 'Set pyjama Kem Xanh', category: 'Pyjama', price: 239000, cost: 132000, stock: 9, unit: 'bộ', is_active: 1, created_at: now, updated_at: now },
      { id: 4, sku: 'BB-HM-001', name: 'Đầm ngủ lụa Latin', category: 'Homewear', price: 269000, cost: 150000, stock: 7, unit: 'cái', is_active: 1, created_at: now, updated_at: now },
      { id: 5, sku: 'BB-AC-001', name: 'Kẹp tóc nơ mềm', category: 'Phụ kiện', price: 39000, cost: 12000, stock: 32, unit: 'cái', is_active: 1, created_at: now, updated_at: now },
      { id: 6, sku: 'BB-AC-002', name: 'Túi quà BaoBao', category: 'Phụ kiện', price: 12000, cost: 4000, stock: 55, unit: 'cái', is_active: 1, created_at: now, updated_at: now }
    ],
    customers: [
      { id: 1, name: 'Khách lẻ', phone: '', email: '', points: 0, note: 'Khách mua tại quầy', created_at: now, updated_at: now },
      { id: 2, name: 'Ngọc Anh', phone: '0909000111', email: 'ngocanh@example.com', points: 120, note: 'Khách thân thiết', created_at: now, updated_at: now },
      { id: 3, name: 'Mai Trinh', phone: '0909000222', email: '', points: 45, note: 'Hay mua pyjama mùa hè', created_at: now, updated_at: now }
    ],
    orders: [],
    orderItems: [],
    inventoryTransactions: [],
    purchases: []
  };
}

function ensureSeedFile() {
  if (!fs.existsSync(seedFile)) {
    fs.writeFileSync(seedFile, JSON.stringify(buildDefaultData(), null, 2), 'utf8');
  }
}

function ensureDataFile() {
  ensureSeedFile();
  if (!fs.existsSync(dataFile)) {
    fs.copyFileSync(seedFile, dataFile);
  }
}

function normalizeUsers(data, defaults) {
  let changed = false;
  if (!Array.isArray(data.users) || data.users.length === 0) {
    data.users = defaults.users;
    return true;
  }
  const owner = data.users.find((u) => u.role === 'owner' || u.username === 'vinper619623');
  const assistant = data.users.find((u) => u.role === 'assistant' || u.username === 'baobao619623');
  if (!owner) {
    data.users = [...data.users.filter((u) => u.id !== 1), defaults.users[0], ...data.users.filter((u) => u.id === 1)];
    changed = true;
  }
  if (!assistant) {
    data.users.push(defaults.users[1]);
    changed = true;
  }
  data.users = data.users.map((user) => {
    let next = { ...user };
    if (user.username === 'admin') {
      next = { ...next, username: 'vinper619623', password: 'Vinper.619623!', role: 'owner', name: next.name === 'Chủ shop' ? 'Sang' : next.name };
      changed = true;
    }
    if (user.username === 'cashier') {
      next = { ...next, username: 'baobao619623', password: 'Baobaoshop', role: 'assistant', name: next.name === 'Thu ngân' ? 'Trợ lý BaoBao' : next.name };
      changed = true;
    }
    if (next.role === 'admin') {
      next.role = 'owner';
      changed = true;
    }
    if (next.role === 'cashier') {
      next.role = 'assistant';
      changed = true;
    }
    return next;
  });
  return changed;
}

function normalizeData(data) {
  const defaults = buildDefaultData();
  let changed = false;
  for (const [key, value] of Object.entries(defaults)) {
    if (data[key] === undefined) {
      data[key] = value;
      changed = true;
    }
  }
  if (!Array.isArray(data.sessions)) {
    data.sessions = [];
    changed = true;
  }
  if (!data.settings) {
    data.settings = defaults.settings;
    changed = true;
  }
  data.counters = { ...defaults.counters, ...(data.counters || {}) };
  if (data.counters.purchases === undefined) {
    data.counters.purchases = 0;
    changed = true;
  }
  if (!Array.isArray(data.purchases)) {
    data.purchases = [];
    changed = true;
  }
  changed = normalizeUsers(data, defaults) || changed;
  return { data, changed };
}

function readData() {
  ensureDataFile();
  const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const normalized = normalizeData(raw);
  if (normalized.changed) writeData(normalized.data);
  return normalized.data;
}

function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(data, key) {
  data.counters[key] = (data.counters[key] || 0) + 1;
  return data.counters[key];
}

function sortByNewest(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

export function authenticateUser(username, password) {
  const data = readData();
  const user = data.users.find(
    (item) => item.username.toLowerCase() === String(username || '').trim().toLowerCase() && item.password === String(password || '') && item.is_active === 1
  );
  if (!user) {
    throw new Error('Sai tài khoản hoặc mật khẩu.');
  }
  const token = crypto.randomUUID();
  data.sessions = (data.sessions || []).filter((item) => item.user_id !== user.id);
  data.sessions.push({ token, user_id: user.id, created_at: new Date().toISOString() });
  writeData(data);
  return { token, user: sanitizeUser(user) };
}

export function getUserByToken(token) {
  if (!token) return null;
  const data = readData();
  const session = (data.sessions || []).find((item) => item.token === token);
  if (!session) return null;
  const user = data.users.find((item) => item.id === session.user_id && item.is_active === 1);
  return user ? sanitizeUser(user) : null;
}

export function logoutToken(token) {
  const data = readData();
  data.sessions = (data.sessions || []).filter((item) => item.token !== token);
  writeData(data);
}

export function getSettings() {
  return readData().settings;
}

export function updateSettings(payload) {
  const data = readData();
  data.settings = {
    ...data.settings,
    storeName: String(payload.storeName || data.settings.storeName || '').trim(),
    storePhone: String(payload.storePhone || '').trim(),
    storeAddress: String(payload.storeAddress || '').trim(),
    invoiceFooter: String(payload.invoiceFooter || '').trim(),
    currency: 'VND'
  };
  writeData(data);
  return data.settings;
}

export function getProducts(search = '') {
  const data = readData();
  const keyword = search.trim().toLowerCase();
  const items = data.products.filter((product) => product.is_active === 1);
  if (!keyword) return sortByNewest(items);
  return items.filter((product) => [product.name, product.sku, product.category].some((field) => (field || '').toLowerCase().includes(keyword)));
}

export function getCustomers(search = '') {
  const data = readData();
  const keyword = search.trim().toLowerCase();
  const items = data.customers;
  if (!keyword) return sortByNewest(items);
  return items.filter((customer) => [customer.name, customer.phone, customer.email].some((field) => (field || '').toLowerCase().includes(keyword)));
}

export function getOrders() {
  return sortByNewest(readData().orders).slice(0, 100);
}

export function getOrderById(id) {
  const data = readData();
  const order = data.orders.find((item) => item.id === id);
  if (!order) return null;
  const items = data.orderItems.filter((item) => item.order_id === id);
  return { ...order, items, settings: data.settings };
}

export function createProduct(payload) {
  const data = readData();
  if (data.products.some((product) => product.sku.toLowerCase() === String(payload.sku).trim().toLowerCase())) {
    throw new Error('SKU đã tồn tại.');
  }
  const now = new Date().toISOString();
  const record = {
    id: nextId(data, 'products'),
    sku: String(payload.sku).trim(),
    name: String(payload.name).trim(),
    category: String(payload.category || '').trim(),
    price: Number(payload.price || 0),
    cost: Number(payload.cost || 0),
    stock: Number(payload.stock || 0),
    unit: String(payload.unit || 'cái').trim(),
    is_active: 1,
    created_at: now,
    updated_at: now
  };
  data.products.push(record);
  writeData(data);
  return record;
}

export function updateProduct(id, payload) {
  const data = readData();
  const index = data.products.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('Không tìm thấy sản phẩm.');
  const duplicate = data.products.find((item) => item.id !== id && item.sku.toLowerCase() === String(payload.sku).trim().toLowerCase());
  if (duplicate) throw new Error('SKU đã tồn tại.');
  data.products[index] = {
    ...data.products[index],
    sku: String(payload.sku).trim(),
    name: String(payload.name).trim(),
    category: String(payload.category || '').trim(),
    price: Number(payload.price || 0),
    cost: Number(payload.cost || 0),
    stock: Number(payload.stock || 0),
    unit: String(payload.unit || 'cái').trim(),
    is_active: Number(payload.is_active ?? 1),
    updated_at: new Date().toISOString()
  };
  writeData(data);
  return data.products[index];
}

export function hideProduct(id) {
  const data = readData();
  const index = data.products.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('Không tìm thấy sản phẩm.');
  data.products[index].is_active = 0;
  data.products[index].updated_at = new Date().toISOString();
  writeData(data);
}

export function createCustomer(payload) {
  const data = readData();
  const now = new Date().toISOString();
  const record = {
    id: nextId(data, 'customers'),
    name: String(payload.name).trim(),
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim(),
    note: String(payload.note || '').trim(),
    points: 0,
    created_at: now,
    updated_at: now
  };
  data.customers.push(record);
  writeData(data);
  return record;
}

export function createOrder(payload, user) {
  const data = readData();
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) throw new Error('Giỏ hàng đang trống.');

  for (const item of items) {
    const product = data.products.find((product) => product.id === Number(item.product_id) && product.is_active === 1);
    if (!product) throw new Error(`Sản phẩm ID ${item.product_id} không tồn tại.`);
    if (product.stock < Number(item.quantity)) {
      throw new Error(`Tồn kho không đủ cho sản phẩm ${product.name}.`);
    }
  }

  const now = new Date().toISOString();
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const discount = Math.max(0, Number(payload.discount || 0));
  const total = Math.max(0, subtotal - discount);
  const orderId = nextId(data, 'orders');
  const orderNo = `BB${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${1000 + orderId}`;
  let costTotal = 0;
  let itemCount = 0;

  const order = {
    id: orderId,
    order_no: orderNo,
    customer_id: payload.customer_id ? Number(payload.customer_id) : null,
    customer_name: String(payload.customer_name || 'Khách lẻ'),
    source: String(payload.source || 'direct'),
    subtotal,
    discount,
    total,
    payment_method: String(payload.payment_method || 'cash'),
    note: String(payload.note || ''),
    cashier_id: user.id,
    cashier_name: user.name,
    item_count: 0,
    cost_total: 0,
    profit: 0,
    created_at: now
  };

  data.orders.push(order);

  for (const item of items) {
    const productIndex = data.products.findIndex((product) => product.id === Number(item.product_id));
    const product = data.products[productIndex];
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const lineCost = Number(product.cost || 0) * quantity;
    costTotal += lineCost;
    itemCount += quantity;

    data.products[productIndex].stock -= quantity;
    data.products[productIndex].updated_at = now;

    data.orderItems.push({
      id: nextId(data, 'orderItems'),
      order_id: orderId,
      product_id: Number(item.product_id),
      product_name: String(item.product_name),
      quantity,
      price,
      unit_cost: Number(product.cost || 0),
      total: price * quantity,
      profit: price * quantity - lineCost
    });

    data.inventoryTransactions.push({
      id: nextId(data, 'inventoryTransactions'),
      product_id: Number(item.product_id),
      type: 'sale',
      quantity: -Math.abs(quantity),
      note: `Bán hàng ${orderNo}`,
      created_at: now,
      created_by: user.name
    });
  }

  order.item_count = itemCount;
  order.cost_total = costTotal;
  order.profit = total - costTotal;

  if (payload.customer_id) {
    const customerIndex = data.customers.findIndex((item) => item.id === Number(payload.customer_id));
    if (customerIndex >= 0) {
      data.customers[customerIndex].points += Math.floor(total / 10000);
      data.customers[customerIndex].updated_at = now;
    }
  }

  writeData(data);
  return getOrderById(orderId);
}

export function createPurchase(payload, user) {
  const data = readData();
  const productId = Number(payload.product_id);
  const quantity = Number(payload.quantity || 0);
  const cost = Number(payload.cost || 0);
  if (!productId || quantity <= 0 || cost < 0) {
    throw new Error('Sản phẩm, số lượng và giá nhập phải hợp lệ.');
  }
  const productIndex = data.products.findIndex((item) => item.id === productId && item.is_active === 1);
  if (productIndex === -1) throw new Error('Không tìm thấy sản phẩm để nhập hàng.');

  const now = new Date().toISOString();
  const purchaseId = nextId(data, 'purchases');
  const purchase = {
    id: purchaseId,
    product_id: productId,
    product_name: data.products[productIndex].name,
    supplier: String(payload.supplier || '').trim(),
    quantity,
    cost,
    total_cost: quantity * cost,
    note: String(payload.note || '').trim(),
    created_at: now,
    created_by: user.name,
    created_by_role: user.role
  };

  data.purchases.push(purchase);
  data.products[productIndex].stock += quantity;
  data.products[productIndex].cost = cost;
  data.products[productIndex].updated_at = now;
  data.inventoryTransactions.push({
    id: nextId(data, 'inventoryTransactions'),
    product_id: productId,
    type: 'purchase',
    quantity,
    note: `Nhập hàng #${purchaseId}`,
    created_at: now,
    created_by: user.name
  });

  writeData(data);
  return purchase;
}

export function getPurchases() {
  return sortByNewest(readData().purchases).slice(0, 100);
}

export function getDashboard() {
  const data = readData();
  const now = new Date();
  const day = buildPeriodMetrics(data.orders, startOfDay(now));
  const week = buildPeriodMetrics(data.orders, startOfWeek(now));
  const month = buildPeriodMetrics(data.orders, startOfMonth(now));

  const topMap = new Map();
  for (const item of data.orderItems) {
    const current = topMap.get(item.product_name) || 0;
    topMap.set(item.product_name, current + Number(item.quantity || 0));
  }
  const topProducts = [...topMap.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    periods: { day, week, month },
    productCount: data.products.filter((item) => item.is_active === 1).length,
    customerCount: data.customers.length,
    purchaseCount: data.purchases.length,
    lowStock: data.products.filter((item) => item.is_active === 1 && Number(item.stock) <= 10).sort((a, b) => a.stock - b.stock).slice(0, 8),
    topProducts,
    recentOrders: sortByNewest(data.orders).slice(0, 8),
    recentPurchases: sortByNewest(data.purchases).slice(0, 6)
  };
}

export function getReports() {
  const data = readData();
  const now = new Date();
  const day = buildPeriodMetrics(data.orders, startOfDay(now));
  const week = buildPeriodMetrics(data.orders, startOfWeek(now));
  const month = buildPeriodMetrics(data.orders, startOfMonth(now));
  const purchaseDay = data.purchases.filter((item) => isSameOrAfter(item.created_at, startOfDay(now))).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const purchaseWeek = data.purchases.filter((item) => isSameOrAfter(item.created_at, startOfWeek(now))).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const purchaseMonth = data.purchases.filter((item) => isSameOrAfter(item.created_at, startOfMonth(now))).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  return {
    revenue: { day, week, month },
    purchases: { day: purchaseDay, week: purchaseWeek, month: purchaseMonth }
  };
}

ensureDataFile();
