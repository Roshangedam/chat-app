import { 
  Component, 
  Input, 
  OnInit, 
  OnDestroy, 
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AvatarService } from '../../services/avatar.service';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

/**
 * A reusable component for displaying user avatars with status indicators
 * Uses OnPush change detection for better performance
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule, StatusIndicatorComponent],
  template: `
    <div class="avatar-container" [class.clickable]="clickable">
      <img
        [src]="avatarUrl"
        [alt]="altText"
        class="avatar"
        [class.small]="size === 'small'"
        [class.large]="size === 'large'"
        (error)="handleImageError()"
        [attr.loading]="lazyLoad ? 'lazy' : null"
      >
      <app-status-indicator 
        *ngIf="showStatus && userId" 
        [userId]="userId" 
        [size]="size">
      </app-status-indicator>
    </div>
  `,
  styles: [`
    .avatar-container {
      position: relative;
      display: inline-block;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      background-color: #f5f5f5;
    }
    
    .avatar.small {
      width: 32px;
      height: 32px;
    }
    
    .avatar.large {
      width: 48px;
      height: 48px;
    }
    
    .clickable {
      cursor: pointer;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAvatarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() userId: string | number | null = null;
  @Input() avatarUrl: string | null = null;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';
  @Input() showStatus = true;
  @Input() isGroup = false;
  @Input() clickable = false;
  @Input() lazyLoad = true;
  @Input() altText = 'User avatar';
  
  private subscriptions = new Subscription();
  private defaultAvatarUrl = 'assets/images/user-avatar.png';
  
  constructor(
    private avatarService: AvatarService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Subscribe to avatar updates for this user
    if (this.userId) {
      this.subscriptions.add(
        this.avatarService.avatarUpdates$
          .subscribe(update => {
            if (String(update.userId) === String(this.userId)) {
              this.avatarUrl = update.avatarUrl;
              this.cdr.markForCheck();
            }
          })
      );
      
      // Preload the avatar if we have a URL
      if (this.avatarUrl) {
        this.avatarService.preloadAvatar(this.userId, this.avatarUrl)
          .subscribe(url => {
            this.avatarUrl = url;
            this.cdr.markForCheck();
          });
      }
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // If userId or avatarUrl changes, update the avatar
    if ((changes['userId'] || changes['avatarUrl']) && this.userId) {
      this.avatarUrl = this.avatarService.getAvatarUrl(
        this.userId, 
        this.avatarUrl, 
        this.isGroup
      );
    }
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  /**
   * Handle image loading errors
   */
  handleImageError(): void {
    this.avatarUrl = this.isGroup ? 
      'assets/images/group-avatar.png' : 
      this.defaultAvatarUrl;
    this.cdr.markForCheck();
  }
}
