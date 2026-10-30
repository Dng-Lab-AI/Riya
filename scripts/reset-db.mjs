// Drops the Riya database configured in MONGODB_URI (.env.local / .env).
// Demo data is recreated on the next request to the app.
import fs from "node:fs";
import { MongoClient } from "mongodb";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI n'est pas défini dans .env.local.");
  process.exit(1);
}

const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 10000 });
const db = client.db();
await db.dropDatabase();
await client.close();
console.log(`Base « ${db.databaseName} » réinitialisée sur ${uri.replace(/\/\/[^@/]*@/, "//***@").split("?")[0]}.`);
console.log("Redémarrez le serveur Next.js pour recréer les données de démo.");
