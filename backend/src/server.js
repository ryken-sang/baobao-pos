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
  getReports
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

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

function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ message: 'Chỉ chủ shop mới có quyền thực hiện thao tác này.' });
  }
  next();
}

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
app.get('/api/reports', authRequired, asyncHandler(async (_req, res) => res.json(await getReports())));
app.get('/api/settings', authRequired, asyncHandler(async (_req, res) => res.json(await getSettings())));
app.put('/api/settings', authRequired, requireOwner, asyncHandler(async (req, res) => res.json(await updateSettings(req.body || {}))));

app.get('/api/products', authRequired, asyncHandler(async (req, res) => res.json(await getProducts(String(req.query.search || '')))));
app.post('/api/products', authRequired, requireOwner, asyncHandler(async (req, res) => {
  const { sku, name } = req.body;
  if (!sku || !name) return res.status(400).json({ message: 'SKU và tên sản phẩm là bắt buộc.' });
  try {
    res.status(201).json(await createProduct(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo sản phẩm.' });
  }
}));
app.put('/api/products/:id', authRequired, requireOwner, asyncHandler(async (req, res) => {
  try {
    res.json(await updateProduct(Number(req.params.id), req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể cập nhật sản phẩm.' });
  }
}));
app.delete('/api/products/:id', authRequired, requireOwner, asyncHandler(async (req, res) => {
  try {
    await hideProduct(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể ẩn sản phẩm.' });
  }
}));

app.delete('/api/products/:id/hard', authRequired, requireOwner, asyncHandler(async (req, res) => {
  try {
    await deleteProduct(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể xóa hẳn sản phẩm.' });
  }
}));

app.get('/api/customers', authRequired, asyncHandler(async (req, res) => res.json(await getCustomers(String(req.query.search || '')))));
app.delete('/api/customers/:id', authRequired, requireOwner, asyncHandler(async (req, res) => {
  try {
    await deleteCustomer(Number(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể xóa khách hàng.' });
  }
}));
app.post('/api/customers', authRequired, asyncHandler(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: 'Tên khách hàng là bắt buộc.' });
  try {
    res.status(201).json(await createCustomer(req.body));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo khách hàng.' });
  }
}));

app.get('/api/orders', authRequired, asyncHandler(async (_req, res) => res.json(await getOrders())));
app.get('/api/orders/:id', authRequired, asyncHandler(async (req, res) => {
  const order = await getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  res.json(order);
}));
app.post('/api/orders', authRequired, asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await createOrder(req.body, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể tạo đơn hàng.' });
  }
}));

app.get('/api/purchases', authRequired, asyncHandler(async (_req, res) => res.json(await getPurchases())));
app.post('/api/purchases', authRequired, asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await createPurchase(req.body, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể nhập hàng.' });
  }
}));
app.get('/api/adjustments', authRequired, asyncHandler(async (_req, res) => res.json(await getAdjustments())));
app.post('/api/adjustments', authRequired, asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await createAdjustment(req.body, req.user));
  } catch (error) {
    res.status(400).json({ message: error.message || 'Không thể xuất hủy hàng.' });
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
