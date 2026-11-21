import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, Product, Order, Customer, ROLES } from "./models";
import { sign, requireAuth, allow, AuthReq } from "./auth";

const r = Router();
const fail = (message: string, status = 400) => Object.assign(new Error(message), { status });
const wrap = (fn: (req: AuthReq, res: Response) => Promise<any>) => (req: any, res: Response) =>
  fn(req, res).catch((e) => res.status(e.status ?? (e instanceof z.ZodError ? 400 : 500))
    .json({ message: e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : e.message }));

// ---------- Auth ----------
r.post("/auth/login", wrap(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const u = await User.findOne({ email: email.toLowerCase() });
  if (!u || !(await bcrypt.compare(password, u.password))) return res.status(401).json({ message: "Invalid email or password" });
  const user = { id: String(u._id), name: u.name, role: u.role as any };
  res.json({ token: sign(user), user });
}));

// ---------- Team (admin) ----------
const userBody = z.object({ name: z.string().min(2), email: z.string().email(), role: z.enum(ROLES) });
r.get("/users", requireAuth, allow("admin"), wrap(async (_q, res) => res.json(await User.find().select("-password"))));
r.post("/users", requireAuth, allow("admin"), wrap(async (req, res) => {
  const b = userBody.extend({ password: z.string().min(8) }).parse(req.body);
  const u = await User.create({ ...b, password: await bcrypt.hash(b.password, 10) });
  res.status(201).json({ id: u._id, name: u.name, role: u.role });
}));
r.patch("/users/:id", requireAuth, allow("admin"), wrap(async (req, res) => {
  const { password, ...rest } = userBody.extend({ password: z.string().min(8) }).partial().parse(req.body);
  const upd: any = { ...rest };
  if (password) upd.password = await bcrypt.hash(password, 10);
  const u = await User.findByIdAndUpdate(req.params.id, upd, { new: true }).select("-password");
  u ? res.json(u) : res.status(404).json({ message: "User not found" });
}));
r.delete("/users/:id", requireAuth, allow("admin"), wrap(async (req, res) => {
  if (req.params.id === req.user!.id) throw fail("You cannot delete your own account");
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// ---------- Products ----------
const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const productBody = z.object({
  category: z.string().min(1), brand: z.string().min(1), name: z.string().min(1), measurement: z.string().min(1), perBox: z.number().int().min(0).optional(),
  price: z.number().min(0), gstRate: z.number().min(0).max(100), stock: z.number().int().min(0),
});
r.get("/products", requireAuth, wrap(async (_q, res) => res.json(await Product.find().sort("category brand name price"))));
r.post("/products", requireAuth, allow("admin"), wrap(async (req, res) => {
  const b = productBody.parse(req.body);
  res.status(201).json(await Product.create({ ...b, sku: slug(`${b.category}-${b.brand}-${b.name}-${b.measurement}`) }));
}));
// Bulk add: every brand x product x measurement combination; existing ones are skipped
const list = z.array(z.string().trim().min(1)).min(1);
r.post("/products/bulk", requireAuth, allow("admin"), wrap(async (req, res) => {
  const b = z.object({ category: z.string().trim().min(1), brands: list, names: list, measurements: list,
    perBox: z.number().int().min(0).default(0), price: z.number().min(0), gstRate: z.number().min(0).max(100), stock: z.number().int().min(0) }).parse(req.body);
  if (b.brands.length * b.names.length * b.measurements.length > 300) throw fail("Too many combinations (max 300 at once)");
  let created = 0, skipped = 0;
  for (const brand of b.brands) for (const name of b.names) for (const measurement of b.measurements) {
    const sku = slug(`${b.category}-${brand}-${name}-${measurement}`);
    const out = await Product.updateOne({ sku }, { $setOnInsert: { category: b.category, brand, name, measurement, perBox: b.perBox, price: b.price, gstRate: b.gstRate, stock: b.stock, unit: "pcs" } }, { upsert: true });
    out.upsertedCount ? created++ : skipped++;
  }
  res.json({ created, skipped });
}));
r.patch("/products/:id", requireAuth, allow("admin"), wrap(async (req, res) => {
  const b = productBody.partial().parse(req.body);
  const p = await Product.findById(req.params.id);
  if (!p) throw fail("Product not found", 404);
  Object.assign(p, b);
  p.sku = slug(`${p.category}-${p.brand}-${p.name}-${p.measurement}`);
  await p.save();
  res.json(p);
}));
r.delete("/products/:id", requireAuth, allow("admin"), wrap(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id); // past orders keep their own copy of name/price
  res.json({ ok: true });
}));

// ---------- Customers ----------
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Saves/updates a customer from an order; blank fields never overwrite saved details
async function saveCustomer(c: { name: string; phone?: string; address?: string; gstin?: string }, userId: string) {
  const name = c.name.trim();
  if (!name) return;
  const set: any = { name };
  (["phone", "address", "gstin"] as const).forEach((k) => { const v = c[k]?.trim(); if (v) set[k] = v; });
  try { await Customer.updateOne({ nameKey: name.toLowerCase() }, { $set: set, $setOnInsert: { createdBy: userId } }, { upsert: true }); } catch { /* never block an order */ }
}
const customerBody = z.object({ name: z.string().trim().min(2), phone: z.string().optional(), address: z.string().optional(), gstin: z.string().optional() });
r.get("/customers", requireAuth, wrap(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const f: any = q ? { $or: [{ name: new RegExp(esc(q), "i") }, { phone: new RegExp(esc(q), "i") }] } : {};
  res.json(await Customer.find(f).sort("name").limit(500));
}));
r.post("/customers", requireAuth, allow("admin", "marketing"), wrap(async (req, res) => {
  const b = customerBody.parse(req.body);
  res.status(201).json(await Customer.create({ ...b, nameKey: b.name.toLowerCase(), createdBy: req.user!.id }));
}));
r.patch("/customers/:id", requireAuth, allow("admin", "marketing"), wrap(async (req, res) => {
  const b = customerBody.parse(req.body);
  const c = await Customer.findById(req.params.id);
  if (!c) throw fail("Customer not found", 404);
  Object.assign(c, b); c.nameKey = b.name.toLowerCase();
  await c.save();
  res.json(c);
}));
r.delete("/customers/:id", requireAuth, allow("admin"), wrap(async (req, res) => { await Customer.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
// one-time: build the customer list from orders that already exist
r.post("/customers/import", requireAuth, allow("admin"), wrap(async (req, res) => {
  const orders = await Order.find().select("customer").lean();
  for (const o of orders) if (o.customer?.name) await saveCustomer(o.customer as any, req.user!.id);
  res.json({ total: await Customer.countDocuments() });
}));

// ---------- Orders ----------
const orderSchema = z.object({
  customer: z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional(), gstin: z.string().optional() }),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1), boxes: z.number().int().min(0).optional(), perBox: z.number().int().min(0).optional() })).min(1),
  notes: z.string().optional(),
  billType: z.enum(["gst", "non-gst"]),
  cdPercent: z.number().min(0).max(100),
});
const round = (n: number) => Math.round(n * 100) / 100;

