import { Component, OnInit } from '@angular/core';
import {NotificationService} from "../../services/notification.service";

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {

  notificationLength = 5000;

  notifications: any[] = [];
  constructor(private notificationService: NotificationService) { }

  ngOnInit() {
    this.notificationService.notifications$.subscribe(notification => {
      if (!notification) return; // Default value

      const newNotification = {
        type: notification.type,
        message: notification.message,
        cssClass: this.getCssClass(notification.type),
      };

      this.notifications.push(newNotification);
      setTimeout(() => this.removeNotification(newNotification), this.notificationLength);
    });
  }

  private removeNotification(notification) {
    const existingNotification = this.notifications.findIndex(n => n === notification);
    if (existingNotification !== -1) {
      this.notifications.splice(existingNotification, 1);
    }
  }

  private getCssClass(type) {
    switch (type) {
      default:
      case 'info': return 'uk-alert-primary';
      case 'success': return 'uk-alert-success';
      case 'warning': return 'uk-alert-warning';
      case 'error': return 'uk-alert-danger';
    }
  }

}
