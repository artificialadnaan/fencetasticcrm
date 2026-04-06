import { describe, expect, it, vi } from 'vitest';
import { FenceType, ProjectStatus } from '@fencetastic/shared';
import { buildProjectsExportParams, exportProjects } from './projects-export';

describe('projects export helper', () => {
  it('builds the existing export route query from the visible filters', () => {
    const params = buildProjectsExportParams({
      search: 'oak',
      status: ProjectStatus.OPEN,
      fenceType: FenceType.WOOD,
      sortBy: 'installDate',
      sortDir: 'desc',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    });

    expect(params.toString()).toContain('search=oak');
    expect(params.toString()).toContain('status=OPEN');
    expect(params.toString()).toContain('fenceType=WOOD');
    expect(params.toString()).toContain('sortBy=installDate');
    expect(params.toString()).not.toContain('page=');
    expect(params.toString()).not.toContain('limit=');
  });

  it('calls the backend export route with a blob response', async () => {
    const get = vi.fn().mockResolvedValue({ data: new Blob(['xlsx']) });

    const blob = await exportProjects(
      { search: 'oak', status: ProjectStatus.OPEN },
      { get } as never
    );

    expect(get).toHaveBeenCalledWith(
      expect.stringContaining('/projects/export?'),
      { responseType: 'blob' }
    );
    expect(get).toHaveBeenCalledWith(expect.stringContaining('search=oak'), { responseType: 'blob' });
    expect(get).toHaveBeenCalledWith(expect.stringContaining('status=OPEN'), { responseType: 'blob' });
    expect(blob).toBeInstanceOf(Blob);
  });
});
