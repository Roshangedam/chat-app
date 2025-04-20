import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  // Default route redirects to chat
  { path: '', redirectTo: '/chat', pathMatch: 'full' },

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

  // Chat routes
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/components/conversation-list/conversation-list.component').then(m => m.ConversationListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'chat/:id',
    loadComponent: () => import('./features/chat/components/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [AuthGuard]
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '/chat' }
];
