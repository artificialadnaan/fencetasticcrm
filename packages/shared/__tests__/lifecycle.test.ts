import { describe, expect, it } from 'vitest';
import { PROJECT_STATUS_META, PROJECT_STATUS_ORDER, ProjectStatus } from '../src';

describe('project lifecycle metadata', () => {
  it('covers every project status in order', () => {
    expect(PROJECT_STATUS_ORDER).toEqual([
      ProjectStatus.ESTIMATE,
      ProjectStatus.OPEN,
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.COMPLETED,
      ProjectStatus.CLOSED,
      ProjectStatus.WARRANTY,
    ]);

    for (const status of PROJECT_STATUS_ORDER) {
      expect(PROJECT_STATUS_META[status]).toBeDefined();
      expect(PROJECT_STATUS_META[status].label.length).toBeGreaterThan(0);
      expect(PROJECT_STATUS_META[status].description.length).toBeGreaterThan(0);
    }
  });
});
