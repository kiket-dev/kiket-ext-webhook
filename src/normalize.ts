import { z } from 'zod';

export { WEBHOOK_ADAPTER_EVIDENCE_TYPES, WEBHOOK_ADAPTER_SOURCE_EVENT_TYPES } from './constants.js';

export const WebhookFieldMappingSchema = z.object({
  caseId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  sourceObjectId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  evidenceType: z.string().min(1).optional(),
  occurredAt: z.string().min(1).optional(),
  approved: z.string().min(1).optional(),
});

export const WebhookMappingConfigSchema = z.object({
  defaultEventType: z.string().min(1).default('evidence.observed'),
  defaultEvidenceType: z.string().min(1).default('webhook'),
  fields: WebhookFieldMappingSchema.default({}),
});

export type WebhookFieldMapping = z.infer<typeof WebhookFieldMappingSchema>;
export type WebhookMappingConfig = z.infer<typeof WebhookMappingConfigSchema>;

export interface WebhookRawEventContext {
  organizationId: string;
  workspaceId?: string | null;
  processId?: string | null;
  rawEventId: string;
  idempotencyKey: string;
  sourceEventType: string;
  receivedAt: Date;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface NormalizedOperationalEventOutput {
  organizationId: string;
  workspaceId?: string;
  processId?: string;
  caseId?: string;
  eventType: string;
  sourceSystem: 'webhook';
  sourceObjectId?: string;
  actor: Record<string, unknown>;
  subject: Record<string, unknown>;
  occurredAt: Date;
  correlationIds: string[];
  attributes: Record<string, unknown>;
  dedupeKey: string;
  evidence: Array<{
    evidenceType: string;
    title: string;
    sourceObjectId?: string;
    capturedAt: Date;
    payload: Record<string, unknown>;
    dedupeKey: string;
  }>;
  intents: Array<{
    type: string;
    targetType?: string;
    targetId?: string;
    reason: string;
    attributes: Record<string, unknown>;
    idempotencyKey: string;
  }>;
}

export function resolveMappedPath(payload: Record<string, unknown>, path: string | undefined): unknown {
  if (!path) return undefined;
  const normalized = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path;
  const segments = normalized.split('.').filter(Boolean);
  let current: unknown = payload;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function mappedString(payload: Record<string, unknown>, path: string | undefined): string | undefined {
  const value = resolveMappedPath(payload, path);
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function mappedBoolean(payload: Record<string, unknown>, path: string | undefined): boolean | undefined {
  const value = resolveMappedPath(payload, path);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function normalizeSourceTime(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string') return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function parseWebhookMappingConfig(value: unknown): WebhookMappingConfig {
  return WebhookMappingConfigSchema.parse(value);
}

export function normalizeWebhookRawEvent(ctx: WebhookRawEventContext): NormalizedOperationalEventOutput {
  const metadata = ctx.metadata && typeof ctx.metadata === 'object' ? ctx.metadata : {};
  const mapping = parseWebhookMappingConfig(
    (metadata as Record<string, unknown>).webhookMapping ?? (metadata as Record<string, unknown>).mapping ?? {},
  );
  const payload = ctx.payload;
  const caseId = mappedString(payload, mapping.fields.caseId);
  if (!caseId) throw new Error('Missing required field: caseId');

  const eventType = mappedString(payload, mapping.fields.eventType) ?? mapping.defaultEventType;
  const sourceObjectId = mappedString(payload, mapping.fields.sourceObjectId) ?? ctx.idempotencyKey.slice(0, 255);
  const evidenceType = mappedString(payload, mapping.fields.evidenceType) ?? mapping.defaultEvidenceType;
  const title = mappedString(payload, mapping.fields.title) ?? `${evidenceType} evidence`;
  const occurredAt = normalizeSourceTime(resolveMappedPath(payload, mapping.fields.occurredAt), ctx.receivedAt);
  const approved = mappedBoolean(payload, mapping.fields.approved);

  return {
    organizationId: ctx.organizationId,
    workspaceId: ctx.workspaceId ?? undefined,
    processId: ctx.processId ?? undefined,
    caseId,
    eventType,
    sourceSystem: 'webhook',
    sourceObjectId,
    actor: {},
    subject: { type: 'webhook', id: sourceObjectId, caseId },
    occurredAt,
    correlationIds: [ctx.rawEventId, ctx.idempotencyKey],
    attributes: {
      sourceEventType: ctx.sourceEventType,
      approved,
    },
    dedupeKey: `webhook:${ctx.sourceEventType}:${sourceObjectId}`,
    evidence: [
      {
        evidenceType,
        title,
        sourceObjectId,
        capturedAt: occurredAt,
        payload: {
          sourceEventType: ctx.sourceEventType,
          approved,
          mapped: mapping.fields,
        },
        dedupeKey: `webhook:evidence:${sourceObjectId}:${evidenceType}`,
      },
    ],
    intents: [
      {
        type: 'case.link_external_evidence',
        targetType: 'case',
        targetId: caseId,
        reason: 'Generic webhook mapping produced evidence for a linked operational case.',
        attributes: { evidenceType, sourceObjectId },
        idempotencyKey: `webhook:intent:link:${sourceObjectId}:${caseId}`,
      },
    ],
  };
}
