import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  route: string;
  method: string;
  userId?: string;
  startedAt: number;
}

declare global {
  var __requestContextALS: AsyncLocalStorage<RequestContext> | undefined;
}

function getStorage(): AsyncLocalStorage<RequestContext> {
  if (!globalThis.__requestContextALS) {
    globalThis.__requestContextALS = new AsyncLocalStorage<RequestContext>();
  }
  return globalThis.__requestContextALS;
}

export function getRequestContext(): RequestContext | undefined {
  return getStorage().getStore();
}

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return getStorage().run(context, fn);
}

export function setUserId(userId: string): void {
  const ctx = getRequestContext();
  if (ctx) ctx.userId = userId;
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}
