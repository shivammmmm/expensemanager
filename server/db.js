import mongoose from "mongoose";

// dotenv is loaded in server/index.js before db.js is evaluated.
// Add fallback for cases where db.js is imported without dotenv.
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || undefined;

if (!MONGO_URI) {
  // Keep server boot informative.
  console.warn(
    "[db] Missing MONGO_URI in environment. MongoDB will not connect."
  );
}

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  if (!MONGO_URI) return;

  const conn = await mongoose.connect(MONGO_URI, {
    dbName: MONGO_DB_NAME,
  });

  // eslint-disable-next-line no-console
  console.log("[db] connected:", conn.connection.name);
  isConnected = true;
}

export const Schemas = {
  user: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      full_name: { type: String, required: true },
      email: { type: String, required: true, unique: true, index: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["admin", "staff"], required: true },
      phone: { type: String, default: "" },
      designation: { type: String, default: "" },
      area: { type: String, default: "" },
      createdAt: { type: String, default: () => new Date().toISOString() },
      // for compatibility: allow otp fields (unused by current UI because /register is disabled)
      otp: {
        code: { type: String },
        expiresAt: { type: Number },
      },
    },
    { timestamps: false }
  ),

  expense: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      category: { type: String, default: "other" },
      amount: { type: Number, default: 0 },
      description: { type: String, default: "" },
      expense_date: {
        type: String,
        default: () => new Date().toISOString().slice(0, 10),
      },
      bill_image: { type: String, default: "" },
      staff_id: { type: String, default: "" },
      staff_name: { type: String, default: "" },
      status: { type: String, default: "pending" },
      createdAt: { type: String, default: () => new Date().toISOString() },
    },
    { timestamps: false }
  ),

  collection: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      source: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      date: { type: String, required: true },
      time: { type: String, default: "" },
      payment_mode: { type: String, default: "cash" },
      reference_number: { type: String, default: "" },
      notes: { type: String, default: "" },

      staff_id: { type: String, default: "" },
      staff_name: { type: String, default: "" },
      createdAt: { type: String, default: () => new Date().toISOString() },
    },
    { timestamps: false }
  ),

  sentPayment: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      sent_to: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      date: {
        type: String,
        default: () => new Date().toISOString().slice(0, 10),
      },
      remark: { type: String, default: "" },

      staff_id: { type: String, default: "" },
      staff_name: { type: String, default: "" },
      createdAt: { type: String, default: () => new Date().toISOString() },
    },
    { timestamps: false }
  ),

  client: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      name: { type: String, required: true, unique: true },

      staff_id: { type: String, default: "" },
      staff_name: { type: String, default: "" },

      createdAt: { type: String, default: () => new Date().toISOString() },
    },
    { timestamps: false }
  ),

  cashLedger: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      amount: { type: Number, default: 0 },
      remark: { type: String, default: "" },
      entry_date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
      created_by: { type: String, default: "" },
      created_at: { type: String, default: () => new Date().toISOString() },
    },
    { timestamps: false }
  ),

  staffTransfer: new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      staff_id: { type: String, default: "" },
      staff_name: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      remark: { type: String, default: "" },
      transfer_date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
      created_by: { type: String, default: "" },
      created_at: { type: String, default: () => new Date().toISOString() },
    },
    { timestamps: false }
  ),
};

// Admin settings (single document)
Schemas.settings = new mongoose.Schema(
  {
    company_name: { type: String, default: "" },
    company_phone: { type: String, default: "" },
    company_address: { type: String, default: "" },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);

export const Models = {
  User: mongoose.models.User || mongoose.model("User", Schemas.user),
  Expense:
    mongoose.models.Expense || mongoose.model("Expense", Schemas.expense),
  Collection:
    mongoose.models.Collection ||
    mongoose.model("Collection", Schemas.collection),
  SentPayment:
    mongoose.models.SentPayment ||
    mongoose.model("SentPayment", Schemas.sentPayment),
  Client: mongoose.models.Client || mongoose.model("Client", Schemas.client),
  CashLedger:
    mongoose.models.CashLedger ||
    mongoose.model("CashLedger", Schemas.cashLedger),
  StaffTransfer:
    mongoose.models.StaffTransfer ||
    mongoose.model("StaffTransfer", Schemas.staffTransfer),
  Settings:
    mongoose.models.Settings || mongoose.model("Settings", Schemas.settings),
};


export async function seedAdmin() {
  if (!MONGO_URI) return;

  const { User } = Models;
  const email = "admin@local.test";
  const exists = await User.findOne({ email });
  if (exists) return;

  // keep passwordHash creation in server/index.js (bcryptjs already imported there)
  // marker function so server can call after bcrypt is available.
}
