import { type ExtensionRawEventInput, toAdapterContext } from './adapter-context.js';
import { normalizeWebhookRawEvent } from './normalize.js';

export type { ExtensionRawEventInput } from './adapter-context.js';

export function normalizeExtensionRawEvent(raw: ExtensionRawEventInput) {
  return normalizeWebhookRawEvent(toAdapterContext(raw));
}
