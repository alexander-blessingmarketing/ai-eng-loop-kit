import { NextResponse } from "next/server";
import { getServerPostHog, SERVER_POSTHOG_ENVIRONMENT } from "@/lib/posthog-server";
import {
  generateRequestId,
  runWithRequestContext,
  type RequestContext,
} from "@/lib/request-context";
import { getLogger } from "@/lib/logger";
import type { TrackSource } from "@/lib/tracked-mutations";

type RouteHandler<TParams = Record<string, string>> = (
  request: Request,
  context: { params: Promise<TParams> },
) => Promise<Response> | Response;

interface ObservabilityOptions {
  source?: TrackSource;
}

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Wrapper für Route Handlers + Server Actions, der pro Request:
 * - eine `request_id` setzt (UUID v4 oder durchgereicht aus `x-request-id`-Header),
 * - einen `AsyncLocalStorage`-Scope öffnet, sodass `getLogger()` automatisch
 *   `request_id`/`user_id`/`route`/`method` mit-loggt,
 * - eine Canonical-Log-Line am Request-Ende schreibt (`status`, `duration_ms`),
 * - bei Throws Exceptions zu PostHog capturet + Error-Log + 500-Response.
 *
 * Hintergrund: docs/architektur/observability.md (Abschnitt 4).
 */
export function withObservability<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>,
  options: ObservabilityOptions = {},
): RouteHandler<TParams> {
  const source = options.source ?? "web";

  return async (request, ctx) => {
    const url = new URL(request.url);
    const incomingRequestId = request.headers.get(REQUEST_ID_HEADER);
    const context: RequestContext = {
      requestId: incomingRequestId || generateRequestId(),
      route: url.pathname,
      method: request.method,
      startedAt: Date.now(),
    };

    return runWithRequestContext(context, async () => {
      const log = getLogger();
      let response: Response;
      try {
        response = await handler(request, ctx);
      } catch (error) {
        const client = getServerPostHog();
        if (client) {
          client.captureException(
            error instanceof Error ? error : new Error(String(error)),
            context.userId ?? "anonymous",
            {
              environment: SERVER_POSTHOG_ENVIRONMENT,
              source,
              route: context.route,
              method: context.method,
              request_id: context.requestId,
            },
          );
        }
        log.error(
          {
            err: error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { message: String(error) },
            duration_ms: Date.now() - context.startedAt,
            status: 500,
          },
          "request failed",
        );
        const errorResponse = NextResponse.json(
          { error: "Internal error" },
          { status: 500 },
        );
        errorResponse.headers.set(REQUEST_ID_HEADER, context.requestId);
        return errorResponse;
      }

      log.info(
        {
          status: response.status,
          duration_ms: Date.now() - context.startedAt,
        },
        "request completed",
      );
      try {
        response.headers.set(REQUEST_ID_HEADER, context.requestId);
      } catch {
        // Manche Response-Varianten haben immutable Headers; non-fatal.
      }
      return response;
    });
  };
}
