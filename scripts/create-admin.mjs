// Creates an administrator account for the admin site (admin.<domain>), or promotes an existing account,
// in the database configured in MONGODB_URI (.env.local / .env).
//
//   npm run admin:create -- you@example.com "Your Name"
//
// The password is asked in the terminal (it is never written in the command or the history).
import fs from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { MongoClient, ObjectId } from "mongodb";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}
const uri = process.env.MONGODB_URI;
const [email, ...nameParts] = process.argv.slice(2);
if (!uri) {
  console.error("MONGODB_URI is not set in .env.local.");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error('Usage: npm run admin:create -- you@example.com "Your Name"');
  process.exit(1);
}

// Same format as src/lib/password.ts.
const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Password for the admin account (12 characters or more): ");
rl.close();
if (password.length < 12) {
  console.error("The password must have at least 12 characters.");
  process.exit(1);
}

const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 10000 });
const users = client.db().collection("users");
const normalized = email.toLowerCase();
const existing = await users.findOne({ email: normalized });
if (existing) {
  await users.updateOne({ _id: existing._id }, { $set: { role: "admin", status: "active", passwordHash: hashPassword(password), emailVerified: true }, $unset: { suspendedUntil: "", moderation: "" } });
  console.log(`${normalized} is now an administrator (password updated).`);
} else {
  await users.insertOne({
    _id: new ObjectId(), name: nameParts.join(" ") || "Riya team", email: normalized, passwordHash: hashPassword(password), role: "admin",
    status: "active", country: "", avatarUrl: "", favorites: [], emailVerified: true, createdAt: new Date(),
  });
  console.log(`Administrator account created for ${normalized}.`);
}
await client.close();
console.log("Log in on the admin site: admin.<your domain> (http://admin.localhost:3000 in development).");