// Takes stock atomically (only if enough is left); `reserved` lets the caller undo on failure
async function reserve(input: { productId: string; qty: number; boxes?: number; perBox?: number }[], reserved: [string, number][]) {
  const agg = new Map<string, { qty: number; boxes: number; perBox: number }>(); // merge duplicate lines
  input.forEach((i) => { const a = agg.get(i.productId) || { qty: 0, boxes: 0, perBox: i.perBox || 0 }; a.qty += i.qty; a.boxes += i.boxes || 0; agg.set(i.productId, a); });
  const items: any[] = [];
  for (const [id, a] of agg) {
    const q = a.qty;
    const p = await Product.findOneAndUpdate({ _id: id, stock: { $gte: q } }, { $inc: { stock: -q } }, { new: true });
    if (!p) {
      const ex = await Product.findById(id);
      throw fail(ex ? `Only ${ex.stock} left of "${ex.name} ${ex.measurement}"` : "Product not found");
    }
    reserved.push([id, q]);
    items.push({ product: p._id, category: p.category, brand: p.brand, name: p.name, measurement: p.measurement, qty: q, boxes: a.boxes, perBox: a.perBox, price: p.price, gstRate: p.gstRate });
  }
  return items;
}
const release = (list: [string, number][]) => Promise.all(list.map(([id, q]) => Product.updateOne({ _id: id }, { $inc: { stock: q } })));
function totals(items: any[], billType: string, cd: number) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const cdAmount = (subtotal * cd) / 100;
  const gstAmount = billType === "gst" ? items.reduce((s, i) => s + i.qty * i.price * (1 - cd / 100) * (i.gstRate / 100), 0) : 0;
  return { subtotal: round(subtotal), cdAmount: round(cdAmount), gstAmount: round(gstAmount), total: round(subtotal - cdAmount + gstAmount) };
}

