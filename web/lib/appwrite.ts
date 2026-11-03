"use client";

import {
  Account,
  AppwriteException,
  Client,
  ExecutionMethod,
  Functions,
  ID,
  Query,
  TablesDB,
} from "appwrite";
import { envReady, publicEnv } from "./env";

export const ids = {
  databaseId: publicEnv.databaseId,
  drivers: "drivers",
  trips: "trips",
  series: "series",
  chatLogs: "chat_logs",
  admins: "admins",
  functionId: publicEnv.functionId,
} as const;

let client: Client | null = null;

export function getClient(): Client {
  if (!envReady) throw new Error("Appwrite belum dikonfigurasi.");
  if (!client) {
    client = new Client().setEndpoint(publicEnv.endpoint).setProject(publicEnv.projectId);
  }
  return client;
}

export function account() {
  return new Account(getClient());
}

export function tables() {
  return new TablesDB(getClient());
}

export { ID, Query };

export function isMissing(error: unknown): boolean {
  return error instanceof AppwriteException && error.code === 404;
}

export function isConflict(error: unknown): boolean {
  return error instanceof AppwriteException && error.code === 409;
}

export function errorText(error: unknown): string {
  if (error instanceof AppwriteException) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan.";
}

export async function executeFunction<T>(body: unknown): Promise<T> {
  const functions = new Functions(getClient());
  const execution = await functions.createExecution({
    functionId: ids.functionId,
    body: JSON.stringify(body),
    async: false,
    method: ExecutionMethod.POST,
  });
  let data: { ok?: boolean; error?: string } = {};
  try {
    data = JSON.parse(execution.responseBody || "{}") as { ok?: boolean; error?: string };
  } catch {
    data = {};
  }
  if (execution.status === "failed" || (execution.responseStatusCode ?? 500) >= 400 || data.ok === false) {
    throw new Error(data.error || execution.errors || "Permintaan gagal.");
  }
  return data as T;
}
