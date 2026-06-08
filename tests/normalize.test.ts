import { describe, expect, it } from 'vitest';
import { normalizeWebhookRawEvent } from '../src/normalize.js';

const CASE_ID = '11111111-1111-4111-8111-111111111111';
const receivedAt = new Date('2026-05-22T10:00:01.000Z');

function baseContext(overrides: Partial<Parameters<typeof normalizeWebhookRawEvent>[0]> = {}) {
  return {
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    processId: 'proc-1',
    rawEventId: 'raw-1',
    idempotencyKey: 'idem-1',
    sourceEventType: 'privacy.intake',
    receivedAt,
    payload: {},
    metadata: {
      webhookMapping: {
        fields: {
          caseId: 'caseId',
          title: 'title',
          sourceObjectId: 'requestId',
        },
      },
    },
    ...overrides,
  };
}

describe('normalizeWebhookRawEvent', () => {
  it('maps configured fields into normalized operational events', () => {
    const normalized = normalizeWebhookRawEvent(
      baseContext({
        payload: {
          caseId: CASE_ID,
          title: 'DSAR request',
          requestId: 'req-100',
          occurredAt: '2026-05-22T11:00:00.000Z',
        },
      }),
    );

    expect(normalized.caseId).toBe(CASE_ID);
    expect(normalized.eventType).toBe('evidence.observed');
    expect(normalized.sourceObjectId).toBe('req-100');
    expect(normalized.evidence[0]?.title).toBe('DSAR request');
  });

  it('uses default evidence type when mapping is sparse', () => {
    const normalized = normalizeWebhookRawEvent(
      baseContext({
        metadata: {
          webhookMapping: {
            fields: { caseId: 'caseId' },
          },
        },
        payload: { caseId: CASE_ID },
      }),
    );

    expect(normalized.caseId).toBe(CASE_ID);
    expect(normalized.evidence[0]?.evidenceType).toBe('webhook');
  });
});
