import { MongoClient, type Db, type Collection } from "mongodb";

let connectPromise: Promise<MongoClient> | null = null;

function buildUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  if (!user || !pass || !host) {
    throw new Error(
      "MongoDB env vars required: MONGODB_URI or (MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST)",
    );
  }
  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/?retryWrites=true&w=majority`;
}

export function getMongoUri(): string {
  return buildUri();
}

export function getUsersDbName(): string {
  return process.env.MONGODB_USERS_DB ?? "users";
}

export function getSessionDbName(): string {
  return process.env.MONGODB_SESSION_DB ?? "session";
}

export function getClient(): Promise<MongoClient> {
  if (!connectPromise) {
    const client = new MongoClient(buildUri());
    connectPromise = client.connect();
  }
  return connectPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getClient();
  return c.db(getUsersDbName());
}

export async function getUsers(): Promise<Collection> {
  const db = await getDb();
  return db.collection("users");
}
