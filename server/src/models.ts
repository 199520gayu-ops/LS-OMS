import { Schema, model } from "mongoose";
export const ROLES = ["admin", "marketing", "sales"] as const;
export const STATUSES = ["submitted", "confirmed", "dispatched", "delivered", "cancelled"] as const;
export type Role = (typeof ROLES)[number];

export const User = model("User", new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ROLES, default: "marketing" },
}, { timestamps: true }));

export const Product = model("Product", new Schema({
  category: { type: String, default: "General", trim: true },
  brand: { type: String, default: "Generic", trim: true },
  name: { type: String, required: true, trim: true },
  perBox: { type: Number, default: 0, min: 0 }, // pieces in one box (e.g. 30 for 1 ltr)
  measurement: { type: String, default: "Standard", trim: true },
  gstRate: { type: Number, default: 18, min: 0 },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "pcs" },
  stock: { type: Number, default: 0, min: 0 },
}, { timestamps: true }));

export const Order = model("Order", new Schema({
  orderNo: { type: String, unique: true },
  customer: { name: { type: String, required: true }, phone: String, address: String, gstin: String },
  items: [{ product: { type: Schema.Types.ObjectId, ref: "Product" }, category: String, brand: String, name: String, measurement: String, qty: Number, boxes: Number, perBox: Number, price: Number, gstRate: Number }],
  billType: { type: String, enum: ["gst", "non-gst"], default: "non-gst" },
  cdPercent: { type: Number, default: 0 },
  subtotal: Number, cdAmount: Number, gstAmount: Number, total: Number,
  status: { type: String, enum: STATUSES, default: "submitted", index: true },
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  history: [{ status: String, by: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true }));

export const Customer = model("Customer", new Schema({
  name: { type: String, required: true, trim: true },
  nameKey: { type: String, required: true, unique: true }, // lowercase name, prevents duplicates
  phone: String, address: String, gstin: String,
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true }));
