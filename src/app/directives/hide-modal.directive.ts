import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * Auto closes modals whenever the user navigates to previous page (clicking back button or by keyboard) WITHOUT navigating backwards
 * @requires id on HTML element that has 'uk-modal' attribute
 */
@Directive({
  selector: '[appHideModal]'
})
export class HideModalDirective {
  UIkit = window['UIkit'];
  modal = this.UIkit?.modal(`#${this.element.nativeElement.id}`);

  constructor(private element: ElementRef) {

    document.addEventListener('shown', () => {
      const cancelBtn = document.querySelector(`#${this.element.nativeElement.id} .uk-modal-close`);

      if (this.modal?.isToggled()) {
        // create a fake state when showing a modal, so that navigating backwards only closes the modal without changing history
        history.pushState(null, null);
        // removes fake state when canceling the modal
        cancelBtn?.addEventListener('click', this.goBack);
      }
    });
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event) {
    if (this.modal?.isToggled() && typeof this.modal?.hide === 'function') {
      this.modal.hide();
    }
  }

  private goBack(event) {
    history.back();
  }
}
