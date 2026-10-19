import mongoose from "mongoose";
import { createApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB, serverSelectionTimeoutMS: 8000 });
console.log(`เชื่อมต่อ MongoDB แล้ว (db: ${config.MONGODB_DB})`);

const server = createApp(config).listen(config.PORT, () => console.log(`API พร้อมที่ http://localhost:${config.PORT}/api`));

const shutdown = () => { server.close(() => void mongoose.disconnect().then(() => process.exit(0))); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
