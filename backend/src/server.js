import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeStore,
  closeStore,
  authenticateUser,
  getUserByToken,
  logoutToken,
  getProducts,
  createProduct,
  updateProduct,
  hideProduct,
  deleteProduct,
  getCustomers,
  createCustomer,
  deleteCustomer,
  getOrders,
  getOrderById,
  createOrder,
  getDashboard,
  getSettings,
  updateSettings,
  createPurchase,
  getPurchases,
  getAdjustments,
  createAdjustment,
  getReports,
  getUsers,
  createUser,
  updateUser
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

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

function userHasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

function requirePermission(permission, message) {
  return (req, res, next) => {
    if (userHasPermission(req.user, permission)) return next();
    return res.status(403).json({ message: message || 'Bạn không có quyền thực hiện thao tác này.' });
  };
}


app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const authRequired = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const user = await getUserByToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
  req.user = user;
  req.token = token;
  next();
});


app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'BaoBao POS API is running' }));
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  try {
    res.json(await authenticateUser(username, password));
  } catch (error) {
    res.status(401).json({ message: error.message || 'Đăng nhập thất bại.' });
  }
}));
app.get('/api/auth/me', authRequired, asyncHandler(async (req, res) => res.json(req.user)));
app.post('/api/auth/logout', authRequired, asyncHandler(async (req, res) => {
  await logoutToken(req.token);
  res.json({ ok: true });
}));

app.get('/api/dashboard', authRequired, asyncHandler(async (_req, res) => res.json(await getDashboard())));
app.get('/api/reports', authRequired, requirePermission('settings.manage', 'Chỉ chủ shop mới được xem báo cáo chi tiết.'), asyncHandler(async (_req, res) => res.json(await getReports())));
app.get('/api/settings', authRequired, asyncHandler(async (_req, res) => res.json(await getSettings())));
app.put('/api/settings', authRequired, requirePermission('settings.manage', 'Bạn không có quyền sửa cài đặt.'), asyncHandler(async (req, res) => res.json(await updateSettings(req.body || {}))));

app.get('/api/products', authRequired, asyncHandler(async (req, res) => res.json(await getProducts(String(req.query.search || '')))));
app.post('/api/products', authRequired, requirePermission('products.manage', 'Bạn không có quyền thêm sản phẩm.'), asyncHandler(async (req, res) => {
  const { sku, name } = req.body;
  if (!sku || !name) return res.status(400).json({ message: 'SKU và tên sản phẩm là bắt buộc.' });
  try {
    res.status(201).json(await createProduct(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo sản phẩm.' });
  }
}));
app.put('/api/products/:id', authRequired, requirePermission('products.manage', 'Bạn không có quyền sửa sản phẩm.'), asyncHandler(async (req, res) => {
  try {
    res.json(await updateProduct(Number(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể cập nhật sản phẩm.' });
  }
}));
app.delete('/api/products/:id', authRequired, requirePermission('products.delete', 'Bạn không có quyền ẩn sản phẩm.'), asyncHandler(async (req, res) => {
  try {
    await hideProduct(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể ẩn sản phẩm.' });
  }
}));

app.delete('/api/products/:id/hard', authRequired, requirePermission('products.delete', 'Bạn không có quyền xóa sản phẩm.'), asyncHandler(async (req, res) => {
  try {
    await deleteProduct(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể xóa hẳn sản phẩm.' });
  }
}));

app.get('/api/customers', authRequired, asyncHandler(async (req, res) => res.json(await getCustomers(String(req.query.search || '')))));
app.delete('/api/customers/:id', authRequired, requirePermission('customers.manage', 'Bạn không có quyền xóa khách hàng.'), asyncHandler(async (req, res) => {
  try {
    await deleteCustomer(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể xóa khách hàng.' });
  }
}));
app.post('/api/customers', authRequired, requirePermission('customers.manage', 'Bạn không có quyền thêm khách hàng.'), asyncHandler(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: 'Tên khách hàng là bắt buộc.' });
  try {
    res.status(201).json(await createCustomer(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo khách hàng.' });
  }
}));

app.get('/api/orders', authRequired, requirePermission('orders.view', 'Bạn không có quyền xem đơn hàng.'), asyncHandler(async (_req, res) => res.json(await getOrders())));
app.get('/api/orders/:id', authRequired, requirePermission('orders.view', 'Bạn không có quyền xem đơn hàng.'), asyncHandler(async (req, res) => {
  const order = await getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json(order);
}));
app.post('/api/orders', authRequired, requirePermission('orders.create', 'Bạn không có quyền lên đơn.'), asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await createOrder(req.body, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo đơn hàng.' });
  }
}));

app.get('/api/purchases', authRequired, requirePermission('purchases.manage', 'Bạn không có quyền xem nhập hàng.'), asyncHandler(async (_req, res) => res.json(await getPurchases())));
app.post('/api/purchases', authRequired, requirePermission('purchases.manage', 'Bạn không có quyền nhập hàng.'), asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await createPurchase(req.body, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể nhập hàng.' });
  }
}));
app.get('/api/adjustments', authRequired, requirePermission('adjustments.manage', 'Bạn không có quyền xem xuất hủy.'), asyncHandler(async (_req, res) => res.json(await getAdjustments())));
app.post('/api/adjustments', authRequired, requirePermission('adjustments.manage', 'Bạn không có quyền xuất hủy.'), asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await createAdjustment(req.body, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể xuất hủy hàng.' });
  }
}));


app.get('/api/users', authRequired, requirePermission('users.manage', 'Bạn không có quyền xem tài khoản.'), asyncHandler(async (_req, res) => res.json(await getUsers())));
app.post('/api/users', authRequired, requirePermission('users.manage', 'Bạn không có quyền tạo tài khoản.'), asyncHandler(async (req, res) => {
  try {
    const payload = { ...req.body, permissions: Array.isArray(req.body?.permissions) ? req.body.permissions.filter((item) => ALL_PERMISSIONS.includes(item)) : [] };
    res.status(201).json(await createUser(payload));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo tài khoản.' });
  }
}));
app.put('/api/users/:id', authRequired, requirePermission('users.manage', 'Bạn không có quyền cập nhật quyền.'), asyncHandler(async (req, res) => {
  try {
    const payload = { ...req.body, permissions: Array.isArray(req.body?.permissions) ? req.body.permissions.filter((item) => ALL_PERMISSIONS.includes(item)) : [] };
    res.json(await updateUser(Number(req.params.id), payload, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể cập nhật tài khoản.' });
  }
}));

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
});

await initializeStore();

const server = app.listen(PORT, HOST, () => {
  console.log(`BaoBao POS API listening on http://${HOST}:${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await closeStore();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
