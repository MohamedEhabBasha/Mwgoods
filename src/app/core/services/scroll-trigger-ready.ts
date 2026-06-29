import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollTriggerReadyService {
  private ready$ = new Subject<void>();

  signal(): void {
    this.ready$.next();
  }

  onReady$() {
    return this.ready$.asObservable();
  }
}
