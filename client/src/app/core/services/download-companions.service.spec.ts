import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { DownloadCompanionsService } from './download-companions.service';

describe('DownloadCompanionsService', () => {
  let post: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;
  let service: DownloadCompanionsService;

  beforeEach(() => {
    localStorage.clear();
    post = vi.fn();
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { post, downloadUrl: (path: string, type = 'original') => `${type}:${path}` } },
        { provide: MatDialog, useValue: { open } },
      ],
    });
    service = TestBed.inject(DownloadCompanionsService);
  });

  it('leaves the download to the caller when no photo has a RAW or XMP file', async () => {
    post.mockReturnValue(of({ companions: [] }));
    expect(await service.plan(['/a.jpg'])).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to a plain download when the lookup fails', async () => {
    post.mockReturnValue(throwError(() => new Error('offline')));
    expect(await service.plan(['/a.jpg'])).toBeUndefined();
  });

  it('adds the chosen companions after each original and remembers the choice', async () => {
    post.mockReturnValue(of({ companions: [{ path: '/a.jpg', raw: 'a.CR3', xmp: 'a.xmp' }, { path: '/b.jpg', raw: null, xmp: 'b.jpg.xmp' }] }));
    open.mockReturnValue({ afterClosed: () => of({ raw: true, xmp: false }) });
    const items = await service.plan(['/a.jpg', '/b.jpg', '/c.jpg']);
    expect(open.mock.calls[0][1].data).toMatchObject({ count: 3, rawCount: 1, xmpCount: 2, initial: { raw: true, xmp: true } });
    expect(items).toEqual([
      { url: 'original:/a.jpg', filename: 'a.jpg' },
      { url: 'raw:/a.jpg', filename: 'a.CR3' },
      { url: 'original:/b.jpg', filename: 'b.jpg' },
      { url: 'original:/c.jpg', filename: 'c.jpg' },
    ]);
    open.mockReturnValue({ afterClosed: () => of(null) });
    expect(await service.plan(['/a.jpg'])).toBeNull();
    expect(open.mock.calls[1][1].data.initial).toEqual({ raw: true, xmp: false });
  });
});
