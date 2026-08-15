import { describe, it, expect } from 'vitest';
import { IngestService } from './ingest-service.js';

describe('IngestService.isPullRequestClosed', () => {
  it('detects a closed PR from its state', () => {
    expect(IngestService.isPullRequestClosed({
      action: 'synchronize',
      pull_request: { state: 'closed' },
    })).toBe(true);
  });

  it('detects the closed action', () => {
    expect(IngestService.isPullRequestClosed({
      action: 'closed',
      pull_request: { number: 7 },
    })).toBe(true);
  });

  it('detects a merged PR even without state', () => {
    expect(IngestService.isPullRequestClosed({ pull_request: { merged: true } })).toBe(true);
  });

  it('treats an open PR as reviewable', () => {
    expect(IngestService.isPullRequestClosed({
      action: 'opened',
      pull_request: { state: 'open', merged: false },
    })).toBe(false);
  });

  it('treats an unknown state as open, so relayed payloads keep working', () => {
    expect(IngestService.isPullRequestClosed({ pull_request: { number: 7 } })).toBe(false);
    expect(IngestService.isPullRequestClosed({})).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(IngestService.isPullRequestClosed({ pull_request: { state: 'CLOSED' } })).toBe(true);
    expect(IngestService.isPullRequestClosed({ action: 'Closed', pull_request: {} })).toBe(true);
  });
});
