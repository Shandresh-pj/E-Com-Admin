import { Pipe, PipeTransform } from '@angular/core';
import { I18nService } from 'src/app/services/i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Impure to trigger view update instantly on signal change
})
export class AppTranslatePipe implements PipeTransform {
  constructor(private i18n: I18nService) {}

  transform(key: string, params?: Record<string, any>): string {
    return this.i18n.translate(key, params);
  }
}
