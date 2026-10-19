import { router, json, error, db, storage, requireAuth, requireAdminEmailAllowlist } from '@appdeploy/sdk';

const ADMIN_EMAILS = ['Ekunola99@gmail.com'];

const starterProducts = [
  { name: 'Classic Fruit Parfait', category: 'Parfait', price: 3500, description: 'Creamy yoghurt layered with fresh fruit and crunchy toppings.', image: '/resources/product-1.jpeg', available: true, featured: true, stock: 10 },
  { name: 'Berry Fruit Parfait', category: 'Parfait', price: 4000, description: 'Rich yoghurt topped with strawberries, grapes and seasonal berries.', image: '/resources/product-2.jpeg', available: true, featured: true, stock: 10 },
  { name: 'Fruit Fusion Yoghurt', category: 'Yoghurt', price: 3000, description: 'Fresh yoghurt cups prepared with Fruit Fusion toppings.', image: '/resources/product-3.jpeg', available: true, featured: false, stock: 10 }
];

async function listProducts() {
  let result = await db.list<any>('products', { limit: 100 });
  if (!result.items.length) {
    const ids = await db.add('products', starterProducts);
    if (ids.some(id => !id)) throw new Error('Could not initialize the product menu');
    result = await db.list<any>('products', { limit: 100 });
  }
  const legacy: any[] = result.items.map((p: any) => ({ ...p, stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 10 }));
  const paths = legacy.filter(p => p.imagePath).map(p => p.imagePath as string);
  const urls = paths.length ? await storage.url(paths) : [];
  const urlByPath = new Map(urls.map(item => [item.path, item.url]));
  return legacy.map(p => ({ ...p, image: p.imagePath ? (urlByPath.get(p.imagePath) || p.image) : p.image }));
}

