import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { i18nKeys } from '../../../core/i18n/keys';

export interface DownloadCompanionsChoice {
  raw: boolean;
  xmp: boolean;
}

export interface DownloadCompanionsDialogData {
  count: number;
  rawCount: number;
  xmpCount: number;
  initial: DownloadCompanionsChoice;
  warning?: string;
}

/** Asks whether a download of originals also fetches each photo's RAW and XMP files. */
@Component({
  selector: 'app-download-companions-dialog',
  standalone: true,
  imports: [MatButtonModule, MatCheckboxModule, MatDialogModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ I18N.download.companions_title | translate:{ count: data.count } }}</h2>
    <mat-dialog-content>
      <p>{{ I18N.download.companions_message | translate }}</p>
      <div class="flex flex-col">
        <mat-checkbox data-include-raw [disabled]="!data.rawCount" [checked]="raw()" (change)="raw.set($event.checked)">
          {{ I18N.download.include_raw | translate:{ count: data.rawCount } }}
        </mat-checkbox>
        <mat-checkbox data-include-xmp [disabled]="!data.xmpCount" [checked]="xmp()" (change)="xmp.set($event.checked)">
          {{ I18N.download.include_xmp | translate:{ count: data.xmpCount } }}
        </mat-checkbox>
      </div>
      @if (data.warning) { <p class="mt-3 text-sm opacity-80">{{ data.warning }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">{{ I18N.dialog.cancel | translate }}</button>
      <button mat-flat-button data-download (click)="confirm()">{{ I18N.download.companions_confirm | translate }}</button>
    </mat-dialog-actions>
  `,
})
export class DownloadCompanionsDialogComponent {
  protected readonly I18N = i18nKeys();
  protected readonly data: DownloadCompanionsDialogData = inject(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<DownloadCompanionsDialogComponent, DownloadCompanionsChoice | null>);
  protected readonly raw = signal(this.data.initial.raw && this.data.rawCount > 0);
  protected readonly xmp = signal(this.data.initial.xmp && this.data.xmpCount > 0);

  protected confirm(): void {
    this.dialogRef.close({ raw: this.raw(), xmp: this.xmp() });
  }
}
