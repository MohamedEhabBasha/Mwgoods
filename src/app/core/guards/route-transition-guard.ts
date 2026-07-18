// route-transition.guard.ts
import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { RouteTransitionService } from '../services/route-transition';


export const routeTransitionGuard: CanDeactivateFn<unknown> = () =>
  inject(RouteTransitionService).cover().then(() => true);