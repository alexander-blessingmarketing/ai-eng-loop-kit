import {
  SeverityNumber,
  type LogRecord,
  type Logger as OtelLogger,
} from "@opentelemetry/api-logs";

declare global {
  var __otelLogger: OtelLogger | undefined;
}

const PINO_LEVEL_TO_SEVERITY: Record<number, SeverityNumber> = {
  10: SeverityNumber.TRACE,
  20: SeverityNumber.DEBUG,
  30: SeverityNumber.INFO,
  40: SeverityNumber.WARN,
  50: SeverityNumber.ERROR,
  60: SeverityNumber.FATAL,
};

const PINO_LEVEL_TO_TEXT: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

/**
 * Bridge von Pino-JSON-Output zu OpenTelemetry-Log-Records. Wird vom
 * Pino-Stream in `src/lib/logger.ts` aufgerufen — emittiert pro Pino-Zeile
 * einen OTel-Log, der vom Provider in `src/instrumentation-node.ts` an
 * PostHog (oder einen anderen OTLP-Empfänger) weitergeleitet wird.
 */
export function emitPinoEntry(line: string): void {
  const logger = globalThis.__otelLogger;
  if (!logger) return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }

  const {
    level,
    time,
    msg,
    pid: _pid,
    hostname: _hostname,
    service: _service,
    environment: _environment,
    ...attributes
  } = parsed as {
    level?: number;
    time?: number;
    msg?: string;
    pid?: number;
    hostname?: string;
    service?: string;
    environment?: string;
    [key: string]: unknown;
  };

  const numericLevel = typeof level === "number" ? level : 30;
  const severityNumber = PINO_LEVEL_TO_SEVERITY[numericLevel] ?? SeverityNumber.INFO;
  const severityText = PINO_LEVEL_TO_TEXT[numericLevel] ?? "INFO";

  const record: LogRecord = {
    timestamp: typeof time === "number" ? time : Date.now(),
    severityNumber,
    severityText,
    body: typeof msg === "string" ? msg : "",
    attributes: attributes as LogRecord["attributes"],
  };

  try {
    logger.emit(record);
  } catch (err) {
    console.error("[otel-logs] emit failed:", err);
  }
}
