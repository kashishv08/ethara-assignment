import mongoose from "mongoose";
import { logger } from "./logger";

let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectDb(): Promise<typeof mongoose> {
  if (connectionPromise) return connectionPromise;

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  mongoose.set("strictQuery", true);

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 15000,
      dbName: "team_task_manager",
    })
    .then((conn) => {
      logger.info(
        { db: conn.connection.name, host: conn.connection.host },
        "MongoDB connected",
      );
      return conn;
    })
    .catch((err) => {
      logger.error({ err }, "Failed to connect to MongoDB");
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}
