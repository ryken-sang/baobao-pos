import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const emptyProductForm = { sku: '', name: '', category: '', price: 0, cost: 0, stock: 0, unit: 'cái', image_url: '' };
const emptyCustomerForm = { name: '', phone: '', email: '', note: '' };
const emptySettings = { storeName: '', storePhone: '', storeAddress: '', invoiceFooter: '' };
const emptyPurchaseForm = { product_id: '', quantity: 1, cost: 0, supplier: '', note: '' };
const emptyAdjustmentForm = { product_id: '', quantity: 1, reason: 'Hàng lỗi', note: '' };
const defaultAssistantPermissions = ['orders.create', 'orders.view', 'purchases.manage', 'adjustments.manage'];
const emptyUserForm = { name: '', username: '', password: '', permissions: [...defaultAssistantPermissions], is_active: 1 };

const paymentOptions = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'card', label: 'Thẻ' }
];
const sourceOptions = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'direct', label: 'Tại shop' }
];
const permissionOptions = [
  { key: 'orders.create', label: 'Lên đơn' },
  { key: 'orders.view', label: 'Xem đơn hàng' },
  { key: 'purchases.manage', label: 'Nhập hàng' },
  { key: 'adjustments.manage', label: 'Xuất hủy' },
  { key: 'products.manage', label: 'Quản lý sản phẩm' },
  { key: 'products.delete', label: 'Ẩn / xóa sản phẩm' },
  { key: 'customers.manage', label: 'Quản lý khách hàng' },
  { key: 'settings.manage', label: 'Cài đặt & báo cáo' },
  { key: 'users.manage', label: 'Cấp / thu hồi quyền' }
];

const currency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';
const sourceLabel = (value) => sourceOptions.find((item) => item.value === value)?.label || value || '-';
const paymentLabel = (value) => paymentOptions.find((item) => item.value === value)?.label || value;
const zeroReports = { revenue: { day: {}, week: {}, month: {} }, purchases: { day: 0, week: 0, month: 0 }, adjustments: { day: 0, week: 0, month: 0 } };

function togglePermission(list, key) {
  return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
}


function loadFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không xử lý được ảnh đã chọn.'));
    image.src = src;
  });
}

async function fileToOptimizedDataUrl(file) {
  const rawDataUrl = await loadFileAsDataUrl(file);
  const image = await loadImageElement(rawDataUrl);
  const maxWidth = 1200;
  const maxHeight = 1200;
  const ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function printOrder(order, settings) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${order.order_no}</title><style>body{font-family:Arial;padding:8px}.bill{width:80mm;margin:0 auto}.center{text-align:center}.row{display:flex;justify-content:space-between;gap:8px}.muted{color:#555;font-size:12px}.line{border-top:1px dashed #444;margin:8px 0}table{width:100%;border-collapse:collapse;font-size:12px}td{padding:4px 0;vertical-align:top}.total{font-size:16px;font-weight:700}</style></head><body onload="window.print();window.close();"><div class="bill"><div class="center"><h2 style="margin:0 0 6px;">${settings.storeName || 'BaoBao POS'}</h2><div class="muted">${settings.storePhone || ''}</div><div class="muted">${settings.storeAddress || ''}</div></div><div class="line"></div><div class="row"><strong>Mã đơn</strong><span>${order.order_no}</span></div><div class="row"><span>Thời gian</span><span>${formatDateTime(order.created_at)}</span></div><div class="row"><span>Nguồn đơn</span><span>${sourceLabel(order.source)}</span></div><div class="row"><span>Khách hàng</span><span>${order.customer_name || 'Khách lẻ'}</span></div><div class="row"><span>Người lên đơn</span><span>${order.cashier_name || ''}</span></div><div class="row"><span>Thanh toán</span><span>${paymentLabel(order.payment_method)}</span></div><div class="line"></div><table><tbody>${(order.items || []).map((item) => `<tr><td>${item.product_name}<div class="muted">${item.quantity} x ${currency(item.price)}</div></td><td style="text-align:right;">${currency(item.total)}</td></tr>`).join('')}</tbody></table><div class="line"></div><div class="row"><span>Tạm tính</span><span>${currency(order.subtotal)}</span></div><div class="row"><span>Giảm giá</span><span>${currency(order.discount)}</span></div><div class="row total"><span>Thành tiền</span><span>${currency(order.total)}</span></div><div class="line"></div><div class="center muted">${settings.invoiceFooter || 'Cảm ơn bạn đã mua hàng.'}</div></div></body></html>`;
  const popup = window.open('', '_blank', 'width=420,height=700');
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}

function StatCard({ title, value, hint, soft }) {
  return <div className={`panel stat-card ${soft ? 'soft-panel' : 'gradient-card'}`}><div className="tiny muted">{title}</div><strong>{value}</strong>{hint ? <div className="tiny muted">{hint}</div> : null}</div>;
}


function ProductThumb({ src, alt, size = 'md' }) {
  return src ? (
    <img className={`product-thumb ${size}`} src={src} alt={alt || 'Sản phẩm'} loading="lazy" />
  ) : (
    <div className={`product-thumb placeholder ${size}`} aria-hidden="true">🩷</div>
  );
}

function LoginScreen({ onLogin, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="hero-badge">BaoBao POS V11</div>
        <div className="brand-logo large">BB</div>
        <h1>Đăng nhập cửa hàng</h1>
        <p className="muted center-text">Bản tối ưu cho chủ shop, trợ lý và phân quyền linh hoạt 🌷</p>
        {error ? <div className="alert error">{error}</div> : null}
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onLogin({ username, password }); }}>
          <label><span>Tài khoản</span><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tài khoản" /></label>
          <label><span>Mật khẩu</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" /></label>
          <button className="primary-button" disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        </form>
      </div>
    </div>
  );
}

