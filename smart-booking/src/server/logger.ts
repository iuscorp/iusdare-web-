import "server-only";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Claves cuyo valor nunca debe llegar a los logs (privacidad desde el diseño). */
const SENSITIVE = /(email|phone|token|secret|password|authorization|cookie|fullname|answers|code_verifier|refresh|access)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: process.env.NODE_ENV === "production" ? undefined : value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function minLevel(): Level {
  const l = process.env.LOG_LEVEL as Level | undefined;
  return l && l in ORDER ? l : "info";
}

function log(level: Level, msg: string, data?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  if (process.env.NODE_ENV === "test" && level !== "error" && !process.env.LOG_IN_TESTS) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(data ? (redact(data) as object) : {}) });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};

export const __test__ = { redact };
