export {
  normalizeWebhookRawEvent,
  parseWebhookMappingConfig,
  resolveMappedPath,
  WebhookFieldMappingSchema,
  WebhookMappingConfigSchema,
} from './normalize.js';
export type {
  NormalizedOperationalEventOutput,
  WebhookFieldMapping,
  WebhookMappingConfig,
  WebhookRawEventContext,
} from './normalize.js';
export { WEBHOOK_ADAPTER_EVIDENCE_TYPES, WEBHOOK_ADAPTER_SOURCE_EVENT_TYPES } from './constants.js';
