import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import { connectDB, Models } from "./db.js";
import { seedAdminUser } from "./seedAdmin.js";
import { parseOrderParam, sortByFieldForArray } from "./mongoUtils.js";

// NOTE: parseOrderParam + sortByFieldForArray are imported; local helper below was causing duplicate declarations.

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server/no-origin requests
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true); // fallback: allow all if not configured
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

await connectDB();
await seedAdminUser();

function getTokenFromReq(req) {
  // Frontend will send Authorization: Bearer <token>
  const header = req.headers.authorization;
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function authRequired(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

async function requireAdmin(req, res, next) {
  authRequired(req, res, async () => {
    const user = await Models.User.findOne({
      id: req.auth.userId,
    }).lean();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });
    req.currentUser = user;
    return next();
  });
}

function publicSettingsCheck(req, res) {
  // Mimic Base44 behavior expected by AuthContext
  // Always require auth (so UI uses login/OTP)
  return res.status(403).json({
    extra_data: {
      reason: "auth_required",
    },
  });
}

function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    phone: u.phone,
    area: u.area,
    designation: u.designation,
  };
}

// ---- Auth ----
app.get("/api/apps/public/prod/public-settings/by-id/:appId", (req, res) => {
  // If token provided, we can say auth ok. UI calls this before me().
  const token = getTokenFromReq(req);
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.json({ id: req.params.appId, public_settings: {} });
    } catch {
      return publicSettingsCheck(req, res);
    }
  }
  return publicSettingsCheck(req, res);
});

app.post("/api/auth/register", async (req, res) => {
  // OTP-based onboarding remove. Staff accounts can be created only by admin.
  return res
    .status(403)
    .json({ message: "Registration disabled. Admin creates staff accounts." });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  // OTP-based onboarding remove.
  return res.status(403).json({
    message: "OTP verification disabled. Admin creates staff accounts.",
  });
});

app.post("/api/auth/login", async (req, res) => {
  // Frontend login screen uses "username".
  // Backend continues to accept req.body.email as the identifier.
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "username and password required" });

  const identifier = String(email).toLowerCase();
  const u = await Models.User.findOne({
    $or: [
      { email: identifier },
      { full_name: { $regex: `^${identifier}$`, $options: "i" } },
    ],
  }).lean();

  if (!u) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(String(password), u.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: u.id, role: u.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
  return res.json({ access_token: token });
});

app.post("/api/auth/logout", (req, res) => {
  // Stateless JWT: client just removes token.
  return res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  return res.json({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
  });
});

app.post("/api/auth/resend-otp", async (req, res) => {
  const { email } = req.body || {};
  const u = await Models.User.findOne({
    email: String(email).toLowerCase(),
  }).lean();
  if (!u) return res.status(404).json({ message: "User not found" });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  // NOTE: OTP is kept in-memory in the old implementation; current route keeps same behavior for UI.
  // If you later want to persist OTP, update schema/model.
  return res.status(403).json({ message: "OTP onboarding disabled" });
});

// Stub password reset so UI doesn't break
app.post("/api/auth/reset-password-request", (req, res) =>
  res.json({ message: "If user exists, reset link sent." })
);
app.post("/api/auth/reset-password", (req, res) =>
  res.json({ message: "Password reset successful" })
);

// ---- Entities helpers ----
// NOTE: parseOrderParam + sortByField are already provided by ./mongoUtils.js in this project.

// ---- Users ----
app.get("/api/users", requireAdmin, async (req, res) => {
  const users = await Models.User.find().lean();
  return res.json(users.map(toPublicUser));
});

function ensureNotAdminTarget(targetUser) {
  if (targetUser?.role === "admin") {
    const err = new Error("Operation not allowed on admin account");
    err.status = 403;
    throw err;
  }
}

// PATCH staff fields (admin only)
// PUT /api/users/:id
app.patch("/api/users/:id", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const target = await Models.User.findOne({ id: req.params.id });
  if (!target) return res.status(404).json({ message: "Staff not found" });

  ensureNotAdminTarget(target);

  const allowed = ["full_name", "email", "phone", "designation", "area"];

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      if (k === "email" && v != null) target[k] = String(v).toLowerCase();
      else target[k] = v == null ? "" : String(v);
    }
  }

  await target.save();
  return res.json(toPublicUser(target.toObject ? target.toObject() : target));
});

// POST reset password (admin only)
app.post("/api/users/:id/reset-password", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const { password } = body;

  if (!password) {
    return res.status(400).json({ message: "password is required" });
  }

  const target = await Models.User.findOne({ id: req.params.id });
  if (!target) return res.status(404).json({ message: "Staff not found" });

  ensureNotAdminTarget(target);

  target.passwordHash = bcrypt.hashSync(String(password), 10);
  await target.save();

  return res.json({ message: "Password updated" });
});

