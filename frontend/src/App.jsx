import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import baobaoLogo from './assets/baobao-logo.jpg';

const emptyProductForm = { sku: '', name: '', category: '', price: 0, cost: 0, stock: 0, unit: 'cái' };
const emptyCustomerForm = { name: '', phone: '', email: '', note: '' };
const emptySettings = { storeName: '', storePhone: '', storeAddress: '', invoiceFooter: '' };
const emptyPurchaseForm = { product_id: '', quantity: 1, cost: 0, supplier: '', note: '' };
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

const currency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';
const sourceLabel = (value) => sourceOptions.find((item) => item.value === value)?.label || value || '-';
const paymentLabel = (value) => paymentOptions.find((item) => item.value === value)?.label || value;

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

function LoginScreen({ onLogin, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="hero-badge">BaoBao POS V6</div>
        <img className="brand-logo large image-logo" src={baobaoLogo} alt="BaoBao logo" />
        <h1>Đăng nhập cửa hàng</h1>
        <p className="muted center-text">Phiên bản tối ưu cho shop và trợ lý 🌷</p>
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
      {(order.items || []).map((item) => <div key={item.id} className="list-row"><div><strong>{item.product_name}</strong><div className="tiny muted">{item.quantity} x {currency(item.price)}</div></div><strong>{currency(item.total)}</strong></div>)}
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
  const [reports, setReports] = useState({ revenue: { day: {}, week: {}, month: {} }, purchases: { day: 0, week: 0, month: 0 } });
  const [settings, setSettings] = useState(emptySettings);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
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
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = user?.role === 'owner';
  const tabs = useMemo(() => {
    if (!user) return [];
    const ownerTabs = [
      { key: 'dashboard', label: 'Tổng quan', icon: '📊' },
      { key: 'pos', label: 'Lên đơn', icon: '🛒' },
      { key: 'products', label: 'Sản phẩm', icon: '📦' },
      { key: 'customers', label: 'Khách', icon: '💁' },
      { key: 'orders', label: 'Đơn hàng', icon: '🧾' },
      { key: 'purchases', label: 'Nhập hàng', icon: '📥' },
      { key: 'settings', label: 'Cài đặt', icon: '⚙️' }
    ];
    const assistantTabs = [
      { key: 'dashboard', label: 'Tổng quan', icon: '📊' },
      { key: 'pos', label: 'Lên đơn', icon: '🛒' },
      { key: 'orders', label: 'Đơn hàng', icon: '🧾' },
      { key: 'purchases', label: 'Nhập hàng', icon: '📥' }
    ];
    return isOwner ? ownerTabs : assistantTabs;
  }, [user, isOwner]);

  const selectedCustomer = useMemo(() => customers.find((c) => String(c.id) === String(selectedCustomerId)) || null, [customers, selectedCustomerId]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0), [cart]);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const pushSuccess = (message) => { setSuccess(message); setTimeout(() => setSuccess(''), 2500); };
  const pushError = (message) => { setError(message); setTimeout(() => setError(''), 2800); };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [dashboardData, reportData, productData, customerData, orderData, purchaseData, settingsData] = await Promise.all([
        api.getDashboard(), api.getReports(), api.getProducts(), api.getCustomers(), api.getOrders(), api.getPurchases(), api.getSettings()
      ]);
      setDashboard(dashboardData);
      setReports(reportData);
      setProducts(productData);
      setCustomers(customerData);
      setOrders(orderData);
      setPurchases(purchaseData);
      setSettings(settingsData);
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
        setProducts(productData); setCustomers(customerData);
      } catch (err) { pushError(err.message || 'Không tìm kiếm được dữ liệu.'); }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch, customerSearch, user]);

  const handleLogin = async (payload) => {
    try { setAuthLoading(true); setLoginError(''); const result = await api.login(payload); setUser(result.user); }
    catch (err) { setLoginError(err.message || 'Không thể đăng nhập.'); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null); setCart([]); setSelectedOrder(null); setActiveTab('dashboard');
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return pushError('Sản phẩm đã hết hàng.');
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stock) return prev;
        return prev.map((item) => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id, product_name: product.name, price: product.price, quantity: 1, stock: product.stock }];
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
      clearCart(); setSelectedCustomerId(''); setPaymentMethod('cash'); setSelectedOrder(order);
      await loadAll(); setActiveTab('orders');
    } catch (err) { pushError(err.message || 'Không thể tạo đơn hàng.'); }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProductId) { await api.updateProduct(editingProductId, productForm); pushSuccess('Đã cập nhật sản phẩm.'); }
      else { await api.createProduct(productForm); pushSuccess('Đã thêm sản phẩm mới.'); }
      setProductForm(emptyProductForm); setEditingProductId(null); await loadAll();
    } catch (err) { pushError(err.message || 'Không lưu được sản phẩm.'); }
  };

  const submitCustomer = async (e) => {
    e.preventDefault();
    try { const newCustomer = await api.createCustomer(customerForm); setCustomerForm(emptyCustomerForm); setSelectedCustomerId(String(newCustomer.id)); pushSuccess('Đã thêm khách hàng mới.'); await loadAll(); }
    catch (err) { pushError(err.message || 'Không lưu được khách hàng.'); }
  };

  const submitPurchase = async (e) => {
    e.preventDefault();
    try {
      await api.createPurchase(purchaseForm);
      setPurchaseForm(emptyPurchaseForm);
      pushSuccess('Đã nhập hàng và cộng tồn kho.');
      await loadAll();
    } catch (err) { pushError(err.message || 'Không thể nhập hàng.'); }
  };

  const openOrder = async (id) => {
    try { setSelectedOrder(await api.getOrderById(id)); }
    catch (err) { pushError(err.message || 'Không đọc được đơn hàng.'); }
  };

  if (booting) return <div className="login-shell"><div className="panel">Đang khởi tạo...</div></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} loading={authLoading} error={loginError} />;

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-only">
        <div className="brand-card"><img className="brand-logo image-logo" src={baobaoLogo} alt="BaoBao logo" /><div><h1>{settings.storeName || 'BaoBao POS'}</h1><p>{isOwner ? 'Chủ shop' : 'Trợ lý'} • V6</p></div></div>
        <nav className="nav-list">{tabs.map((tab) => <button key={tab.key} className={`nav-item ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}><span>{tab.icon}</span><span>{tab.label}</span></button>)}</nav>
        <div className="sidebar-note"><strong>Đồng bộ iPhone + PC</strong><p>Mọi thiết bị dùng cùng 1 server sẽ thấy cùng dữ liệu.</p><div className="tiny muted">API: {api.getApiUrl()}</div></div>
      </aside>

      <main className="main-content">
        <header className="topbar mobile-topbar">
          <div><div className="hero-badge">BaoBao POS V6</div><h2>{tabs.find((tab) => tab.key === activeTab)?.label || 'BaoBao POS'}</h2><p className="muted">{settings.storeName || 'BaoBao POS'} • {user.name}</p></div>
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
            </div>
            {isOwner ? <div className="stats-grid"><StatCard title="Lợi nhuận hôm nay" value={currency(reports.revenue.day.profit)} /><StatCard title="Lợi nhuận tuần này" value={currency(reports.revenue.week.profit)} /><StatCard title="Lợi nhuận tháng này" value={currency(reports.revenue.month.profit)} /><StatCard title="Giá vốn tháng này" value={currency(reports.revenue.month.cost)} soft /></div> : null}
            <div className="content-grid two-columns uneven-columns">
              <div className="panel"><div className="panel-header"><h3>Đơn gần đây</h3></div><div className="stack-list">{dashboard.recentOrders.map((order) => <button key={order.id} className="order-card" onClick={() => { setActiveTab('orders'); openOrder(order.id); }}><div><strong>{order.order_no}</strong><div className="muted tiny">{sourceLabel(order.source)} • {formatDateTime(order.created_at)}</div></div><strong>{currency(order.total)}</strong></button>)}</div></div>
              <div className="panel"><div className="panel-header"><h3>Lịch sử nhập hàng</h3></div><div className="stack-list">{dashboard.recentPurchases.map((purchase) => <div key={purchase.id} className="list-row"><div><strong>{purchase.product_name}</strong><div className="muted tiny">{formatDateTime(purchase.created_at)} • {purchase.created_by}</div></div><strong>+{purchase.quantity}</strong></div>)}</div></div>
            </div>
          </section>
        )}

        {!loading && activeTab === 'pos' && (
          <section className="content-grid pos-layout page-bottom-space">
            <div className="panel">
              <div className="panel-header wrap-mobile"><div><h3>Chọn sản phẩm lên đơn</h3><p className="muted tiny">Giá bán nhập linh hoạt theo từng khách, từng thời điểm.</p></div><input className="search-input" placeholder="Tìm sản phẩm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
              <div className="stack-list">{products.map((product) => <button key={product.id} className="product-pick-card" onClick={() => addToCart(product)}><div><strong>{product.name}</strong><div className="muted tiny">{product.sku} • {product.category || 'Chưa phân loại'}</div></div><div className="product-pick-side"><strong>{currency(product.price)}</strong><span className={`stock-badge ${product.stock <= 10 ? 'danger' : ''}`}>Tồn {product.stock}</span></div></button>)}</div>
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
              <div className="stack-list">{cart.map((item) => <div key={item.product_id} className="cart-card"><div className="list-row compact"><strong>{item.product_name}</strong><button className="ghost-button small danger-text" onClick={() => updateCartItem(item.product_id, { quantity: 0 })}>Xóa</button></div><div className="cart-grid"><label><span>SL</span><input type="number" min="1" max={item.stock} value={item.quantity} onChange={(e) => updateCartItem(item.product_id, { quantity: Math.max(1, Math.min(Number(e.target.value || 1), item.stock)) })} /></label><label><span>Giá bán</span><input type="number" min="0" value={item.price} onChange={(e) => updateCartItem(item.product_id, { price: Number(e.target.value || 0) })} /></label></div><div className="list-row compact"><span className="tiny muted">Tạm tính</span><strong>{currency(item.price * item.quantity)}</strong></div></div>)}{!cart.length ? <div className="empty-state">Chưa có sản phẩm trong giỏ.</div> : null}</div>
              <div className="checkout-box"><div className="list-row compact"><span>Tạm tính</span><strong>{currency(subtotal)}</strong></div><div className="list-row compact"><span>Giảm giá</span><strong>{currency(discount)}</strong></div><div className="list-row compact emphasis"><span>Thành tiền</span><strong>{currency(total)}</strong></div><button className="primary-button" onClick={checkout}>Lên đơn</button></div>
            </div>
          </section>
        )}

        {!loading && activeTab === 'products' && isOwner && (
          <section className="content-grid two-columns page-bottom-space">
            <div className="panel"><div className="panel-header wrap-mobile"><div><h3>Danh sách sản phẩm</h3><p className="muted tiny">Chủ shop quản lý giá nhập, tồn và giá gợi ý.</p></div><input className="search-input" placeholder="Tìm sản phẩm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div><div className="stack-list">{products.map((product) => <div key={product.id} className="list-row product-row"><div><strong>{product.name}</strong><div className="muted tiny">{product.sku} • {product.category || 'Chưa phân loại'} • {product.unit}</div><div className="tiny price-compact">Giá gợi ý: {currency(product.price)} • Giá nhập: {currency(product.cost)}</div></div><div className="row-actions"><span className={`stock-badge ${product.stock <= 10 ? 'danger' : ''}`}>Tồn {product.stock}</span><button className="ghost-button small" onClick={() => { setEditingProductId(product.id); setProductForm({ sku: product.sku, name: product.name, category: product.category || '', price: product.price, cost: product.cost, stock: product.stock, unit: product.unit || 'cái' }); }}>Sửa</button><button className="ghost-button small danger-text" onClick={async () => { if (!window.confirm('Ẩn sản phẩm này?')) return; await api.deleteProduct(product.id); await loadAll(); }}>Ẩn</button></div></div>)}</div></div>
            <div className="panel"><div className="panel-header"><h3>{editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3></div><form className="form-grid" onSubmit={submitProduct}><label><span>SKU</span><input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} /></label><label><span>Tên sản phẩm</span><input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label><label><span>Danh mục</span><input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></label><label><span>Đơn vị</span><input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></label><label><span>Giá gợi ý</span><input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label><span>Giá nhập</span><input type="number" min="0" value={productForm.cost} onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })} /></label><label><span>Tồn kho</span><input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label><div className="form-actions"><button className="primary-button">{editingProductId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>{editingProductId ? <button type="button" className="ghost-button" onClick={() => { setEditingProductId(null); setProductForm(emptyProductForm); }}>Hủy sửa</button> : null}</div></form></div>
          </section>
        )}

        {!loading && activeTab === 'customers' && isOwner && (
          <section className="content-grid two-columns page-bottom-space"><div className="panel"><div className="panel-header wrap-mobile"><div><h3>Danh sách khách hàng</h3></div><input className="search-input" placeholder="Tìm khách hàng..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} /></div><div className="stack-list">{customers.map((customer) => <div key={customer.id} className="list-row"><div><strong>{customer.name}</strong><div className="muted tiny">{customer.phone || 'Chưa có SĐT'} • {customer.email || 'Chưa có email'}</div></div><span className="stock-badge">{customer.points} điểm</span></div>)}</div></div><div className="panel"><div className="panel-header"><h3>Thêm khách hàng</h3></div><form className="form-grid" onSubmit={submitCustomer}><label><span>Tên khách</span><input required value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} /></label><label><span>Số điện thoại</span><input value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} /></label><label><span>Email</span><input value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} /></label><label className="field-block"><span>Ghi chú</span><textarea rows="4" value={customerForm.note} onChange={(e) => setCustomerForm({ ...customerForm, note: e.target.value })} /></label><button className="primary-button">Lưu khách hàng</button></form></div></section>
        )}

        {!loading && activeTab === 'orders' && (
          <section className="content-grid two-columns uneven-columns page-bottom-space"><div className="panel"><div className="panel-header"><h3>Lịch sử đơn hàng</h3><span className="tag">{orders.length} đơn</span></div><div className="stack-list">{orders.map((order) => <button key={order.id} className="order-card" onClick={() => openOrder(order.id)}><div><strong>{order.order_no}</strong><div className="muted tiny">{order.customer_name || 'Khách lẻ'} • {sourceLabel(order.source)} • {formatDateTime(order.created_at)}</div></div><div className="order-card-side"><strong>{currency(order.total)}</strong><div className="muted tiny">{paymentLabel(order.payment_method)}</div></div></button>)}</div></div><div className="panel"><OrderDetail order={selectedOrder} settings={settings} canSeeProfit={isOwner} /></div></section>
        )}

        {!loading && activeTab === 'purchases' && (
          <section className="content-grid two-columns uneven-columns page-bottom-space"><div className="panel"><div className="panel-header"><h3>Phiếu nhập hàng</h3><span className="tag">Tự lưu ngày giờ</span></div><form className="form-grid" onSubmit={submitPurchase}><label><span>Sản phẩm</span><select required value={purchaseForm.product_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, product_id: e.target.value })}><option value="">Chọn sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label><span>Số lượng nhập</span><input type="number" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} /></label><label><span>Giá nhập / 1 SP</span><input type="number" min="0" value={purchaseForm.cost} onChange={(e) => setPurchaseForm({ ...purchaseForm, cost: e.target.value })} /></label><label><span>Nhà cung cấp</span><input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} placeholder="Ví dụ: Xưởng lụa Latin" /></label><label className="field-block"><span>Ghi chú</span><textarea rows="4" value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} /></label><button className="primary-button">Lưu phiếu nhập</button></form></div><div className="panel"><div className="panel-header"><h3>Lịch sử nhập hàng</h3></div><div className="stack-list">{purchases.map((purchase) => <div key={purchase.id} className="list-row"><div><strong>{purchase.product_name}</strong><div className="muted tiny">{purchase.supplier || 'Chưa ghi NCC'} • {formatDateTime(purchase.created_at)} • {purchase.created_by}</div></div><div className="order-card-side"><strong>+{purchase.quantity}</strong><div className="muted tiny">{currency(purchase.total_cost)}</div></div></div>)}{!purchases.length ? <div className="empty-state">Chưa có phiếu nhập hàng nào.</div> : null}</div></div></section>
        )}

        {!loading && activeTab === 'settings' && isOwner && (
          <section className="content-grid two-columns page-bottom-space"><div className="panel"><div className="panel-header"><h3>Cài đặt cửa hàng</h3></div><form className="form-grid" onSubmit={async (e) => { e.preventDefault(); try { setSettings(await api.saveSettings(settings)); pushSuccess('Đã lưu cài đặt cửa hàng.'); } catch (err) { pushError(err.message || 'Không lưu được cài đặt.'); } }}><label><span>Tên cửa hàng</span><input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label><label><span>Số điện thoại</span><input value={settings.storePhone} onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })} /></label><label className="field-block"><span>Địa chỉ</span><textarea rows="3" value={settings.storeAddress} onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })} /></label><label className="field-block"><span>Footer hóa đơn</span><textarea rows="3" value={settings.invoiceFooter} onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })} /></label><button className="primary-button">Lưu cài đặt</button></form></div><div className="panel"><div className="panel-header"><h3>Phân quyền hiện tại</h3></div><div className="stack-list"><div className="list-row compact"><span>Chủ shop</span><strong>Toàn quyền</strong></div><div className="list-row compact"><span>Trợ lý</span><strong>Lên đơn, xem đơn, nhập hàng</strong></div><div className="panel soft-panel"><strong>Bảo mật</strong><div className="tiny muted">Đây là bản dùng nội bộ. Sau khi chạy ổn định, nên đổi mật khẩu mặc định ngay trong dữ liệu hệ thống.</div></div></div></div></section>
        )}
      </main>

      <nav className="mobile-bottom-nav mobile-only">{tabs.map((tab) => <button key={tab.key} className={`bottom-nav-item ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}><span>{tab.icon}</span><small>{tab.label}</small></button>)}</nav>
    </div>
  );
}
