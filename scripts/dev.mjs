#!/usr/bin/env node
/**
 * One command starts the whole stack:
 *
 *   npm run dev
 *
 * Boots the Django API (migrating and seeding it first if needed), waits until
 * it actually answers, then starts Next.js pointed at it with
 * NEXT_PUBLIC_API_MODE=api. Ctrl+C stops both.
 *
 * Flags:
 *   --api-only    just the Django API
 *   --web-only    just Next.js (add --mock for the bundled demo data)
 *   --mock        run the frontend against the mock data instead of the API
 *   --skip-setup  don't run migrate / seed_demo before starting
 */

import { spawn } from "node:child_process";
import { connect } from "node:net";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKEND = join(ROOT, "backend");

const argv = new Set(process.argv.slice(2));
const apiOnly = argv.has("--api-only");
const webOnly = argv.has("--web-only");
const mockMode = argv.has("--mock");
const skipSetup = argv.has("--skip-setup");

const API_PORT = Number(process.env.API_PORT || 8000);
const WEB_PORT = Number(process.env.PORT || 3000);
const API_URL = `http://localhost:${API_PORT}`;

// ── Pretty prefixed output ───────────────────────────────────────────

const COLOR = { api: "\x1b[36m", web: "\x1b[35m", dev: "\x1b[32m", err: "\x1b[31m" };
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function log(tag, message) {
  const color = COLOR[tag] ?? COLOR.dev;
  for (const line of String(message).split("\n")) {
    process.stdout.write(`${color}[${tag}]${RESET} ${line}\n`);
  }
}

function pipe(tag, child) {
  const emit = (buf) => {
    const text = buf.toString().replace(/\s+$/, "");
    if (text) log(tag, text);
  };
  child.stdout?.on("data", emit);
  child.stderr?.on("data", emit);
}

// ── Locating the backend interpreter ─────────────────────────────────