// DELETE staff (admin only)
app.delete("/api/users/:id", requireAdmin, async (req, res) => {
  const target = await Models.User.findOne({ id: req.params.id }).lean();
  if (!target) return res.status(404).json({ message: "Staff not found" });

  ensureNotAdminTarget(target);

  await Models.User.deleteOne({ id: req.params.id });
  return res.json({ message: "Staff deleted" });
});

// Create staff (OTP-based onboarding removed)
// POST /api/users/create (admin only)
app.post("/api/users/create", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const { full_name, email, password, phone, designation } = body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      message: "full_name, email and password required",
    });
  }

  const normalizedEmail = String(email).toLowerCase();

  const exists = await Models.User.findOne({
    email: normalizedEmail,
  }).lean();

  if (exists) {
    return res.status(409).json({
      message: "Email already exists",
    });
  }

  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(String(password), 10);

  await Models.User.create({
    id: userId,
    email: normalizedEmail,
    passwordHash,

    full_name: String(full_name),

    role: "staff",
    phone: phone ? String(phone) : "",
    area: "",
    designation: designation ? String(designation) : "",
    createdAt: new Date().toISOString(),
  });

  // Important: do NOT return password hash or password.
  return res.json({ message: "Staff created", userId });
});

// ---- Collections (Received) ----
app.get("/api/collections", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  let items =
    u?.role === "admin"
      ? await Models.Collection.find().lean()
      : await Models.Collection.find({
          staff_id: u.id,
        }).lean();

  const orderBy = req.query.orderBy;
  const parsed = parseOrderParam(orderBy);

  if (parsed) {
    items = sortByFieldForArray(items, parsed);
  }

  return res.json(items);
});

app.post("/api/collections", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  const body = req.body || {};

  if (body.source) {
    const existingClient = await Models.Client.findOne({
      name: { $regex: new RegExp(`^${body.source}$`, "i") },
    }).lean();
    if (!existingClient) {
      const trimmedName = String(body.source).trim();
      await Models.Client.create({
        id: uuidv4(),
        name: trimmedName,
        staff_id: u.id,
        staff_name: u.full_name,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const item = {
    id: uuidv4(),
    source: body.source || "",
    amount: Number(body.amount) || 0,
    date: body.date,
    time: body.time || "",
    payment_mode: body.payment_mode || "cash",
    reference_number: body.reference_number || "",
    notes: body.notes || "",
    staff_id: body.staff_id || u.id,
    staff_name: body.staff_name || u.full_name,
  };

  await Models.Collection.create(item);
  return res.json(item);
});

// ---- Expenses ----
app.get("/api/expenses", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  let items =
    u?.role === "admin"
      ? await Models.Expense.find().lean()
      : await Models.Expense.find({
          staff_id: u.id,
        }).lean();

  const orderBy = req.query.orderBy;
  const parsed = parseOrderParam(orderBy);
  if (parsed) items = sortByFieldForArray(items, parsed);

  return res.json(items);
});

app.patch("/api/expenses/:id", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  const item = await Models.Expense.findOne({
    id: req.params.id,
  });

  if (!item) {
    return res.status(404).json({ message: "Not found" });
  }

  if (u.role !== "admin" && item.staff_id !== u.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const allowed = [
    "status",
    "category",
    "amount",
    "expense_date",
    "description",
    "bill_image",
  ];

  for (const k of allowed) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
      item[k] = req.body[k];
    }
  }

  await item.save();
  return res.json(item);
});

app.post("/api/expenses", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  const body = req.body || {};

  const item = {
    id: uuidv4(),
    category: body.category || "other",
    amount: Number(body.amount) || 0,
    expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
    description: body.description || "",
    bill_image: body.bill_image || "",
    staff_id: body.staff_id || u.id,
    staff_name: body.staff_name || u.full_name,
    status: body.status || "pending",
  };

  await Models.Expense.create(item);
  return res.json(item);
});

// ---- SentPayments ----
app.get("/api/sent-payments", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  let items =
    u?.role === "admin"
      ? await Models.SentPayment.find().lean()
      : await Models.SentPayment.find({
          staff_id: u.id,
        }).lean();

  const orderBy = req.query.orderBy;
  const parsed = parseOrderParam(orderBy);

  if (parsed) {
    items = sortByFieldForArray(items, parsed);
  }

  return res.json(items);
});

