import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  // Default route redirects to dashboard
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Auth routes
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./core/auth/components/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./core/auth/components/register/register.component').then(m => m.RegisterComponent) },
      { path: 'profile', loadComponent: () => import('./core/auth/components/profile/profile.component').then(m => m.ProfileComponent), canActivate: [AuthGuard] }
    ]
  },
  // OAuth2 redirect handler
  {
    path: 'oauth2/redirect',
    loadComponent: () => import('./core/auth/components/login/login.component').then(m => m.LoginComponent)
  },

  // dashboard routes
  {
    path: 'dashboard',
    loadComponent: () => import('./shared/components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '/dashboard' }
];
