import {
  Directive, ElementRef, Input, OnInit, OnChanges, SimpleChanges, effect
} from '@angular/core';
import { I18nService } from 'src/app/services/i18n.service';

@Directive({
  selector: '[appTranslate]',
  standalone: true
})
export class AppTranslateDirective implements OnInit, OnChanges {
  @Input('appTranslate') key = '';
  @Input() translateParams?: Record<string, any>;
  @Input() translateAttr?: string; // e.g., 'placeholder', 'title', 'aria-label'

  constructor(
    private el: ElementRef<HTMLElement>,
    private i18n: I18nService
  ) {
    // Re-apply translation automatically when active dictionary changes
    effect(() => {
      // Access dictionary signal to subscribe
      this.i18n.dictionary();
      this.updateText();
    });
  }

  ngOnInit(): void {
    this.updateText();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['key'] || changes['translateParams'] || changes['translateAttr']) {
      this.updateText();
    }
  }

  private updateText(): void {
    if (!this.key) return;
    const translated = this.i18n.translate(this.key, this.translateParams);
    if (this.translateAttr) {
      this.el.nativeElement.setAttribute(this.translateAttr, translated);
    } else {
      this.el.nativeElement.textContent = translated;
    }
  }
}
