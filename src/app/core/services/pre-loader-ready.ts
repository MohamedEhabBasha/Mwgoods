import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PreLoaderReady {
  private readonly ready$ = new ReplaySubject<void>(1);

  signal(): void {
    this.ready$.next();
  }

  onReady$() {
    return this.ready$.asObservable();
  }
}