async function adminOrders() {
  const result = await db.list<any>('orders', { limit: 100 });
  return result.items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'GET /api/products': [async () => {
    try { return json({ products: (await listProducts()).filter(p => p.available && Number(p.stock ?? 10) > 0) }); }
    catch (e) { console.error('Public menu read failed', e); return error('Menu is temporarily unavailable', 500); }
  }],

  'GET /api/admin/products': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async () => {
    try { return json({ products: await listProducts() }); }
    catch (e) { console.error('Admin product read failed', e); return error('Could not load products', 500); }
  }],

  'POST /api/leads': [async ({ body }) => {
    const b = body as Record<string, unknown>;
    if (!b.name || !b.phone || !b.message) return error('Missing fields', 400);
    const ids = await db.add('leads', [{ name: b.name, phone: b.phone, message: b.message, createdAt: new Date().toISOString(), status: 'New' }]);
    return ids[0] ? json({ ok: true, id: ids[0] }, 201) : error('Save failed', 500);
  }],

  'POST /api/orders': [async ({ body }) => {
    const b = body as { items?: Array<{ id?: string; qty?: number }>; delivery?: string; deliveryDetails?: Record<string, string>; total?: number };
    if (!Array.isArray(b.items) || !b.items.length || !['pickup', 'home'].includes(String(b.delivery))) return error('Invalid order details', 400);
    if (b.delivery === 'home' && (!b.deliveryDetails?.name?.trim() || !b.deliveryDetails?.phone?.trim() || !b.deliveryDetails?.address?.trim())) return error('Delivery name, phone, and address are required', 400);
    const ids = b.items.map(item => item.id || '');
    if (ids.some(id => !id)) return error('Invalid product in order', 400);
    const records = await db.get<any>('products', ids, { consistent: true });
    if (records.some((p, i) => !p || !p.available || !Number.isInteger(b.items?.[i]?.qty) || (b.items?.[i]?.qty || 0) < 1 || Number(p.stock ?? 10) < (b.items?.[i]?.qty || 0))) return error('A product is unavailable or stock changed. Refresh the menu and try again.', 409);
    const items = records.map((p, i) => ({ id: ids[i], name: p!.name, price: Number(p!.price), qty: Number(b.items![i].qty) }));
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const deliveryFee = b.delivery === 'home' ? 1000 : 0;
    const order = { items, delivery: b.delivery, deliveryDetails: b.delivery === 'home' ? b.deliveryDetails : {}, subtotal, deliveryFee, total: subtotal + deliveryFee, createdAt: new Date().toISOString(), status: 'New' };
    const [orderId] = await db.add('orders', [order]);
    if (!orderId) return error('Could not save order', 500);
    const stockChanges = records.map((p, i) => ({ id: ids[i], record: { ...p!, stock: Number(p!.stock ?? 10) - items[i].qty } }));
    const updated = await db.update('products', stockChanges);
    if (updated.some(ok => !ok)) console.error('Order saved but stock reconciliation is needed for order', orderId);
    return json({ ok: true, orderId, total: order.total }, 201);
  }],

  'POST /api/products': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ body }) => {
    const b = body as Record<string, unknown>;
    if (typeof b.name !== 'string' || !b.name.trim() || !Number.isFinite(Number(b.price)) || Number(b.price) < 0 || !Number.isFinite(Number(b.stock ?? 10)) || Number(b.stock ?? 10) < 0) return error('Name, valid price, and stock are required', 400);
    const product = { name: b.name.trim(), category: String(b.category || 'Other'), price: Number(b.price), description: String(b.description || ''), image: String(b.image || ''), imagePath: String(b.imagePath || ''), available: Boolean(b.available), featured: Boolean(b.featured), stock: Math.floor(Number(b.stock ?? 10)) };
    const [id] = await db.add('products', [product]);
    if (!id) return error('Create failed', 500);
    return json({ product: { ...product, id } }, 201);
  }],

  'PUT /api/products/:id': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ params, body }) => {
    const [current] = await db.get<any>('products', [params.id]);
    if (!current) return error('Not found', 404);
    const b = body as Record<string, unknown>;
    if (typeof b.name !== 'string' || !b.name.trim() || !Number.isFinite(Number(b.price)) || Number(b.price) < 0 || !Number.isFinite(Number(b.stock ?? current.stock ?? 10)) || Number(b.stock ?? current.stock ?? 10) < 0) return error('Name, valid price, and stock are required', 400);
    const product = { ...current, name: b.name.trim(), category: String(b.category || 'Other'), price: Number(b.price), description: String(b.description || ''), image: String(b.image || current.image || ''), imagePath: String(b.imagePath || current.imagePath || ''), available: Boolean(b.available), featured: Boolean(b.featured), stock: Math.floor(Number(b.stock ?? current.stock ?? 10)) };
    const [ok] = await db.update('products', [{ id: params.id, record: product }]);
    if (!ok) return error('Update failed', 500);
    const urls = product.imagePath ? await storage.url([product.imagePath]) : [];
    return json({ product: { ...product, id: params.id, image: urls[0]?.url || product.image } });
  }],

  'DELETE /api/products/:id': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ params }) => {
    const [ok] = await db.delete('products', [params.id]);
    return ok ? json({ ok: true }) : error('Delete failed', 500);
  }],

  'POST /api/uploads': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ body }) => {
    const b = body as { filename?: string; content?: string; contentType?: string };
    if (!b.content || !/^image\/(jpeg|png|webp|gif|avif)$/.test(b.contentType || '')) return error('Please upload a JPEG, PNG, WebP, GIF, or AVIF image', 400);
    if (b.content.length > 6_000_000) return error('Image is too large; choose an image under about 4 MB', 413);
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' } as Record<string, string>)[b.contentType!] || 'jpg';
    const path = 'products/' + crypto.randomUUID() + '.' + ext;
    const [ok] = await storage.write([{ path, content: b.content, contentType: b.contentType! }]);
    if (!ok) return error('Upload failed', 500);
    const [url] = await storage.url([path]);
    return json({ path, url: url?.url || '' }, 201);
  }],

  'GET /api/admin/orders': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async () => {
    try { return json({ orders: await adminOrders() }); }
    catch (e) { console.error('Admin order read failed', e); return error('Could not load orders', 500); }
  }],

  'PUT /api/admin/orders/:id': [requireAuth(), requireAdminEmailAllowlist(ADMIN_EMAILS), async ({ params, body }) => {
    const allowed = ['New', 'Confirmed', 'Preparing', 'Ready for delivery', 'Completed', 'Cancelled'];
    const b = body as { status?: string };
    if (!b.status || !allowed.includes(b.status)) return error('Invalid order status', 400);
    const [current] = await db.get<any>('orders', [params.id]);
    if (!current) return error('Order not found', 404);
    const [ok] = await db.update('orders', [{ id: params.id, record: { ...current, status: b.status } }]);
    return ok ? json({ ok: true }) : error('Could not update order', 500);
  }]
});
