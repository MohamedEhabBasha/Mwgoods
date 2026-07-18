// route-transition.service.ts
import { Injectable } from '@angular/core';

export interface RouteTransitionDriver {
  cover(): Promise<void>;
  reveal(): void;
}

@Injectable({ providedIn: 'root' })
export class RouteTransitionService {
  private driver?: RouteTransitionDriver;

  register(driver: RouteTransitionDriver): void {
    this.driver = driver;
  }

  unregister(driver: RouteTransitionDriver): void {
    if (this.driver === driver) this.driver = undefined;
  }

  cover(): Promise<void> {
    return this.driver?.cover() ?? Promise.resolve();
  }

  reveal(): void {
    this.driver?.reveal();
  }
}