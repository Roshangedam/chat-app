import { Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  // Default route redirects to chat
  { path: '', redirectTo: '/chat', pathMatch: 'full' },

  // Auth routes
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./auth/components/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./auth/components/register/register.component').then(m => m.RegisterComponent) },
      { path: 'profile', loadComponent: () => import('./auth/components/profile/profile.component').then(m => m.ProfileComponent), canActivate: [AuthGuard] }
    ]
  },
  // OAuth2 redirect handler
  {
    path: 'oauth2/redirect',
    loadComponent: () => import('./auth/components/login/login.component').then(m => m.LoginComponent)
  },

  // Chat routes
  {
    path: 'chat',
    loadComponent: () => import('./components/conversation-list/conversation-list.component').then(m => m.ConversationListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'chat/:id',
    loadComponent: () => import('./chat/components/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [AuthGuard]
  },

  // Wildcard route for 404
  { path: '**', redirectTo: '/chat' }
];
