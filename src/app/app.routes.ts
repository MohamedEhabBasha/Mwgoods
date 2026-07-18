import { Routes } from '@angular/router';
import { Home } from './layout/home/home';
import { Community } from './layout/community/community';
import { Sell } from './layout/sell/sell';
import { About } from './layout/about/about';
import { routeTransitionGuard } from './core/guards/route-transition-guard';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    pathMatch: 'full',
    canDeactivate: [routeTransitionGuard],
  },
  { path: 'community', component: Community, canDeactivate: [routeTransitionGuard] },
  { path: 'sell', component: Sell, canDeactivate: [routeTransitionGuard] },
  { path: 'about', component: About, canDeactivate: [routeTransitionGuard] },
];
