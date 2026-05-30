import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'entradas',
        loadComponent: () => import('./features/entradas/entradas.component').then(m => m.EntradasComponent),
      },
      {
        path: 'saidas',
        loadComponent: () => import('./features/saidas/saidas.component').then(m => m.SaidasComponent),
      },
      {
        path: 'bancos',
        loadComponent: () => import('./features/bancos/bancos.component').then(m => m.BancosComponent),
      },
      {
        path: 'lancamento/:tipo',
        loadComponent: () => import('./features/lancamento/lancamento.component').then(m => m.LancamentoComponent),
      },
      {
        path: 'configuracoes',
        loadComponent: () => import('./features/configuracoes/configuracoes.component').then(m => m.ConfiguracoesComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