function resolvePython() {
  const candidates =
    process.platform === "win32"
      ? [join(BACKEND, ".venv", "Scripts", "python.exe")]
      : [join(BACKEND, ".venv", "bin", "python3"), join(BACKEND, ".venv", "bin", "python")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  log("err", `No virtualenv found at ${join(BACKEND, ".venv")}`);
  log("err", "Create one first:");
  log(
    "err",
    process.platform === "win32"
      ? "  cd backend && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt"
      : "  cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  );
  process.exit(1);
}

// ── Child processes ──────────────────────────────────────────────────

const children = [];

function start(tag, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? ROOT,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  children.push({ tag, child });
  pipe(tag, child);

  child.on("error", (error) => {
    log("err", `${tag} failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    log("err", `${tag} exited (${signal ?? `code ${code}`}) — stopping everything.`);
    shutdown(code ?? 1);
  });

  return child;
}

/** Runs a command to completion and resolves with its exit code. */
function run(tag, command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    pipe(tag, child);
    child.on("error", (error) => {
      log("err", `${command} failed: ${error.message}`);
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

// Django's autoreloader and Next both fork workers, so killing the direct
// child is not enough — on Windows only taskkill /T reaches the whole tree.
function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Set it now: the timer below is unref'd, so if the event loop empties first
  // Node exits on its own and would otherwise report success after a failure.
  process.exitCode = code;
  for (const { child } of children) killTree(child);
  setTimeout(() => process.exit(code), 400).unref();
}

process.on("SIGINT", () => {
  process.stdout.write("\n");
  log("dev", "Shutting down…");
  shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));

// ── Ports ────────────────────────────────────────────────────────────

/** Can we connect to the port? Something is listening if we can.
 *
 * Deliberately not a bind probe: on Windows, binding 0.0.0.0 succeeds even
 * while another process holds the same port, so that test reports "free" for a
 * port that is very much taken. Connecting is accurate on every platform.
 * Both loopback families are tried — a server may be bound to only one.
 */
function portInUse(port) {
  const tryHost = (host) =>
    new Promise((resolve) => {
      const socket = connect({ port, host });
      const done = (result) => {
        socket.destroy();
        resolve(result);
      };
      socket.setTimeout(1000);
      socket.once("connect", () => done(true));
      socket.once("timeout", () => done(false));
      socket.once("error", () => done(false));
    });

  return Promise.all([tryHost("127.0.0.1"), tryHost("::1")]).then((r) => r.some(Boolean));
}

/** Fails early with a readable message instead of a listen() stack trace. */
async function requireFreePort(port, what, envVar) {
  if (!(await portInUse(port))) return;
  log("err", `Port ${port} is already taken, so ${what} cannot start.`);
  log("err", "Something is probably still running from an earlier session. Either stop it:");
  log(
    "err",
    process.platform === "win32"
      ? `  netstat -ano | findstr :${port}      then  taskkill /PID <pid> /F`
      : `  lsof -ti :${port} | xargs kill`
  );
  log("err", `…or start on a different port:  ${envVar}=${port + 1} npm run dev`);
  process.exit(1);
}

// ── Waiting for the API to answer ────────────────────────────────────

async function waitForApi(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shuttingDown) return false;
    try {
      // Any HTTP answer means Django is listening; 401/404 count as up.
      await fetch(API_URL, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

// ── Steps ────────────────────────────────────────────────────────────

async function setupBackend(python) {
  log("dev", "Applying migrations…");
  const migrated = await run("api", python, ["manage.py", "migrate", "--noinput"], {
    cwd: BACKEND,
  });
  if (migrated !== 0) {
    log("err", "migrate failed — fix the backend before starting.");
    process.exit(migrated);
  }
  // seed_demo is a no-op when the database already has data.
  log("dev", "Seeding demo data if the database is empty…");
  await run("api", python, ["manage.py", "seed_demo"], { cwd: BACKEND });
}

function startApi(python) {
  log("dev", `Starting Django API on ${API_URL}`);
  return start("api", python, ["manage.py", "runserver", `${API_PORT}`], {
    cwd: BACKEND,
    env: {
      PYTHONUNBUFFERED: "1",
      // Django's default CORS list only names port 3000. Derive it from the
      // port the frontend is actually on, or every browser request is blocked
      // as soon as someone runs with PORT=3001.
      CORS_ALLOWED_ORIGINS:
        process.env.CORS_ALLOWED_ORIGINS ??
        `http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT}`,
    },
  });
}

function startWeb() {
  const mode = mockMode ? "mock" : "api";
  log("dev", `Starting Next.js on http://localhost:${WEB_PORT} (data source: ${mode})`);
  return start("web", process.execPath, [join(ROOT, "node_modules", "next", "dist", "bin", "next"), "dev"], {
    env: {
      // Next keeps variables already present in the environment, so this wins
      // over whatever .env.local says.
      NEXT_PUBLIC_API_MODE: mode,
      NEXT_PUBLIC_API_URL: API_URL,
      PORT: String(WEB_PORT),
    },
  });
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // Check both ports up front — finding out only after migrations have run is
  // a slow way to learn that something else owns the port.
  if (!apiOnly) await requireFreePort(WEB_PORT, "Next.js", "PORT");
  if (!webOnly) await requireFreePort(API_PORT, "the Django API", "API_PORT");

  if (webOnly) {
    startWeb();
    return;
  }

  const python = resolvePython();
  if (!skipSetup) await setupBackend(python);
  startApi(python);

  if (apiOnly) return;

  const up = await waitForApi();
  if (shuttingDown) return;
  if (!up) {
    log("err", `The API never answered on ${API_URL}. Is port ${API_PORT} already taken?`);
    shutdown(1);
    return;
  }
  log("dev", "API is up.");

  startWeb();

  process.stdout.write(
    `\n${BOLD}  Frontend${RESET}  http://localhost:${WEB_PORT}\n` +
      `${BOLD}  API${RESET}       ${API_URL}\n` +
      `${BOLD}  Docs${RESET}      ${API_URL}/api/docs/\n\n` +
      `  Log in with admin@eduflow.uz / admin123 — Ctrl+C stops both.\n\n`
  );
}

main().catch((error) => {
  log("err", error?.stack || String(error));
  shutdown(1);
});
