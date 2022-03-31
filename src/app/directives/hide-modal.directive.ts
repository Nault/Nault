import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * auto hides modals whenever the user navigates to previous page (clicking back button, or by keyboard..)
 * @requires id on HTML element
 */
@Directive({
  selector: '[appHideModal]'
})
export class HideModalDirective {

    constructor(private element: ElementRef) { }

    @HostListener('window:popstate', ['$event'])
    onPopState(event) {
      const UIkit = window['UIkit'];

      if (UIkit && this.element.nativeElement.id) {
        const modal = UIkit.modal(`#${this.element.nativeElement.id}`);
        if (typeof modal?.hide === 'function')
          modal.hide();
      }
    }
}
