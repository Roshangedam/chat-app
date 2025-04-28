import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatConversation, ChatUser } from '../../../api/models';
import { DateFormatterUtils } from '../../../../../shared/utils/date-formatter.utils';
import { StatusService } from '../../../../../shared/services/status.service';
import { StatusIndicatorComponent } from '../../../../../shared/components/status-indicator/status-indicator.component';
import { Subscription, catchError, of, tap } from 'rxjs';
import { UserApiService } from '../../../api/services/user-api.service';

/**
 * Component for displaying the header of a chat conversation.
 * Shows conversation name, status, and actions.
 *
 * This component is designed to be reusable across different views (desktop and mobile)
 * and properly updates when the conversation changes.
 */
@Component({
  selector: 'chat-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    StatusIndicatorComponent
  ],
  templateUrl: './chat-header.component.html',
  styleUrls: ['./chat-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatHeaderComponent implements OnChanges, OnDestroy {
  @Input() conversation: ChatConversation | null = null;
  @Input() isTyping = false;
  @Input() typingUser = '';
  @Input() isMobileView = false;
  @Input() showBackButton = true;
  @Input() showCallButtons = true;
  @Input() currentUserId: string | number | null = null;

  @Output() backClick = new EventEmitter<void>();
  @Output() menuAction = new EventEmitter<string>();

  // Cached values to prevent unnecessary recalculations
  private _cachedConversationName: string = '';
  private _cachedStatusText: string = '';
  private _cachedStatusClass: string = '';
  private _lastConversationId: string | number | null = null;
  private _cachedOtherParticipant: any = null;

  // Subscription for status updates
  private subscriptions = new Subscription();

  constructor(
    private cdr: ChangeDetectorRef,
    private dateFormatter: DateFormatterUtils,
    private statusService: StatusService,
    private userApiService: UserApiService
  ) {}

  /**
   * Detect changes to inputs and update the component
   */
  ngOnChanges(changes: SimpleChanges): void {
    console.log('ChatHeader: ngOnChanges called', {
      hasConversationChange: !!changes['conversation'],
      hasCurrentUserIdChange: !!changes['currentUserId'],
      hasTypingChange: !!(changes['isTyping'] || changes['typingUser']),
      currentUserId: this.currentUserId
    });

    // Always clear cached values when any input changes to ensure fresh data
    let shouldUpdate = false;

    // Check if conversation has changed
    if (changes['conversation']) {
      const newConversation = changes['conversation'].currentValue;

      if (newConversation) {
        console.log('ChatHeader: Conversation changed', {
          oldId: this._lastConversationId,
          newId: newConversation.id,
          name: newConversation.name,
          isGroupChat: newConversation.groupChat,
          participantsCount: newConversation.participants?.length || 0
        });

        // Update the last conversation ID
        this._lastConversationId = newConversation.id;

        // Subscribe to status updates for the other participant
        this.subscribeToStatusUpdates(newConversation);
      } else {
        console.log('ChatHeader: Conversation cleared');
        this._lastConversationId = null;
      }

      // Clear cached values
      this._cachedConversationName = '';
      this._cachedStatusText = '';
      this._cachedStatusClass = '';
      this._cachedOtherParticipant = null;
      shouldUpdate = true;
    }

    // Check if current user ID has changed
    if (changes['currentUserId']) {
      console.log('ChatHeader: Current user ID changed', {
        oldValue: changes['currentUserId'].previousValue,
        newValue: changes['currentUserId'].currentValue
      });

      // Clear cached values
      this._cachedConversationName = '';
      this._cachedStatusText = '';
      this._cachedStatusClass = '';
      this._cachedOtherParticipant = null;
      shouldUpdate = true;
    }

    // Check if typing status has changed
    if (changes['isTyping'] || changes['typingUser']) {
      // Clear cached status values
      this._cachedStatusText = '';
      this._cachedStatusClass = '';
      shouldUpdate = true;
    }

    // Manually trigger change detection if needed
    if (shouldUpdate) {
      this.cdr.markForCheck();
    }
  }

  /**
   * Subscribe to status updates for the other participant in the conversation
   * @param conversation The conversation to subscribe to status updates for
   */
  private subscribeToStatusUpdates(conversation: ChatConversation): void {
    // Clear previous subscriptions
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    // Only subscribe for one-to-one conversations
    if (conversation.groupChat) {
      return;
    }

    // Get the other participant
    const otherParticipant = this.getOtherParticipant();
    if (!otherParticipant || !otherParticipant.id) {
      return;
    }

    // Check if lastSeen data is missing and fetch it if needed
    if (otherParticipant.status === 'OFFLINE' && !otherParticipant.lastSeen) {
      console.log(`ChatHeader: Fetching user details for ${otherParticipant.id} to get lastSeen data`);

      const userDetailsSub = this.userApiService.getUser(otherParticipant.id)
        .pipe(
          tap(userDetails => {
            console.log(`ChatHeader: Received user details for ${otherParticipant.id}`, userDetails);

            // Update the participant object with lastSeen data
            if (userDetails && userDetails.lastSeen) {
              otherParticipant.lastSeen = userDetails.lastSeen;

              // Clear cached values to force recalculation
              this._cachedStatusText = '';
              this._cachedStatusClass = '';

              // Manually trigger change detection
              this.cdr.markForCheck();
            }
          }),
          catchError(error => {
            console.error(`ChatHeader: Error fetching user details for ${otherParticipant.id}:`, error);
            return of(null);
          })
        )
        .subscribe();

      this.subscriptions.add(userDetailsSub);
    }

    // Subscribe to status updates for the other participant
    const statusSub = this.statusService.getUserStatusUpdates(otherParticipant.id)
      .subscribe(status => {
        console.log(`ChatHeader: Status update for user ${otherParticipant.id}: ${status}`);

        // If status changed to OFFLINE, fetch user details to get updated lastSeen
        if (status === 'OFFLINE' && !otherParticipant.lastSeen) {
          this.userApiService.getUser(otherParticipant.id)
            .pipe(
              tap(userDetails => {
                if (userDetails && userDetails.lastSeen) {
                  otherParticipant.lastSeen = userDetails.lastSeen;
                }
              }),
              catchError(error => {
                console.error(`ChatHeader: Error fetching user details after status change:`, error);
                return of(null);
              })
            )
            .subscribe();
        }

        // Clear cached values to force recalculation
        this._cachedStatusText = '';
        this._cachedStatusClass = '';

        // Manually trigger change detection
        this.cdr.markForCheck();
      });

    this.subscriptions.add(statusSub);
  }

  /**
   * Clean up resources
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
  }

  /**
   * Get the other participant in a one-to-one conversation
   * @returns The other participant or null if not found or if it's a group chat
   */
  getOtherParticipant(): any {
    // Return cached value if available
    if (this._cachedOtherParticipant) {
      return this._cachedOtherParticipant;
    }

    if (!this.conversation || !this.conversation.participants || this.conversation.participants.length === 0) {
      console.log('ChatHeader: Cannot find other participant - missing conversation data', {
        hasConversation: !!this.conversation,
        isGroupChat: this.conversation?.groupChat,
        participantsCount: this.conversation?.participants?.length
      });
      return null;
    }

    // For group chats, we don't need to find the "other" participant
    if (this.conversation.groupChat) {
      return null;
    }

    // For one-to-one chats, find the other participant (not the current user)
    // Use the same logic as in the dashboard component
    const otherParticipant = this.conversation.participants.find((p: any) =>
      p.id !== this.currentUserId && p.userId !== this.currentUserId
    );

    if (otherParticipant) {
      console.log('ChatHeader: Found other participant', {
        id: otherParticipant.id,
        name: otherParticipant.username || otherParticipant.fullName,
        status: otherParticipant.status
      });

      // Cache the result
      this._cachedOtherParticipant = otherParticipant;
      return this._cachedOtherParticipant;
    }

    // If we couldn't find the other participant using the above logic,
    // try the simpler approach of just finding a participant with a different ID
    if (this.currentUserId) {
      const simpleOtherParticipant = this.conversation.participants.find(
        p => String(p.id) !== String(this.currentUserId)
      );

      if (simpleOtherParticipant) {
        console.log('ChatHeader: Found other participant using simple ID comparison', {
          id: simpleOtherParticipant.id,
          name: simpleOtherParticipant.username || simpleOtherParticipant.fullName,
          status: simpleOtherParticipant.status
        });

        // Cache the result
        this._cachedOtherParticipant = simpleOtherParticipant;
        return this._cachedOtherParticipant;
      }
    }

    // If we still couldn't find the other participant, just use the first participant as a fallback
    const firstParticipant = this.conversation.participants[0];
    console.log('ChatHeader: Using first participant as fallback', {
      id: firstParticipant.id,
      name: firstParticipant.username || firstParticipant.fullName,
      status: firstParticipant.status
    });

    // Cache the result
    this._cachedOtherParticipant = firstParticipant;
    return this._cachedOtherParticipant;
  }

  /**
   * Get the name to display for the conversation
   * @returns The formatted conversation name with proper fallbacks
   */
  getConversationName(): string {
    // Return cached value if available
    if (this._cachedConversationName) {
      return this._cachedConversationName;
    }

    if (!this.conversation) {
      this._cachedConversationName = 'Chat';
      return this._cachedConversationName;
    }

    // For group chats, use the conversation name or a fallback
    if (this.conversation.groupChat) {
      this._cachedConversationName = this.conversation.name || 'Group Chat';
      return this._cachedConversationName;
    }

    // For one-to-one chats, use the other participant's name
    const otherParticipant = this.getOtherParticipant();
    if (otherParticipant) {
      // Use display name, full name, or username with fallbacks
      this._cachedConversationName = otherParticipant.displayName ||
             otherParticipant.fullName ||
             otherParticipant.username ||
             'Unknown User';
      return this._cachedConversationName;
    }

    // If we couldn't find the other participant, use the conversation name as a fallback
    if (this.conversation.name) {
      this._cachedConversationName = this.conversation.name;
      return this._cachedConversationName;
    }

    this._cachedConversationName = 'Chat';
    return this._cachedConversationName;
  }

  /**
   * Get the status text to display
   * @returns The formatted status text based on typing and user status
   */
  getStatusText(): string {

    // Return cached value if available
    if (this._cachedStatusText) {
      return this._cachedStatusText;
    }

    // Typing indicator takes precedence
    if (this.isTyping && this.typingUser) {
      this._cachedStatusText = `${this.typingUser} is typing...`;
      return this._cachedStatusText;
    }

    // No status for group chats unless someone is typing
    if (!this.conversation || (this.conversation.groupChat && !this.isTyping)) {
      this._cachedStatusText = '';
      return this._cachedStatusText;
    }

    // For one-to-one chats, show the other participant's status
    const otherParticipant = this.getOtherParticipant();
    if (otherParticipant) {
      // First check if we have a real-time status from the StatusService
      if (otherParticipant.id) {
        const realTimeStatus = this.statusService.getUserStatus(otherParticipant.id);
        if (realTimeStatus) {
          switch (realTimeStatus.toUpperCase()) {
            case 'ONLINE':
              this._cachedStatusText = 'Online';
              break;
            case 'AWAY':
              this._cachedStatusText = 'Away';
              break;
            case 'DO_NOT_DISTURB':
              this._cachedStatusText = 'Do not disturb';
              break;
            case 'OFFLINE':
              // Show last seen time if available
              if (otherParticipant.lastSeen) {
                this._cachedStatusText = `Last seen ${this.formatLastSeen(otherParticipant.lastSeen)}`;
              } else {
                this._cachedStatusText = 'Offline';

                // If lastSeen is undefined or null, fetch it from the API
                console.log(`ChatHeader: getStatusText - lastSeen is missing for user ${otherParticipant.id}, fetching from API`);
                this.userApiService.getUser(otherParticipant.id)
                  .pipe(
                    tap(userDetails => {
                      if (userDetails && userDetails.lastSeen) {
                        console.log(`ChatHeader: getStatusText - Received lastSeen data for user ${otherParticipant.id}`, userDetails.lastSeen);
                        otherParticipant.lastSeen = userDetails.lastSeen;

                        // Update the status text with the new lastSeen data
                        this._cachedStatusText = `Last seen ${this.formatLastSeen(otherParticipant.lastSeen)}`;

                        // Manually trigger change detection
                        this.cdr.markForCheck();
                      }
                    }),
                    catchError(error => {
                      console.error(`ChatHeader: getStatusText - Error fetching user details:`, error);
                      return of(null);
                    })
                  )
                  .subscribe();
              }
              break;
            default:
              this._cachedStatusText = 'Offline';
              break;
          }
          return this._cachedStatusText;
        }
      }

      // Fall back to the status stored in the participant object
      const status = otherParticipant.status?.toUpperCase() || 'OFFLINE';
      switch (status) {
        case 'ONLINE':
          this._cachedStatusText = 'Online';
          break;
        case 'AWAY':
          this._cachedStatusText = 'Away';
          break;
        case 'DO_NOT_DISTURB':
          this._cachedStatusText = 'Do not disturb';
          break;
        case 'OFFLINE':
        default:
          // Show last seen time if available
          if (otherParticipant.lastSeen) {
            this._cachedStatusText = `Last seen ${this.formatLastSeen(otherParticipant.lastSeen)}`;
          } else {
            this._cachedStatusText = 'Offline';

            // If lastSeen is undefined or null, fetch it from the API
            console.log(`ChatHeader: getStatusText - lastSeen is missing for user ${otherParticipant.id}, fetching from API`);
            this.userApiService.getUser(otherParticipant.id)
              .pipe(
                tap(userDetails => {
                  if (userDetails && userDetails.lastSeen) {
                    console.log(`ChatHeader: getStatusText - Received lastSeen data for user ${otherParticipant.id}`, userDetails.lastSeen);
                    otherParticipant.lastSeen = userDetails.lastSeen;

                    // Update the status text with the new lastSeen data
                    this._cachedStatusText = `Last seen ${this.formatLastSeen(otherParticipant.lastSeen)}`;

                    // Manually trigger change detection
                    this.cdr.markForCheck();
                  }
                }),
                catchError(error => {
                  console.error(`ChatHeader: getStatusText - Error fetching user details:`, error);
                  return of(null);
                })
              )
              .subscribe();
          }
          break;
      }
      return this._cachedStatusText;
    }

    // If we couldn't find the other participant, show a generic status
    if (!this.conversation.groupChat) {
      this._cachedStatusText = 'Offline';
      return this._cachedStatusText;
    }

    this._cachedStatusText = '';
    return this._cachedStatusText;
  }

  /**
   * Format the last seen time in a user-friendly way
   * @param lastSeen The date when the user was last seen
   * @returns Formatted string (e.g., "5 minutes ago", "Yesterday at 2:30 PM")
   */
  private formatLastSeen(lastSeen: Date | string): string {
    if (!lastSeen) return '';

    // Try to parse the date
    let lastSeenDate: Date;

    if (typeof lastSeen === 'string') {
      // Handle ISO string format
      lastSeenDate = new Date(lastSeen);

      // If parsing failed, try alternative formats
      if (isNaN(lastSeenDate.getTime())) {
        // Try to parse timestamp (milliseconds since epoch)
        const timestamp = parseInt(lastSeen, 10);
        if (!isNaN(timestamp)) {
          lastSeenDate = new Date(timestamp);
        } else {
          console.warn('ChatHeader: Invalid lastSeen date format', lastSeen);
          return '';
        }
      }
    } else {
      lastSeenDate = lastSeen;
    }

    const now = new Date();

    // Check if valid date
    if (isNaN(lastSeenDate.getTime())) {
      console.warn('ChatHeader: Invalid lastSeen date', lastSeenDate);
      return '';
    }

    // Calculate time difference in minutes
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    // Less than 1 minute ago
    if (diffMinutes < 1) {
      return 'just now';
    }

    // Less than 60 minutes ago
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours ago
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(lastSeenDate, yesterday)) {
      return `yesterday at ${this.formatTime(lastSeenDate)}`;
    }

    // Within last 7 days
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (lastSeenDate >= oneWeekAgo) {
      return `${this.formatDayName(lastSeenDate)} at ${this.formatTime(lastSeenDate)}`;
    }

    // More than 7 days ago
    return this.dateFormatter.formatConversationTime(lastSeenDate);
  }

  /**
   * Check if two dates are on the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Format time (e.g., "10:30 AM")
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  /**
   * Format day name (e.g., "Monday")
   */
  private formatDayName(date: Date): string {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  /**
   * Get the status class for styling
   * @returns The CSS class for the status indicator
   */
  getStatusClass(): string {
    // Return cached value if available
    if (this._cachedStatusClass) {
      return this._cachedStatusClass;
    }

    // Typing indicator takes precedence
    if (this.isTyping) {
      this._cachedStatusClass = 'typing';
      return this._cachedStatusClass;
    }

    // No status indicator for group chats
    if (!this.conversation || this.conversation.groupChat) {
      this._cachedStatusClass = '';
      return this._cachedStatusClass;
    }

    // For one-to-one chats, get the status class
    const otherParticipant = this.getOtherParticipant();
    if (otherParticipant) {
      // First check if we have a real-time status from the StatusService
      if (otherParticipant.id) {
        const realTimeStatus = this.statusService.getUserStatus(otherParticipant.id);
        if (realTimeStatus) {
          switch (realTimeStatus.toUpperCase()) {
            case 'ONLINE':
              this._cachedStatusClass = 'online';
              break;
            case 'AWAY':
              this._cachedStatusClass = 'away';
              break;
            case 'DO_NOT_DISTURB':
              this._cachedStatusClass = 'do-not-disturb';
              break;
            default:
              this._cachedStatusClass = 'offline';
              break;
          }
          return this._cachedStatusClass;
        }
      }

      // Fall back to the status stored in the participant object
      if (otherParticipant.status) {
        const status = otherParticipant.status.toUpperCase();
        switch (status) {
          case 'ONLINE':
            this._cachedStatusClass = 'online';
            break;
          case 'AWAY':
            this._cachedStatusClass = 'away';
            break;
          case 'DO_NOT_DISTURB':
            this._cachedStatusClass = 'do-not-disturb';
            break;
          default:
            this._cachedStatusClass = 'offline';
            break;
        }
        return this._cachedStatusClass;
      }
    }

    this._cachedStatusClass = 'offline';
    return this._cachedStatusClass;
  }

  /**
   * Handle back button click
   */
  onBackClick(): void {
    this.backClick.emit();
  }

  /**
   * Handle menu action click
   * @param action The action that was clicked
   */
  onMenuAction(action: string): void {
    this.menuAction.emit(action);
  }

  /**
   * Handle voice call button click
   */
  onVoiceCallClick(): void {
    this.menuAction.emit('voice-call');
  }

  /**
   * Handle video call button click
   */
  onVideoCallClick(): void {
    this.menuAction.emit('video-call');
  }
}
