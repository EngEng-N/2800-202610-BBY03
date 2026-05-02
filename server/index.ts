const express = require("express");
const routes = require("./routes.json");

const app: any = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const openVancouver: { path: string, url: string }[] = routes.openVancouver;

for (const { path, url } of openVancouver) {
  app.get(path, async (_req: any, res: any, next: any) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Upstream error" });
      }
      const data = await response.json();
      res.json(data);
    } catch (err) {
      next(err);
    }
  });
  console.log(`Registered GET ${path}`);
}

app.get("/api/health", (_req: any, res: any) => {
  res.json({ status: "ok" });
});

app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
