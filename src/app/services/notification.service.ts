import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonService } from '../Securities/Services/common.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private commonService: CommonService) {}

  getNotifications(): Observable<any> {
    return this.commonService.getApi('notifications');
  }

  markAsRead(id: number): Observable<any> {
    return this.commonService.putApi(`notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.commonService.putApi('notifications/read-all', {});
  }
}
