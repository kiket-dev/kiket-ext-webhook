import { describe, expect, it } from 'vitest';
import { normalizeWebhookRawEvent, WEBHOOK_ADAPTER_SOURCE_EVENT_TYPES } from '../src/index.js';

describe('webhook extension entry', () => {
  it('re-exports webhook-adapter normalizers', () => {
    expect(WEBHOOK_ADAPTER_SOURCE_EVENT_TYPES).toContain('inbound');
    expect(typeof normalizeWebhookRawEvent).toBe('function');
  });
});
