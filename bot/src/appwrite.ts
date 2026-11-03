import { Client, TablesDB, Storage } from "node-appwrite";
import { appwriteReady, config } from "./config.js";

const client = new Client();

if (appwriteReady()) {
  client.setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
}

export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export const ids = {
  databaseId: config.databaseId,
  bucketId: config.bucketId,
  authFileId: "baileys-auth",
  drivers: "drivers",
  trips: "trips",
  series: "series",
  chatLogs: "chat_logs",
  sessions: "sessions",
  meta: "meta",
} as const;
