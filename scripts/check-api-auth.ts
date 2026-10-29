// Fails if any API route or page could be reached without checking who is asking.
//   npm run check:auth
//
// - Every Route Handler must be wrapped in handle() and call requireApiUser() itself.
//   Only sign-in, sign-up and sign-out are public.
// - Every page in the signed-in area must call requireUser() itself. A layout's check is not
//   enough: layouts don't re-run on client navigation, so each page guards its own data.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const PUBLIC_ROUTES = new Set(["auth/login/route.ts", "auth/signup/route.ts", "auth/logout/route.ts"]);
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function walk(dir: string, match: (file: string) => boolean, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, match, out);
    else if (match(name)) out.push(full);
  }
  return out;
}

const problems: string[] = [];
let handlers = 0;

// ---- Route Handlers
const apiDir = join(ROOT, "src/app/api");
for (const file of walk(apiDir, (n) => n === "route.ts")) {
  const rel = relative(apiDir, file).split(sep).join("/");
  const src = readFileSync(file, "utf8");
  const exportPattern = String.raw`export\s+(?:const|async function|function)\s+(${METHODS.join("|")})\b`;
  const starts = [...src.matchAll(new RegExp(exportPattern, "g"))];

  starts.forEach((m, i) => {
    handlers++;
    const body = src.slice(m.index!, starts[i + 1]?.index ?? src.length);
    const label = `${m[1]} /api/${rel.replace(/\/?route\.ts$/, "")}`;
    const wrapped = new RegExp(String.raw`export\s+const\s+${m[1]}\s*=\s*handle\(`);
    if (!wrapped.test(body)) {
      problems.push(`${label}: not wrapped in handle() (errors and same-origin checks would be skipped)`);
    }
    if (!PUBLIC_ROUTES.has(rel) && !body.includes("requireApiUser(")) {
      problems.push(`${label}: never calls requireApiUser(), so it is open to anyone`);
    }
  });
}

// ---- Pages in the signed-in area
const appDir = join(ROOT, "src/app/(app)");
let pages = 0;
for (const file of walk(appDir, (n) => n === "page.tsx")) {
  pages++;
  if (!readFileSync(file, "utf8").includes("requireUser(")) {
    problems.push(`page ${relative(ROOT, file).split(sep).join("/")}: never calls requireUser()`);
  }
}

console.log(`Checked ${handlers} API handlers and ${pages} signed-in pages.`);
if (problems.length) {
  console.error("\nAccess-control problems:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("OK: every handler requires sign-in (except login/signup/logout) and every page checks the session.");
