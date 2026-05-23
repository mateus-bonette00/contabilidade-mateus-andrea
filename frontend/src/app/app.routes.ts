import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EntradasComponent } from './features/entradas/entradas.component';
import { LoginComponent } from './features/login/login.component';
import { SaidasComponent } from './features/saidas/saidas.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'entradas',
    component: EntradasComponent,
    canActivate: [authGuard],
  },
  {
    path: 'saidas',
    component: SaidasComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' },
];
