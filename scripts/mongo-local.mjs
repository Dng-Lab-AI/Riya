// Starts a local MongoDB for development, without installing MongoDB.
// Data is kept in ./data/mongo between runs. Use a real MongoDB (Atlas or a
// server) in production by setting MONGODB_URI.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = process.env.MONGO_DATA_DIR ?? fileURLToPath(new URL("../data/mongo", import.meta.url));
fs.mkdirSync(dbPath, { recursive: true });

const port = Number(process.env.MONGO_PORT ?? 27017);
const server = await MongoMemoryServer.create({ instance: { port, dbPath, storageEngine: "wiredTiger" } });

console.log(`MongoDB local prêt : ${server.getUri()}riya`);
console.log("Laissez ce terminal ouvert pendant que vous utilisez l'application (Ctrl+C pour arrêter).");

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