app.post("/api/sent-payments", authRequired, async (req, res) => {
  const u = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  const body = req.body || {};

  if (body.sent_to) {
    const existingClient = await Models.Client.findOne({
      name: { $regex: new RegExp(`^${body.sent_to}$`, "i") },
    }).lean();
    if (!existingClient) {
      const trimmedName = String(body.sent_to).trim();
      await Models.Client.create({
        id: uuidv4(),
        name: trimmedName,
        staff_id: u.id,
        staff_name: u.full_name,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const item = {
    id: uuidv4(),
    sent_to: body.sent_to || "",
    amount: Number(body.amount) || 0,
    date: body.date || new Date().toISOString().slice(0, 10),
    remark: body.remark || "",
    staff_id: body.staff_id || u.id,
    staff_name: body.staff_name || u.full_name,
  };

  await Models.SentPayment.create(item);

  return res.json(item);
});

// ---- CashLedger ----
app.get("/api/cash-ledger", requireAdmin, async (req, res) => {
  const items = await Models.CashLedger.find().lean();
  const orderBy = req.query.orderBy;
  const parsed = parseOrderParam(orderBy);
  const sorted = parsed ? sortByFieldForArray(items, parsed) : items;
  return res.json(sorted);
});

app.post("/api/cash-ledger", requireAdmin, async (req, res) => {
  const u = await Models.User.findOne({ id: req.auth.userId }).lean();
  const body = req.body || {};

  const item = {
    id: uuidv4(),
    amount: Number(body.amount) || 0,
    remark: body.remark || "",
    entry_date: body.entry_date || new Date().toISOString().slice(0, 10),
    created_by: u.id,
    created_at: new Date().toISOString(),
  };

  await Models.CashLedger.create(item);
  return res.json(item);
});

app.delete("/api/cash-ledger/:id", requireAdmin, async (req, res) => {
  await Models.CashLedger.deleteOne({ id: req.params.id });
  return res.json({ message: "Cash entry deleted" });
});

// ---- StaffTransfer ----
app.get("/api/staff-transfers", authRequired, async (req, res) => {
  const u = await Models.User.findOne({ id: req.auth.userId }).lean();

  let items = [];
  if (u?.role === "admin") {
    items = await Models.StaffTransfer.find().lean();
  } else {
    items = await Models.StaffTransfer.find({ staff_id: u.id }).lean();
  }

  const orderBy = req.query.orderBy;
  const parsed = parseOrderParam(orderBy);
  const sorted = parsed ? sortByFieldForArray(items, parsed) : items;
  return res.json(sorted);
});

app.post("/api/staff-transfers", requireAdmin, async (req, res) => {
  const u = await Models.User.findOne({ id: req.auth.userId }).lean();
  const body = req.body || {};

  const staffId = body.staff_id;
  if (!staffId) return res.status(400).json({ message: "staff_id required" });

  const staff = await Models.User.findOne({ id: staffId }).lean();
  if (!staff) return res.status(404).json({ message: "Staff not found" });

  const item = {
    id: uuidv4(),
    staff_id: staff.id,
    staff_name: staff.full_name || "",
    amount: Number(body.amount) || 0,
    remark: body.remark || "",
    transfer_date: body.transfer_date || new Date().toISOString().slice(0, 10),
    created_by: u.id,
    created_at: new Date().toISOString(),
  };

  await Models.StaffTransfer.create(item);
  return res.json(item);
});

app.delete("/api/staff-transfers/:id", requireAdmin, async (req, res) => {
  await Models.StaffTransfer.deleteOne({ id: req.params.id });
  return res.json({ message: "Staff transfer deleted" });
});

// ---- Clients ----
app.get("/api/clients", authRequired, async (req, res) => {
  const currentUser = await Models.User.findOne({
    id: req.auth.userId,
  }).lean();

  let items =
    currentUser?.role === "admin"
      ? await Models.Client.find().lean()
      : await Models.Client.find({
          staff_id: currentUser?.id,
        }).lean();

  const orderBy = req.query.orderBy;
  const parsed = parseOrderParam(orderBy);
  if (parsed) {
    items = sortByFieldForArray(items, parsed);
  }
  return res.json(items);
});

// ---- Company Settings (Admin only) ----
// GET /api/settings/company
app.get("/api/settings/company", requireAdmin, async (req, res) => {
  const settings = await Models.Settings.findOne().lean();
  return res.json(
    settings || {
      company_name: "",
      company_phone: "",
      company_address: "",
    }
  );
});

// PUT /api/settings/company
app.put("/api/settings/company", requireAdmin, async (req, res) => {
  try {
    console.log("Company Settings Save:", req.body);

    const body = req.body || {};

    // Ensure every path returns a response
    if (!body) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    const { company_name, company_phone, company_address } = body;

    const updated = await Models.Settings.findOneAndUpdate(
      {},
      {
        company_name: String(company_name || ""),
        company_phone: String(company_phone || ""),
        company_address: String(company_address || ""),
        updatedAt: new Date().toISOString(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Internal server error",
    });
  }
});

// ---- Upload file stub ----
app.post("/api/upload", authRequired, (req, res) => {
  // Frontend expects { file_url }
  // For now, just return placeholder.
  return res.json({ file_url: "https://placehold.co/600x400/png" });
});

app.listen(PORT, () => {
  console.log(`[local-api] listening on http://localhost:${PORT}`);
});

