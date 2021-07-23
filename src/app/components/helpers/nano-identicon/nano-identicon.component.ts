import { AfterViewInit, Component, ElementRef, Input, OnChanges, HostBinding, ViewChild } from '@angular/core';
import { createIcon } from '../../../../assets/lib/nanoidenticons.min.js';

@Component({
  selector: 'app-nano-identicon',
  templateUrl: './nano-identicon.component.html',
  styleUrls: ['./nano-identicon.component.css'],
})
export class NanoIdenticonComponent implements OnChanges, AfterViewInit {

  @Input() accountID: string;
  @Input() scale: number;
  @Input() settingIdenticonsStyle: string;

  renderedIdenticon = '';
  imageLoadErrorOccurred = false;

  constructor() { }

  @ViewChild('canvasContainer') canvasContainer: ElementRef;

  ngOnChanges() {
    this.renderNanoidenticon();
  }

  ngAfterViewInit() {
    this.renderNanoidenticon();
  }

  renderNanoidenticon() {
    if (
          (this.canvasContainer == null)
        || (this.settingIdenticonsStyle !== 'nanoidenticons')
        || (this.renderedIdenticon === this.accountID)
      ) {
        return;
    }

    this.renderedIdenticon = this.accountID;

    const scale =
      Math.max(
        Math.ceil(this.scale * window.devicePixelRatio),
        this.scale
      );

    const canvas = createIcon({
      seed: this.accountID,
      scale,
    });

    const canvasContainerNative = this.canvasContainer.nativeElement;

    while (canvasContainerNative.firstChild) {
      canvasContainerNative.removeChild(canvasContainerNative.lastChild);
    }

    canvasContainerNative.appendChild(canvas);
  }

}
