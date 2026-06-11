import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Models } from "./db.js";

export async function seedAdminUser() {
  const { User } = Models;
  const email = "admin@local.test";

  const exists = await User.findOne({ email });
  if (exists) return;

  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync("admin123", 10);

  await User.create({
    id: uuidv4(),
    full_name: "Admin User",
    email,
    passwordHash,
    role: "admin",
    phone: "",
    area: "",
    designation: "",
    createdAt: now,
  });
}
