const usePostgres = Boolean(process.env.DATABASE_URL);

let store;

export async function initializeStore() {
  if (store) return;
  store = usePostgres
    ? await import('./postgresStore.js')
    : await import('./jsonStore.js');
  if (typeof store.initializePostgresStore === 'function') {
    await store.initializePostgresStore();
  }
}

export async function closeStore() {
  if (store && typeof store.closePostgresStore === 'function') {
    await store.closePostgresStore();
  }
}

function ensureStore() {
  if (!store) {
    throw new Error('Store chưa được khởi tạo. Hãy gọi initializeStore() trước.');
  }
  return store;
}

export async function authenticateUser(...args) { return ensureStore().authenticateUser(...args); }
export async function getUserByToken(...args) { return ensureStore().getUserByToken(...args); }
export async function logoutToken(...args) { return ensureStore().logoutToken(...args); }
export async function getProducts(...args) { return ensureStore().getProducts(...args); }
export async function createProduct(...args) { return ensureStore().createProduct(...args); }
export async function updateProduct(...args) { return ensureStore().updateProduct(...args); }
export async function hideProduct(...args) { return ensureStore().hideProduct(...args); }
export async function deleteProduct(...args) { return ensureStore().deleteProduct(...args); }
export async function getCustomers(...args) { return ensureStore().getCustomers(...args); }
export async function createCustomer(...args) { return ensureStore().createCustomer(...args); }
export async function deleteCustomer(...args) { return ensureStore().deleteCustomer(...args); }
export async function getOrders(...args) { return ensureStore().getOrders(...args); }
export async function getOrderById(...args) { return ensureStore().getOrderById(...args); }
export async function createOrder(...args) { return ensureStore().createOrder(...args); }
export async function getDashboard(...args) { return ensureStore().getDashboard(...args); }
export async function getSettings(...args) { return ensureStore().getSettings(...args); }
export async function updateSettings(...args) { return ensureStore().updateSettings(...args); }
export async function createPurchase(...args) { return ensureStore().createPurchase(...args); }
export async function getPurchases(...args) { return ensureStore().getPurchases(...args); }
export async function getAdjustments(...args) { return ensureStore().getAdjustments(...args); }
export async function createAdjustment(...args) { return ensureStore().createAdjustment(...args); }
export async function getReports(...args) { return ensureStore().getReports(...args); }
export async function getUsers(...args) { return ensureStore().getUsers(...args); }
export async function createUser(...args) { return ensureStore().createUser(...args); }
export async function updateUser(...args) { return ensureStore().updateUser(...args); }
