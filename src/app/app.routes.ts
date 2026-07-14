import { Routes } from '@angular/router';
import { Home } from './layout/home/home';
import { Community } from './layout/community/community';
import { Sell } from './layout/sell/sell';
import { About } from './layout/about/about';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    pathMatch: 'full'
  },
  {path: 'community', component: Community},
  {path: 'sell', component: Sell},
  {path: 'about', component: About},
];
