import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { DownloadItem } from './download-progress.service';
import type { DownloadCompanion } from '../api/types';
import { basename } from '../../shared/utils/clipboard';
import type { DownloadCompanionsChoice } from '../../shared/components/download-companions-dialog/download-companions-dialog.component';

const CHOICE_KEY = 'facet.download.companions';

/** Offers each photo's RAW and XMP files alongside a download of originals. */
@Injectable({ providedIn: 'root' })
export class DownloadCompanionsService {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);

  /**
   * The originals plus the companions the user opts into, photo by photo.
   * `null` when the dialog is dismissed; `undefined` when no photo has a RAW
   * or XMP file, so the caller downloads the originals its usual way.
   */
  async plan(paths: string[], warning?: string): Promise<DownloadItem[] | null | undefined> {
    const companions = await this.find(paths);
    if (!companions.length) return undefined;
    const { DownloadCompanionsDialogComponent } = await import('../../shared/components/download-companions-dialog/download-companions-dialog.component');
    const ref = this.dialog.open(DownloadCompanionsDialogComponent, {
      width: '28rem',
      data: {
        count: paths.length,
        rawCount: companions.filter(companion => companion.raw).length,
        xmpCount: companions.filter(companion => companion.xmp).length,
        initial: this.lastChoice(),
        warning,
      },
    });
    const choice = await firstValueFrom(ref.afterClosed(), { defaultValue: null });
    if (!choice) return null;
    this.saveChoice(choice);
    const byPath = new Map(companions.map(companion => [companion.path, companion]));
    return paths.flatMap(path => {
      const items: DownloadItem[] = [{ url: this.api.downloadUrl(path), filename: basename(path) }];
      const companion = byPath.get(path);
      if (choice.raw && companion?.raw) items.push({ url: this.api.downloadUrl(path, 'raw'), filename: companion.raw });
      if (choice.xmp && companion?.xmp) items.push({ url: this.api.downloadUrl(path, 'xmp'), filename: companion.xmp });
      return items;
    });
  }

  private async find(paths: string[]): Promise<DownloadCompanion[]> {
    try {
      const response = await firstValueFrom(this.api.post<{ companions: DownloadCompanion[] }>('/download/companions', { paths }));
      return response?.companions ?? [];
    } catch {
      return [];
    }
  }

  private lastChoice(): DownloadCompanionsChoice {
    try {
      const stored = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? 'null') as Partial<DownloadCompanionsChoice> | null;
      return { raw: stored?.raw ?? true, xmp: stored?.xmp ?? true };
    } catch {
      return { raw: true, xmp: true };
    }
  }

  private saveChoice(choice: DownloadCompanionsChoice): void {
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
    } catch {
      // Private browsing can refuse storage; the choice then lasts one download.
    }
  }
}
