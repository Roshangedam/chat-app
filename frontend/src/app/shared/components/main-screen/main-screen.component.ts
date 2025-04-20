import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { Conversation } from '../../../features/chat/models/conversation.model';
import { ResponsiveUtils } from '../../utils/responsive.utils';

@Component({
  selector: 'app-main-screen',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './main-screen.component.html',
  styleUrls: ['./main-screen.component.css']
})
export class MainScreenComponent {
  @Input() conversation: Conversation | null = null;

  constructor(public responsiveUtils: ResponsiveUtils) {}
}
