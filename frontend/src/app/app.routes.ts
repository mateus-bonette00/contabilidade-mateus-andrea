import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EntradasComponent } from './features/entradas/entradas.component';
import { LoginComponent } from './features/login/login.component';
import { PerfilComponent } from './features/perfil/perfil.component';
import { SaidasComponent } from './features/saidas/saidas.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
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
  {
    path: 'perfil',
    component: PerfilComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' },
];
