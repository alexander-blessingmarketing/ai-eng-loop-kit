import pino, { type Logger } from "pino";
import { getRequestContext } from "@/lib/request-context";
import { emitPinoEntry } from "@/lib/otel-logs";

declare global {
  var __serverLogger: Logger | undefined;
}

const SERVICE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "app";

function levelForEnv(): string {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (env === "production") return "info";
  if (env === "preview") return "info";
  return "debug";
}

const otelStream = {
  write(line: string) {
    process.stdout.write(line);
    emitPinoEntry(line);
  },
};

function buildLogger(): Logger {
  return pino(
    {
      level: levelForEnv(),
      base: {
        service: SERVICE_NAME,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "headers.authorization",
          "headers.cookie",
          "password",
          "token",
          "api_key",
          "*.password",
          "*.token",
          "*.api_key",
        ],
        censor: "[Redacted]",
      },
      mixin() {
        const ctx = getRequestContext();
        if (!ctx) return {};
        return {
          request_id: ctx.requestId,
          route: ctx.route,
          method: ctx.method,
          ...(ctx.userId ? { user_id: ctx.userId } : {}),
        };
      },
    },
    otelStream,
  );
}

export function getLogger(): Logger {
  if (!globalThis.__serverLogger) {
    globalThis.__serverLogger = buildLogger();
  }
  return globalThis.__serverLogger;
}
