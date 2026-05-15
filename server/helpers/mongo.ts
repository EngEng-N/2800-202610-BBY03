import { MongoClient, type Db, type Collection } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI environment variable is required");
}

const client = new MongoClient(uri);
const dbName = process.env.MONGODB_DB ?? "app";

let connectPromise: Promise<MongoClient> | null = null;

export function getClient(): Promise<MongoClient> {
  if (!connectPromise) {
    connectPromise = client.connect();
  }
  return connectPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClient();
  return c.db(dbName);
}

export async function getUsers(): Promise<Collection> {
  const db = await getDb();
  return db.collection("users");
}

export const mongoUri = uri;
export const mongoDbName = dbName;
