import { AsyncLocalStorage } from 'async_hooks';

interface RequestStore {
  requestId: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestId(): string {
  return requestContext.getStore()?.requestId ?? 'no-context';
}

export function setContextUserId(userId: string) {
  const store = requestContext.getStore();
  if (store) store.userId = userId;
}

export function getContextUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}
