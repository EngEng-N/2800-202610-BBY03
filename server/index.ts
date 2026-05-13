import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import session from "express-session";
import MongoStore from "connect-mongo";

import datasetRouter from "./routes/datasets";
import authRouter from "./routes/auth";
import { mongoUri, mongoDbName } from "./helpers/mongo";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      dbName: mongoDbName,
      collectionName: "sessions",
      crypto: {
        secret: process.env.SESSION_CRYPTO_SECRET ?? "dev-crypto-change-me",
      },
    }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use('/api/datasets', datasetRouter);
app.use('/api/auth', authRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
