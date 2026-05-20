import { MongoClient, type Db, type Collection } from "mongodb";

function buildUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  if (!user || !password || !host) {
    throw new Error(
      "MONGODB_URI or MONGODB_USER/MONGODB_PASSWORD/MONGODB_HOST must be set",
    );
  }
  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/?retryWrites=true&w=majority`;
}

const uri = buildUri();
const client = new MongoClient(uri);
const dbName = process.env.MONGODB_USERS_DB ?? process.env.MONGODB_DB ?? "app";

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