r.post("/orders", requireAuth, allow("admin", "marketing"), wrap(async (req, res) => {
  const b = orderSchema.parse(req.body);
  const reserved: [string, number][] = [];
  try {
    const items = await reserve(b.items, reserved);
    const orderNo = `LS-${new Date().getFullYear()}-${String((await Order.countDocuments()) + 1).padStart(5, "0")}`;
    const o = await Order.create({ orderNo, customer: b.customer, items, notes: b.notes, billType: b.billType, cdPercent: b.cdPercent,
      ...totals(items, b.billType, b.cdPercent), createdBy: req.user!.id, history: [{ status: "submitted", by: req.user!.name }] });
    await saveCustomer(b.customer, req.user!.id);
    res.status(201).json(o);
  } catch (e) { await release(reserved); throw e; }
}));

r.put("/orders/:id", requireAuth, allow("admin", "marketing"), wrap(async (req, res) => {
  const b = orderSchema.parse(req.body);
  const o = await Order.findById(req.params.id);
  if (!o) throw fail("Order not found", 404);
  if (o.status !== "submitted") throw fail("Only new (submitted) orders can be edited");
  if (req.user!.role === "marketing" && String(o.createdBy) !== req.user!.id) throw fail("Not your order", 403);
  const old = o.items.map((i) => [String(i.product), i.qty ?? 0] as [string, number]);
  await release(old); // give back the old quantities, then take the new ones
  const reserved: [string, number][] = [];
  try {
    const items = await reserve(b.items, reserved);
    Object.assign(o, { customer: b.customer, items, notes: b.notes, billType: b.billType, cdPercent: b.cdPercent, ...totals(items, b.billType, b.cdPercent) });
    o.history.push({ status: "edited", by: req.user!.name } as any);
    await o.save();
    await saveCustomer(b.customer, req.user!.id);
    res.json(o);
  } catch (e) {
    await release(reserved);
    await Promise.all(old.map(([id, q]) => Product.updateOne({ _id: id }, { $inc: { stock: -q } }))); // restore original state
    throw e;
  }
}));

r.get("/orders", requireAuth, wrap(async (req, res) => {
  const { status, q } = req.query as Record<string, string>;
  const f: any = {};
  if (status) f.status = status;
  if (q) f.$or = [{ orderNo: new RegExp(esc(q), "i") }, { "customer.name": new RegExp(esc(q), "i") }];
  if (req.user!.role === "marketing") f.createdBy = req.user!.id; // marketing sees only own orders
  res.json(await Order.find(f).populate("createdBy", "name").sort("-createdAt").limit(200));
}));

r.get("/orders/:id", requireAuth, wrap(async (req, res) => {
  const o = await Order.findById(req.params.id).populate("createdBy", "name");
  if (!o) throw fail("Order not found", 404);
  if (req.user!.role === "marketing" && String((o.createdBy as any)?._id) !== req.user!.id) throw fail("Forbidden", 403);
  res.json(o);
}));

const NEXT: Record<string, string[]> = { submitted: ["confirmed", "cancelled"], confirmed: ["dispatched", "cancelled"], dispatched: ["delivered"] };
r.patch("/orders/:id/status", requireAuth, wrap(async (req, res) => {
  const { status } = z.object({ status: z.enum(["confirmed", "dispatched", "delivered", "cancelled"]) }).parse(req.body);
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ message: "Order not found" });
  const role = req.user!.role;
  const own = String(o.createdBy) === req.user!.id;
  if (role === "marketing" && !(status === "cancelled" && o.status === "submitted" && own)) return res.status(403).json({ message: "Marketing can only cancel own new orders" });
  if (!NEXT[o.status]?.includes(status)) return res.status(400).json({ message: `Cannot move ${o.status} → ${status}` });
  o.status = status; o.history.push({ status, by: req.user!.name } as any);
  await o.save();
  if (status === "cancelled") for (const it of o.items) await Product.updateOne({ _id: it.product }, { $inc: { stock: it.qty } }); // return stock
  res.json(o);
}));

// Bulk report: every order (with items) between two dates, IST day boundaries
r.get("/reports/orders", requireAuth, wrap(async (req, res) => {
  const { from, to, status } = req.query as Record<string, string>;
  const start = new Date(`${from}T00:00:00+05:30`), end = new Date(`${to}T23:59:59.999+05:30`);
  if (isNaN(+start) || isNaN(+end)) throw fail("Valid from and to dates are required (YYYY-MM-DD)");
  const f: any = { createdAt: { $gte: start, $lte: end } };
  if (status) f.status = status;
  if (req.user!.role === "marketing") f.createdBy = req.user!.id;
  res.json(await Order.find(f).populate("createdBy", "name").sort("createdAt").limit(5000));
}));

r.get("/stats", requireAuth, allow("admin", "sales"), wrap(async (_q, res) => {
  res.json(await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$total" } } }]));
}));
export default r;
