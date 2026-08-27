import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  type ReadableLogRecord,
  type LogRecordExporter,
} from "@opentelemetry/sdk-logs";
import { ExportResultCode, type ExportResult } from "@opentelemetry/core";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * Custom OTLP-Exporter für PostHog-Logs-Ingest (`/i/v1/logs`).
 *
 * Wir nutzen einen eigenen `fetch`-basierten Exporter statt
 * `@opentelemetry/exporter-logs-otlp-http`, weil der Standard-Exporter
 * Fehler verschluckt — bei Endpoint-Problemen würden Logs schweigend
 * verloren gehen. Diese Variante loggt HTTP-Errors auf `console.error`
 * und macht Probleme sichtbar.
 *
 * Hintergrund: docs/architektur/observability.md (Abschnitt 3).
 */

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const SERVICE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "app";
const POSTHOG_LOGS_ENDPOINT = "https://eu.i.posthog.com/i/v1/logs";

type AnyValue =
  | { stringValue: string }
  | { intValue: number }
  | { doubleValue: number }
  | { boolValue: boolean };

function toAnyValue(value: unknown): AnyValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { intValue: value } : { doubleValue: value };
  }
  return { stringValue: JSON.stringify(value) };
}

function toAttributes(input: Record<string, unknown> | undefined) {
  if (!input) return [];
  return Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => ({ key, value: toAnyValue(value) }));
}

class PostHogLogExporter implements LogRecordExporter {
  constructor(
    private url: string,
    private apiKey: string,
    private resourceAttributes: Record<string, unknown>,
  ) {}

  async export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    if (logs.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    const body = {
      resourceLogs: [
        {
          resource: { attributes: toAttributes(this.resourceAttributes) },
          scopeLogs: [
            {
              scope: { name: SERVICE_NAME },
              logRecords: logs.map((log) => {
                const seconds = typeof log.hrTime?.[0] === "number" ? log.hrTime[0] : Math.floor(Date.now() / 1000);
                const nanos = typeof log.hrTime?.[1] === "number" ? log.hrTime[1] : (Date.now() % 1000) * 1_000_000;
                return {
                  timeUnixNano: `${seconds}${String(nanos).padStart(9, "0")}`,
                  severityNumber: log.severityNumber,
                  severityText: log.severityText,
                  body: { stringValue: typeof log.body === "string" ? log.body : JSON.stringify(log.body) },
                  attributes: toAttributes(log.attributes as Record<string, unknown>),
                };
              }),
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error(
          `[otel-exporter] HTTP ${res.status} ${res.statusText}: ${text.slice(0, 500)}`,
        );
        resultCallback({
          code: ExportResultCode.FAILED,
          error: new Error(`HTTP ${res.status}`),
        });
        return;
      }
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (err) {
      console.error("[otel-exporter] fetch failed:", err);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  async shutdown(): Promise<void> {
    // nichts zu tun
  }

  async forceFlush(): Promise<void> {
    // SimpleLogRecordProcessor exports synchron, kein Flush nötig
  }
}

if (!apiKey) {
  console.warn(
    "[instrumentation] NEXT_PUBLIC_POSTHOG_KEY not set — OTLP-Logs disabled, Pino-stdout active",
  );
} else if (!globalThis.__otelLogger) {
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

  const resourceAttrs = {
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: commitSha ? commitSha.slice(0, 7) : "unknown",
    "deployment.environment": environment,
  };

  const resource = resourceFromAttributes(resourceAttrs);

  const exporter = new PostHogLogExporter(
    POSTHOG_LOGS_ENDPOINT,
    apiKey,
    resourceAttrs,
  );

  const provider = new LoggerProvider({
    resource,
    processors: [new SimpleLogRecordProcessor(exporter)],
  });

  globalThis.__otelLogger = provider.getLogger(SERVICE_NAME);

  console.log(
    `[instrumentation] OTLP-Logs initialized: env=${environment}, sha=${commitSha ? commitSha.slice(0, 7) : "unknown"}`,
  );

  process.on("beforeExit", () => {
    void provider.shutdown().catch((err) => {
      console.error("[instrumentation] OTel shutdown failed:", err);
    });
  });
}
