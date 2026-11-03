export const publicEnv = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "main",
  functionId: process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID || "kwitansi",
};

export const envReady = Boolean(publicEnv.endpoint && publicEnv.projectId);
