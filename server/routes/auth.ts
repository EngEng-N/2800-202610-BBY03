import { Router } from "express";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { getUsers } from "../helpers/mongo";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const router = Router();
const SALT_ROUNDS = 12;

router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body ?? {};
    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      res
        .status(400)
        .json({ error: "username, email and password are required" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "invalid email address" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "password must be at least 8 characters" });
      return;
    }

    const users = await getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await users.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });
    if (existing) {
      const taken =
        existing.username === username ? "Username" : "Email";
      res.status(409).json({ error: `${taken} already taken` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await users.insertOne({
      username,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
    });

    req.session.userId = result.insertedId.toString();
    res.status(201).json({
      id: result.insertedId,
      username,
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "username and password are required" });
      return;
    }

    const users = await getUsers();
    const user = await users.findOne({ username });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.userId = user._id.toString();
    res.json({ id: user._id, username: user.username });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res, next) => {
  if (!req.session) {
    res.json({ ok: true });
    return;
  }
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.delete("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const users = await getUsers();
    await users.deleteOne({ _id: new ObjectId(req.session.userId) });
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const users = await getUsers();
    const user = await users.findOne(
      { _id: new ObjectId(req.session.userId) },
      { projection: { passwordHash: 0 } },
    );
    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