function OrderDetail({ order, settings, canSeeProfit }) {
  if (!order) return <div className="empty-state"><strong>Chọn một đơn hàng để xem chi tiết</strong></div>;
  return (
    <div className="stack-list">
      <div className="panel-header"><h3>{order.order_no}</h3><button className="ghost-button small" onClick={() => printOrder(order, settings)}>🖨️ In bill</button></div>
      <div className="list-row compact"><span>Khách hàng</span><strong>{order.customer_name || 'Khách lẻ'}</strong></div>
      <div className="list-row compact"><span>Nguồn đơn</span><strong>{sourceLabel(order.source)}</strong></div>
      <div className="list-row compact"><span>Người lên đơn</span><strong>{order.cashier_name || '-'}</strong></div>
      <div className="list-row compact"><span>Thời gian</span><strong>{formatDateTime(order.created_at)}</strong></div>
      <div className="list-row compact"><span>Thanh toán</span><strong>{paymentLabel(order.payment_method)}</strong></div>
      {(order.items || []).map((item) => <div key={item.id} className="list-row"><div className="product-inline"><ProductThumb src={item.image_url} alt={item.product_name} size="xs" /><div><strong>{item.product_name}</strong><div className="tiny muted">{item.quantity} x {currency(item.price)}</div></div></div><strong>{currency(item.total)}</strong></div>)}
      <div className="list-row compact"><span>Tạm tính</span><strong>{currency(order.subtotal)}</strong></div>
      <div className="list-row compact"><span>Giảm giá</span><strong>{currency(order.discount)}</strong></div>
      <div className="list-row compact emphasis"><span>Thành tiền</span><strong>{currency(order.total)}</strong></div>
      {canSeeProfit ? <div className="list-row compact"><span>Lợi nhuận</span><strong>{currency(order.profit)}</strong></div> : null}
    </div>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState({ periods: { day: {}, week: {}, month: {} }, topProducts: [], lowStock: [], recentOrders: [], recentPurchases: [] });
  const [reports, setReports] = useState(zeroReports);
  const [settings, setSettings] = useState(emptySettings);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [source, setSource] = useState('facebook');
  const [discount, setDiscount] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productImageLoading, setProductImageLoading] = useState(false);

  const isOwner = user?.role === 'owner';
  const hasPermission = (permission) => isOwner || (Array.isArray(user?.permissions) && user.permissions.includes(permission));

  const tabs = useMemo(() => {
    if (!user) return [];
    const items = [{ key: 'dashboard', label: 'Tổng quan', icon: '📊' }];
    if (hasPermission('orders.create')) items.push({ key: 'pos', label: 'Lên đơn', icon: '🛒' });
    if (hasPermission('products.manage')) items.push({ key: 'products', label: 'Sản phẩm', icon: '📦' });
    if (hasPermission('customers.manage')) items.push({ key: 'customers', label: 'Khách', icon: '💁' });
    if (hasPermission('orders.view')) items.push({ key: 'orders', label: 'Đơn hàng', icon: '🧾' });
    if (hasPermission('purchases.manage')) items.push({ key: 'purchases', label: 'Nhập hàng', icon: '📥' });
    if (hasPermission('adjustments.manage')) items.push({ key: 'adjustments', label: 'Xuất hủy', icon: '🗑️' });
    if (hasPermission('settings.manage')) items.push({ key: 'settings', label: 'Cài đặt', icon: '⚙️' });
    if (hasPermission('users.manage')) items.push({ key: 'users', label: 'Tài khoản', icon: '🛡️' });
    return items;
  }, [user]);

  const selectedCustomer = useMemo(() => customers.find((c) => String(c.id) === String(selectedCustomerId)) || null, [customers, selectedCustomerId]);
  const selectedPurchaseProduct = useMemo(() => products.find((product) => String(product.id) === String(purchaseForm.product_id)) || null, [products, purchaseForm.product_id]);
  const selectedAdjustmentProduct = useMemo(() => products.find((product) => String(product.id) === String(adjustmentForm.product_id)) || null, [products, adjustmentForm.product_id]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0), [cart]);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const pushSuccess = (message) => { setSuccess(message); setTimeout(() => setSuccess(''), 2500); };
  const pushError = (message) => { setError(message); setTimeout(() => setError(''), 2800); };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [dashboardData, reportData, productData, customerData, orderData, purchaseData, adjustmentData, settingsData, usersData] = await Promise.all([
        api.getDashboard(),
        hasPermission('settings.manage') ? api.getReports() : Promise.resolve(zeroReports),
        api.getProducts(),
        api.getCustomers(),
        hasPermission('orders.view') ? api.getOrders() : Promise.resolve([]),
        hasPermission('purchases.manage') ? api.getPurchases() : Promise.resolve([]),
        hasPermission('adjustments.manage') ? api.getAdjustments() : Promise.resolve([]),
        api.getSettings(),
        hasPermission('users.manage') ? api.getUsers() : Promise.resolve([])
      ]);
      setDashboard(dashboardData);
      setReports(reportData);
      setProducts(productData);
      setCustomers(customerData);
      setOrders(orderData);
      setPurchases(purchaseData);
      setAdjustments(adjustmentData);
      setSettings(settingsData);
      setUsersList(usersData);
      if (!tabs.find((tab) => tab.key === activeTab)) setActiveTab('dashboard');
    } catch (err) {
      if (err.status === 401) { api.clearToken(); setUser(null); }
      pushError(err.message || 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!api.getToken()) return;
        setUser(await api.me());
      } catch {
        api.clearToken();
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        const [productData, customerData] = await Promise.all([api.getProducts(productSearch), api.getCustomers(customerSearch)]);
        setProducts(productData);
        setCustomers(customerData);
      } catch (err) {
        pushError(err.message || 'Không tìm kiếm được dữ liệu.');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch, customerSearch, user]);

  const handleLogin = async (payload) => {
    try {
      setAuthLoading(true);
      setLoginError('');
      const result = await api.login(payload);
      setUser(result.user);
    } catch (err) {
      setLoginError(err.message || 'Không thể đăng nhập.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setCart([]);
    setSelectedOrder(null);
    setActiveTab('dashboard');
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Xóa khách hàng "${customer.name}"?`)) return;
    try {
      await api.deleteCustomer(customer.id);
      if (String(selectedCustomerId) === String(customer.id)) setSelectedCustomerId('');
      pushSuccess('Đã xóa khách hàng.');
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không thể xóa khách hàng.');
    }
  };

  const handleHardDeleteProduct = async (product) => {
    if (!window.confirm(`Xóa hẳn sản phẩm "${product.name}"? Chỉ nên xóa khi chưa có phát sinh.`)) return;
    try {
      await api.hardDeleteProduct(product.id);
      pushSuccess('Đã xóa sản phẩm.');
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không thể xóa sản phẩm.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser({ ...userForm, role: 'assistant' });
      setUserForm(emptyUserForm);
      pushSuccess('Đã tạo tài khoản nhân viên.');
      await loadAll();
      setActiveTab('users');
    } catch (err) {
      pushError(err.message || 'Không thể tạo tài khoản.');
    }
  };

  const handleSaveUser = async (member) => {
    try {
      await api.updateUser(member.id, { name: member.name, is_active: member.is_active ? 1 : 0, permissions: member.permissions || [] });
      pushSuccess('Đã cập nhật quyền của tài khoản.');
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không thể cập nhật tài khoản.');
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return pushError('Sản phẩm đã hết hàng.');
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stock) return prev;
        return prev.map((item) => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id, product_name: product.name, image_url: product.image_url || '', price: product.price, quantity: 1, stock: product.stock }];
    });
  };

  const updateCartItem = (productId, patch) => {
    setCart((prev) => prev.map((item) => item.product_id === productId ? { ...item, ...patch } : item).filter((item) => item.quantity > 0));
  };

  const clearCart = () => { setCart([]); setDiscount(0); setOrderNote(''); setSource('facebook'); };

  const checkout = async () => {
    if (!cart.length) return pushError('Giỏ hàng đang trống.');
    try {
      const payload = {
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        customer_name: selectedCustomer ? selectedCustomer.name : 'Khách lẻ',
        payment_method: paymentMethod,
        source,
        discount: Number(discount || 0),
        note: orderNote,
        items: cart
      };
      const order = await api.createOrder(payload);
      pushSuccess('Đã lên đơn thành công 🎉');
      clearCart();
      setSelectedCustomerId('');
      setPaymentMethod('cash');
      setSelectedOrder(order);
      await loadAll();
      if (hasPermission('orders.view')) setActiveTab('orders');
    } catch (err) {
      pushError(err.message || 'Không thể tạo đơn hàng.');
    }
  };



  const handleProductImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      pushError('Vui lòng chọn đúng file hình ảnh.');
      event.target.value = '';
      return;
    }
    try {
      setProductImageLoading(true);
      const optimizedDataUrl = await fileToOptimizedDataUrl(file);
      setProductForm((prev) => ({ ...prev, image_url: optimizedDataUrl }));
      pushSuccess('Đã tải ảnh lên sản phẩm.');
    } catch (err) {
      pushError(err.message || 'Không xử lý được ảnh đã chọn.');
    } finally {
      setProductImageLoading(false);
      event.target.value = '';
    }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, productForm);
        pushSuccess('Đã cập nhật sản phẩm.');
      } else {
        await api.createProduct(productForm);
        pushSuccess('Đã thêm sản phẩm mới.');
      }
      setProductForm(emptyProductForm);
      setEditingProductId(null);
      setProductImageLoading(false);
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không lưu được sản phẩm.');
    }
  };

  const submitCustomer = async (e) => {
    e.preventDefault();
    try {
      const newCustomer = await api.createCustomer(customerForm);
      setCustomerForm(emptyCustomerForm);
      setSelectedCustomerId(String(newCustomer.id));
      pushSuccess('Đã thêm khách hàng mới.');
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không lưu được khách hàng.');
    }
  };

  const submitPurchase = async (e) => {
    e.preventDefault();
    try {
      await api.createPurchase(purchaseForm);
      setPurchaseForm(emptyPurchaseForm);
      pushSuccess('Đã nhập hàng và cộng tồn kho.');
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không thể nhập hàng.');
    }
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.createAdjustment(adjustmentForm);
      setAdjustmentForm(emptyAdjustmentForm);
      pushSuccess('Đã xuất hủy và trừ tồn kho.');
      await loadAll();
    } catch (err) {
      pushError(err.message || 'Không thể xuất hủy hàng.');
    }
  };

  const openOrder = async (id) => {
    try {
      setSelectedOrder(await api.getOrderById(id));
    } catch (err) {
      pushError(err.message || 'Không đọc được đơn hàng.');
    }
  };

  if (booting) return <div className="login-shell"><div className="panel">Đang khởi tạo...</div></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} loading={authLoading} error={loginError} />;

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-only">
        <div className="brand-card"><div className="brand-logo">BB</div><div><h1>{settings.storeName || 'BaoBao POS'}</h1><p>{isOwner ? 'Chủ shop' : 'Nhân viên'} • V11</p></div></div>
        <nav className="nav-list">{tabs.map((tab) => <button key={tab.key} className={`nav-item ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}><span>{tab.icon}</span><span>{tab.label}</span></button>)}</nav>
        <div className="sidebar-note"><strong>Đồng bộ iPhone + PC</strong><p>Mọi thiết bị dùng cùng 1 server sẽ thấy cùng dữ liệu.</p><div className="tiny muted">API: {api.getApiUrl()}</div></div>
      </aside>

      <main className="main-content">
        <header className="topbar mobile-topbar">
          <div><div className="hero-badge">BaoBao POS V11</div><h2>{tabs.find((tab) => tab.key === activeTab)?.label || 'BaoBao POS'}</h2><p className="muted">{settings.storeName || 'BaoBao POS'} • {user.name}</p></div>
          <div className="toolbar-actions"><button className="ghost-button" onClick={loadAll}>↻ Làm mới</button><button className="ghost-button" onClick={handleLogout}>Đăng xuất</button></div>
        </header>

        {error ? <div className="alert error">{error}</div> : null}
        {success ? <div className="alert success">{success}</div> : null}
        {loading ? <div className="panel">Đang tải dữ liệu...</div> : null}

        {!loading && activeTab === 'dashboard' && (
          <section className="content-grid page-bottom-space">
            <div className="stats-grid">
              <StatCard title="Doanh thu hôm nay" value={currency(reports.revenue.day.revenue)} hint={`${reports.revenue.day.orders || 0} đơn`} />
              <StatCard title="Doanh thu tuần này" value={currency(reports.revenue.week.revenue)} hint={`${reports.revenue.week.orders || 0} đơn`} />
              <StatCard title="Doanh thu tháng này" value={currency(reports.revenue.month.revenue)} hint={`${reports.revenue.month.orders || 0} đơn`} />
              <StatCard title="Tiền nhập tháng này" value={currency(reports.purchases.month)} hint={`${dashboard.purchaseCount || 0} phiếu nhập`} soft />
              <StatCard title="Xuất hủy tháng này" value={currency(reports.adjustments?.month || 0)} hint={`${dashboard.adjustmentCount || 0} lần`} soft />
            </div>
            {isOwner ? <div className="stats-grid"><StatCard title="Lợi nhuận hôm nay" value={currency(reports.revenue.day.profit)} /><StatCard title="Lợi nhuận tuần này" value={currency(reports.revenue.week.profit)} /><StatCard title="Lợi nhuận tháng này" value={currency(reports.revenue.month.profit)} /><StatCard title="Giá vốn tháng này" value={currency(reports.revenue.month.cost)} soft /></div> : null}
            <div className="content-grid two-columns uneven-columns">
              <div className="panel"><div className="panel-header"><h3>Đơn gần đây</h3></div><div className="stack-list">{dashboard.recentOrders.map((order) => <button key={order.id} className="order-card" onClick={() => { if (hasPermission('orders.view')) { setActiveTab('orders'); openOrder(order.id); } }}><div><strong>{order.order_no}</strong><div className="muted tiny">{sourceLabel(order.source)} • {formatDateTime(order.created_at)}</div></div><strong>{currency(order.total)}</strong></button>)}</div></div>
              <div className="panel"><div className="panel-header"><h3>Lịch sử nhập hàng</h3></div><div className="stack-list">{dashboard.recentPurchases.map((purchase) => <div key={purchase.id} className="list-row"><div className="product-inline"><ProductThumb src={purchase.image_url} alt={purchase.product_name} size="xs" /><div><strong>{purchase.product_name}</strong><div className="muted tiny">{formatDateTime(purchase.created_at)} • {purchase.created_by}</div></div></div><strong>+{purchase.quantity}</strong></div>)}</div></div>
            </div>
          </section>
        )}

        {!loading && activeTab === 'pos' && hasPermission('orders.create') && (
          <section className="content-grid pos-layout page-bottom-space">
            <div className="panel">
              <div className="panel-header wrap-mobile"><div><h3>Chọn sản phẩm lên đơn</h3><p className="muted tiny">Giá bán nhập linh hoạt theo từng khách, từng thời điểm.</p></div><input className="search-input" placeholder="Tìm sản phẩm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
              <div className="stack-list">{products.map((product) => <button key={product.id} className="product-pick-card" onClick={() => addToCart(product)}><div className="product-inline"><ProductThumb src={product.image_url} alt={product.name} size="sm" /><div><strong>{product.name}</strong><div className="muted tiny">{product.sku} • {product.category || 'Chưa phân loại'}</div></div></div><div className="product-pick-side"><strong>{currency(product.price)}</strong><span className={`stock-badge ${product.stock <= 10 ? 'danger' : ''}`}>Tồn {product.stock}</span></div></button>)}</div>
            </div>
            <div className="panel">
              <div className="panel-header"><h3>Giỏ hàng</h3><button className="ghost-button small" onClick={clearCart}>Xóa giỏ</button></div>
              <div className="form-grid">
                <label><span>Nguồn đơn</span><select value={source} onChange={(e) => setSource(e.target.value)}>{sourceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label><span>Khách hàng</span><select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}><option value="">Khách lẻ</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                <label><span>Thanh toán</span><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{paymentOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label><span>Giảm giá</span><input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
                <label className="field-block"><span>Ghi chú</span><textarea rows="3" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} /></label>
              </div>
              <div className="stack-list">{cart.map((item) => <div key={item.product_id} className="cart-card"><div className="list-row compact"><div className="product-inline"><ProductThumb src={item.image_url} alt={item.product_name} size="xs" /><strong>{item.product_name}</strong></div><button className="ghost-button small danger-text" onClick={() => updateCartItem(item.product_id, { quantity: 0 })}>Xóa</button></div><div className="cart-grid"><label><span>SL</span><input type="number" min="1" max={item.stock} value={item.quantity} onChange={(e) => updateCartItem(item.product_id, { quantity: Math.max(1, Math.min(Number(e.target.value || 1), item.stock)) })} /></label><label><span>Giá bán</span><input type="number" min="0" value={item.price} onChange={(e) => updateCartItem(item.product_id, { price: Number(e.target.value || 0) })} /></label></div><div className="list-row compact"><span className="tiny muted">Tạm tính</span><strong>{currency(item.price * item.quantity)}</strong></div></div>)}{!cart.length ? <div className="empty-state">Chưa có sản phẩm trong giỏ.</div> : null}</div>
              <div className="checkout-box"><div className="list-row compact"><span>Tạm tính</span><strong>{currency(subtotal)}</strong></div><div className="list-row compact"><span>Giảm giá</span><strong>{currency(discount)}</strong></div><div className="list-row compact emphasis"><span>Thành tiền</span><strong>{currency(total)}</strong></div><button className="primary-button" onClick={checkout}>Lên đơn</button></div>
            </div>
          </section>
        )}

        {!loading && activeTab === 'products' && hasPermission('products.manage') && (
          <section className="content-grid two-columns page-bottom-space">
            <div className="panel"><div className="panel-header wrap-mobile"><div><h3>Danh sách sản phẩm</h3><p className="muted tiny">Quản lý giá nhập, tồn, lần nhập cuối và có thể ẩn hoặc xóa hẳn sản phẩm.</p></div><input className="search-input" placeholder="Tìm sản phẩm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div><div className="stack-list">{products.map((product) => <div key={product.id} className="list-row product-row"><div className="product-inline product-inline-top"><ProductThumb src={product.image_url} alt={product.name} size="md" /><div><strong>{product.name}</strong><div className="muted tiny">{product.sku} • {product.category || 'Chưa phân loại'} • {product.unit}</div><div className="tiny price-compact">Giá gợi ý: {currency(product.price)} • Giá nhập: {currency(product.cost)}</div><div className="tiny muted">Lần nhập cuối: {product.last_purchase_at ? formatDateTime(product.last_purchase_at) : 'Chưa có'}{product.last_purchase_cost ? ` • ${currency(product.last_purchase_cost)}` : ''}</div></div></div><div className="row-actions"><span className={`stock-badge ${product.stock <= 10 ? 'danger' : ''}`}>Tồn {product.stock}</span><button className="ghost-button small" onClick={() => { setEditingProductId(product.id); setProductForm({ sku: product.sku, name: product.name, category: product.category || '', price: product.price, cost: product.cost, stock: product.stock, unit: product.unit || 'cái', image_url: product.image_url || '' }); }}>Sửa</button>{hasPermission('adjustments.manage') ? <button className="ghost-button small warning-text" onClick={() => { setAdjustmentForm({ product_id: String(product.id), quantity: 1, reason: 'Hàng lỗi', note: '' }); setActiveTab('adjustments'); }}>Xuất hủy</button> : null}{hasPermission('products.delete') ? <button className="ghost-button small danger-text" onClick={async () => { if (!window.confirm('Ẩn sản phẩm này?')) return; await api.deleteProduct(product.id); await loadAll(); }}>Ẩn</button> : null}{hasPermission('products.delete') ? <button className="ghost-button small danger-text" onClick={() => handleHardDeleteProduct(product)}>Xóa</button> : null}</div></div>)}</div></div>
            <div className="panel"><div className="panel-header"><div><h3>{editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3><p className="muted tiny">Bạn có thể tải ảnh trực tiếp từ điện thoại/PC hoặc dán link nếu muốn.</p></div></div><form className="form-grid" onSubmit={submitProduct}><label><span>SKU</span><input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} /></label><label><span>Tên sản phẩm</span><input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label><label><span>Danh mục</span><input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></label><label><span>Đơn vị</span><input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></label><label><span>Giá gợi ý</span><input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label><span>Giá nhập</span><input type="number" min="0" value={productForm.cost} onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })} /></label><label><span>Tồn kho</span><input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label><div className="field-block image-upload-block"><span>Hình ảnh sản phẩm</span><div className="image-upload-card"><div className="product-inline product-inline-top"><ProductThumb src={productForm.image_url} alt={productForm.name || 'Ảnh sản phẩm'} size="lg" /><div className="upload-copy"><strong>{productForm.image_url ? 'Đã có ảnh tham chiếu' : 'Chưa có ảnh sản phẩm'}</strong><div className="tiny muted">Bấm chọn ảnh để tải trực tiếp từ điện thoại hoặc máy tính. Ảnh sẽ được nén nhẹ trước khi lưu.</div></div></div><div className="upload-actions"><label className="primary-button file-picker">{productImageLoading ? 'Đang xử lý ảnh...' : 'Chọn ảnh từ thiết bị'}<input type="file" accept="image/*" onChange={handleProductImageFile} disabled={productImageLoading} /></label>{productForm.image_url ? <button type="button" className="ghost-button" onClick={() => setProductForm({ ...productForm, image_url: '' })}>Xóa ảnh</button> : null}</div><label><span>Hoặc dán link ảnh</span><input value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} placeholder="https://... hoặc ảnh đã tải lên" /></label></div></div><div className="form-actions"><button className="primary-button">{editingProductId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>{editingProductId ? <button type="button" className="ghost-button" onClick={() => { setEditingProductId(null); setProductForm(emptyProductForm); setProductImageLoading(false); }}>Hủy sửa</button> : null}</div></form></div>
          </section>
        )}

        {!loading && activeTab === 'customers' && hasPermission('customers.manage') && (
          <section className="content-grid two-columns page-bottom-space"><div className="panel"><div className="panel-header wrap-mobile"><div><h3>Danh sách khách hàng</h3><p className="muted tiny">Có thể xóa các khách mẫu hoặc khách nhập nhầm. Khách lẻ mặc định sẽ giữ lại.</p></div><input className="search-input" placeholder="Tìm khách hàng..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} /></div><div className="stack-list">{customers.map((customer) => <div key={customer.id} className="list-row"><div><strong>{customer.name}</strong><div className="muted tiny">{customer.phone || 'Chưa có SĐT'} • {customer.email || 'Chưa có email'}</div></div><div className="row-actions"><span className="stock-badge">{customer.points} điểm</span><button className="ghost-button small danger-text" disabled={customer.name === 'Khách lẻ'} onClick={() => handleDeleteCustomer(customer)}>Xóa</button></div></div>)}</div></div><div className="panel"><div className="panel-header"><h3>Thêm khách hàng</h3></div><form className="form-grid" onSubmit={submitCustomer}><label><span>Tên khách</span><input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></label><label><span>Số điện thoại</span><input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></label><label><span>Email</span><input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} /></label><label className="field-block"><span>Ghi chú</span><textarea rows="4" value={customerForm.note} onChange={(e) => setCustomerForm({ ...customerForm, note: e.target.value })} /></label><button className="primary-button">Lưu khách hàng</button></form></div></section>
        )}

        {!loading && activeTab === 'orders' && hasPermission('orders.view') && (
          <section className="content-grid two-columns uneven-columns page-bottom-space"><div className="panel"><div className="panel-header"><h3>Lịch sử đơn hàng</h3><span className="tag">{orders.length} đơn</span></div><div className="stack-list">{orders.map((order) => <button key={order.id} className="order-card" onClick={() => openOrder(order.id)}><div><strong>{order.order_no}</strong><div className="muted tiny">{order.customer_name || 'Khách lẻ'} • {sourceLabel(order.source)} • {formatDateTime(order.created_at)}</div></div><div className="order-card-side"><strong>{currency(order.total)}</strong><div className="muted tiny">{paymentLabel(order.payment_method)}</div></div></button>)}</div></div><div className="panel"><OrderDetail order={selectedOrder} settings={settings} canSeeProfit={isOwner} /></div></section>
        )}

        {!loading && activeTab === 'purchases' && hasPermission('purchases.manage') && (
          <section className="content-grid two-columns uneven-columns page-bottom-space"><div className="panel"><div className="panel-header"><h3>Phiếu nhập hàng</h3><span className="tag">Tự lưu ngày giờ</span></div><form className="form-grid" onSubmit={submitPurchase}><label><span>Sản phẩm</span><select required value={purchaseForm.product_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, product_id: e.target.value })}><option value="">Chọn sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>{selectedPurchaseProduct ? <div className="image-preview-panel inline-preview"><ProductThumb src={selectedPurchaseProduct.image_url} alt={selectedPurchaseProduct.name} size="md" /><div><strong>{selectedPurchaseProduct.name}</strong><div className="tiny muted">Tham chiếu mẫu khi nhập hàng • tồn {selectedPurchaseProduct.stock}</div></div></div> : null}<label><span>Số lượng nhập</span><input type="number" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} /></label><label><span>Giá nhập / 1 SP</span><input type="number" min="0" value={purchaseForm.cost} onChange={(e) => setPurchaseForm({ ...purchaseForm, cost: e.target.value })} /></label><label><span>Nhà cung cấp</span><input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} placeholder="Ví dụ: Xưởng lụa Latin" /></label><label className="field-block"><span>Ghi chú</span><textarea rows="4" value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} /></label><button className="primary-button">Lưu phiếu nhập</button></form></div><div className="panel"><div className="panel-header"><h3>Lịch sử nhập hàng</h3></div><div className="stack-list">{purchases.map((purchase) => <div key={purchase.id} className="list-row"><div className="product-inline"><ProductThumb src={purchase.image_url} alt={purchase.product_name} size="sm" /><div><strong>{purchase.product_name}</strong><div className="muted tiny">{purchase.supplier || 'Chưa ghi NCC'} • {formatDateTime(purchase.created_at)} • {purchase.created_by}</div></div></div><div className="order-card-side"><strong>+{purchase.quantity}</strong><div className="muted tiny">{currency(purchase.total_cost)}</div></div></div>)}{!purchases.length ? <div className="empty-state">Chưa có phiếu nhập hàng nào.</div> : null}</div></div></section>
        )}

        {!loading && activeTab === 'adjustments' && hasPermission('adjustments.manage') && (
          <section className="content-grid two-columns uneven-columns page-bottom-space"><div className="panel"><div className="panel-header"><div><h3>Xuất hủy / trừ tồn</h3><p className="muted tiny">Dùng khi hàng lỗi, thất lạc, cũ hoặc cần bỏ bớt tồn kho.</p></div><span className="tag">Tự lưu ngày giờ</span></div><form className="form-grid" onSubmit={submitAdjustment}><label><span>Sản phẩm</span><select required value={adjustmentForm.product_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, product_id: e.target.value })}><option value="">Chọn sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} • Tồn {product.stock}</option>)}</select></label>{selectedAdjustmentProduct ? <div className="image-preview-panel inline-preview"><ProductThumb src={selectedAdjustmentProduct.image_url} alt={selectedAdjustmentProduct.name} size="md" /><div><strong>{selectedAdjustmentProduct.name}</strong><div className="tiny muted">Tham chiếu mẫu khi xuất hủy • tồn {selectedAdjustmentProduct.stock}</div></div></div> : null}<label><span>Số lượng xuất hủy</span><input type="number" min="1" value={adjustmentForm.quantity} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value })} /></label><label><span>Lý do</span><select value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}><option value="Hàng lỗi">Hàng lỗi</option><option value="Hàng cũ">Hàng cũ</option><option value="Thất lạc">Thất lạc</option><option value="Hàng bể / dơ">Hàng bể / dơ</option><option value="Khác">Khác</option></select></label><label className="field-block"><span>Ghi chú</span><textarea rows="4" value={adjustmentForm.note} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, note: e.target.value })} placeholder="Ví dụ: áo lỗi đường may, set cũ xả kho..." /></label><button className="primary-button danger-button">Lưu phiếu xuất hủy</button></form></div><div className="panel"><div className="panel-header"><h3>Lịch sử xuất hủy</h3><span className="tag">{adjustments.length} phiếu</span></div><div className="stack-list">{adjustments.map((item) => <div key={item.id} className="list-row"><div className="product-inline"><ProductThumb src={item.image_url} alt={item.product_name} size="sm" /><div><strong>{item.product_name}</strong><div className="muted tiny">{item.reason || 'Hàng lỗi'} • {formatDateTime(item.created_at)} • {item.created_by}</div><div className="tiny muted">{item.note || 'Không có ghi chú'}</div></div></div><div className="order-card-side"><strong>-{item.quantity}</strong><div className="muted tiny">{currency(item.total_cost || 0)}</div></div></div>)}{!adjustments.length ? <div className="empty-state">Chưa có phiếu xuất hủy nào.</div> : null}</div></div></section>
        )}

        {!loading && activeTab === 'settings' && hasPermission('settings.manage') && (
          <section className="content-grid two-columns page-bottom-space"><div className="panel"><div className="panel-header"><h3>Cài đặt cửa hàng</h3></div><form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { setSettings(await api.saveSettings(settings)); pushSuccess('Đã lưu cài đặt cửa hàng.'); } catch (err) { pushError(err.message || 'Không lưu được cài đặt.'); } }}><label><span>Tên cửa hàng</span><input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label><label><span>Số điện thoại</span><input value={settings.storePhone} onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })} /></label><label className="field-block"><span>Địa chỉ</span><textarea rows="3" value={settings.storeAddress} onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })} /></label><label className="field-block"><span>Footer hóa đơn</span><textarea rows="3" value={settings.invoiceFooter} onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })} /></label><button className="primary-button">Lưu cài đặt</button></form></div><div className="panel"><div className="panel-header"><h3>Phân quyền hiện tại</h3></div><div className="stack-list"><div className="list-row compact"><span>Tài khoản của bạn</span><strong>{isOwner ? 'Chủ shop - toàn quyền' : 'Nhân viên'}</strong></div>{Array.isArray(user.permissions) ? <div className="permission-chip-grid">{user.permissions.map((permission) => <span key={permission} className="tag">{permissionOptions.find((item) => item.key === permission)?.label || permission}</span>)}</div> : null}<div className="panel soft-panel"><strong>Gợi ý</strong><div className="tiny muted">Muốn cấp thêm hoặc thu hồi quyền cho người dùng khác, vào tab Tài khoản.</div></div></div></div></section>
        )}

        {!loading && activeTab === 'users' && hasPermission('users.manage') && (
          <section className="content-grid two-columns page-bottom-space">
            <div className="panel"><div className="panel-header"><h3>Danh sách tài khoản</h3><span className="tag">{usersList.length} tài khoản</span></div><div className="stack-list">{usersList.map((member) => <div key={member.id} className="panel soft-panel"><div className="list-row compact"><div><strong>{member.name}</strong><div className="tiny muted">@{member.username} • {member.role === 'owner' ? 'Chủ shop' : 'Nhân viên'}</div></div><span className={`stock-badge ${member.is_active ? '' : 'danger'}`}>{member.is_active ? 'Đang dùng' : 'Đã khóa'}</span></div>{member.role === 'owner' ? <div className="tiny muted">Tài khoản chủ shop luôn có toàn quyền và không thể tự khóa.</div> : <><div className="permission-chip-grid">{permissionOptions.map((permission) => <label key={permission.key} className="permission-toggle"><input type="checkbox" checked={(member.permissions || []).includes(permission.key)} onChange={() => setUsersList((prev) => prev.map((item) => item.id === member.id ? { ...item, permissions: togglePermission(item.permissions || [], permission.key) } : item))} /><span>{permission.label}</span></label>)}</div><div className="list-row compact"><label className="permission-toggle"><input type="checkbox" checked={Boolean(member.is_active)} onChange={(e) => setUsersList((prev) => prev.map((item) => item.id === member.id ? { ...item, is_active: e.target.checked ? 1 : 0 } : item))} /><span>Kích hoạt tài khoản</span></label><button className="primary-button small-button" onClick={() => handleSaveUser(member)}>Lưu quyền</button></div></>}</div>)}{!usersList.length ? <div className="empty-state">Chưa có tài khoản nào.</div> : null}</div></div>
            <div className="panel"><div className="panel-header"><h3>Tạo tài khoản nhân viên</h3></div><form className="form-grid" onSubmit={handleCreateUser}><label><span>Tên hiển thị</span><input required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></label><label><span>Tài khoản</span><input required value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></label><label><span>Mật khẩu</span><input required type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></label><div className="field-block"><span>Quyền ban đầu</span><div className="permission-chip-grid">{permissionOptions.map((permission) => <label key={permission.key} className="permission-toggle"><input type="checkbox" checked={userForm.permissions.includes(permission.key)} onChange={() => setUserForm((prev) => ({ ...prev, permissions: togglePermission(prev.permissions, permission.key) }))} /><span>{permission.label}</span></label>)}</div></div><button className="primary-button">Tạo tài khoản</button></form></div>
          </section>
        )}
      </main>

      <nav className="mobile-bottom-nav mobile-only">{tabs.map((tab) => <button key={tab.key} className={`bottom-nav-item ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}><span>{tab.icon}</span><small>{tab.label}</small></button>)}</nav>
    </div>
  );
}
