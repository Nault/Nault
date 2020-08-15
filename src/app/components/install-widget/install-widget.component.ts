import { Component, OnInit } from '@angular/core';

interface InstallEvent extends Event {
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
  prompt(): void;
}

@Component({
  selector: 'app-install-widget',
  templateUrl: './install-widget.component.html',
  styleUrls: ['./install-widget.component.less'],
})
export class InstallWidgetComponent implements OnInit {

  installEvent: InstallEvent;
  showInstallPromotion = false;
  hideOnDesktop = false;

  constructor() { }

  ngOnInit(): void {
    if (!this.isPromotable()) {
      return;
    }

    window.addEventListener('beforeinstallprompt', (e: InstallEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Keep event for later
      this.installEvent = e;

      // Show promotion
      this.showInstallPromotion = true;
    });
  }

  install() {
    if (!this.installEvent) {
      return;
    }

    this.installEvent.prompt();
    this.installEvent.userChoice.then((result) => {
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt', result);
      } else {
        console.log('User dismissed the install prompt', result);
      }
    });
  }

  dismiss() {
    this.showInstallPromotion = false;
  }

  getPlatform() {
    const platform = window.navigator.platform;
    if (platform.includes('Win')) {
      return 'Windows';
    } else if (platform.includes('Mac')) {
      return 'Mac';
    } else if (window.navigator.userAgent.includes('Android')) {
      return 'Android';
    } else if (platform.includes('Linux')) {
      return 'Linux';
    } else if (platform.includes('iPhone') || platform.includes('iPad')) {
      return 'iOS';
    }
    return undefined;
  }

  isPromotable() {
    const platform = this.getPlatform();
    return !this.isInstalled() || !this.hideOnDesktop || !(platform === 'Windows' || platform === 'Mac' || platform === 'Linux');
  }

  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches;
  }
}
