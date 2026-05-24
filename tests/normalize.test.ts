import { describe, expect, it } from 'vitest';
import { normalizeWebhookRawEvent } from '../src/index.js';

const CASE_ID = '11111111-1111-4111-8111-111111111111';

describe('normalizeWebhookRawEvent', () => {
  it('maps configured JSON paths into normalized events', () => {
    const normalized = normalizeWebhookRawEvent({
      organizationId: 'org-1',
      rawEventId: 'raw-1',
      idempotencyKey: 'webhook:approval:1',
      sourceEventType: 'approval',
      receivedAt: new Date('2026-04-25T10:00:00.000Z'),
      payload: {
        case_id: CASE_ID,
        object_id: 'approval-1',
        title: 'Manager approval',
        approved: true,
        occurred_at: '2026-04-25T09:55:00.000Z',
      },
      metadata: {
        webhookMapping: {
          defaultEventType: 'approval.recorded',
          defaultEvidenceType: 'approval',
          fields: {
            caseId: 'case_id',
            sourceObjectId: 'object_id',
            title: 'title',
            approved: 'approved',
            occurredAt: 'occurred_at',
          },
        },
      },
    });

    expect(normalized.eventType).toBe('approval.recorded');
    expect(normalized.caseId).toBe(CASE_ID);
    expect(normalized.attributes.approved).toBe(true);
    expect(normalized.evidence[0]?.evidenceType).toBe('approval');
  });
});
