import fs from "fs";
import nodePath from "path";

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

export type CensusData = {
  areas: string[];
  rows: {
    id: number;
    variable: string;
    values: Record<string, number | string>;
  }[];
};

let censusCache: CensusData | null = null;

export function loadCensus2016(): CensusData {
  if (censusCache) return censusCache;
  const file = nodePath.join(
    __dirname,
    "..",
    "datasets",
    "CensusLocalAreaProfiles2016.csv",
  );
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.startsWith("ID,Variable"));
  if (headerIdx === -1) throw new Error("Census CSV header row not found");
  const headers = parseCsvLine(lines[headerIdx]).map((h) => h.trim());
  const areas = headers.slice(2);
  const rows: CensusData["rows"] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;
    const id = Number(cols[0]);
    const variable = (cols[1] || "").trim();
    const values: Record<string, number | string> = {};
    for (let j = 0; j < areas.length; j++) {
      const raw = (cols[j + 2] || "").trim().replace(/,/g, "");
      if (raw === "") {
        values[areas[j]] = "";
        continue;
      }
      const num = Number(raw);
      values[areas[j]] = Number.isFinite(num) ? num : raw;
    }
    rows.push({ id, variable, values });
  }
  censusCache = { areas, rows };
  return censusCache;
}
