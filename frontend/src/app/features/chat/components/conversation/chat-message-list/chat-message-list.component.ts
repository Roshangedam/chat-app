import { Component, ElementRef, Input, OnChanges, OnInit, OnDestroy, SimpleChanges, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ChatMessage, MessageStatusUpdate } from '../../../api/models';
import { fromEvent, Subscription, animationFrameScheduler } from 'rxjs';
import { throttleTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ChatMessageItemComponent } from '../chat-message-item/chat-message-item.component';
import { ChatService } from '../../../api/services/chat.service';

/**
 * Component for displaying a list of chat messages.
 * Handles message grouping, date separators, and auto-scrolling.
 */
@Component({
  selector: 'chat-message-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatIconModule,
    ChatMessageItemComponent
  ],
  templateUrl: './chat-message-list.component.html',
  styleUrls: ['./chat-message-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatMessageListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() messages: ChatMessage[] = [];
  @Input() loading = false;
  @Input() isTyping = false;
  @Input() typingUser = '';
  @Input() userId?: string | number;
  @Input() hasMoreMessages = false;

  @Output() loadOlderMessages = new EventEmitter<void>();
  @Output() retryMessage = new EventEmitter<string | number>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Cache message groups to avoid recalculating on every render
  private cachedMessageGroups: { date: Date, messages: ChatMessage[] }[] = [];

  // Infinite scroll properties
  private isLoadingMore = false;
  private scrollSubscription: Subscription = new Subscription();
  private scrollThreshold = 100; // pixels from top to trigger loading more
  private lastScrollHeight = 0;
  private lastScrollTop = 0;

  // Pull-to-refresh properties
  pullDistance = 0; // Current pull distance
  pullThreshold = 120; // Distance needed to trigger refresh
  isPulling = false; // Whether user is currently pulling
  pullProgress = 0; // Progress percentage (0-100)
  loadingProgress = 0; // Loading progress animation (0-100)
  loadingAnimationInterval: any; // Interval for loading animation
  touchStartY = 0; // Starting Y position for touch events
  mouseStartY = 0; // Starting Y position for mouse events
  isMouseDown = false; // Whether mouse is currently down

  // Add a subscription for message status updates
  private statusSubscription = new Subscription();

  constructor(
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    // Setup scroll event listener after view is initialized
    setTimeout(() => this.setupScrollListener(), 0);

    // Subscribe to message status updates
    this.subscribeToMessageStatusUpdates();
  }

  /**
   * Subscribe to real-time message status updates from the chat service
   * This ensures status changes are immediately reflected in the UI
   */
  private subscribeToMessageStatusUpdates(): void {
    // Subscribe to message status updates for real-time UI updates
    this.statusSubscription = this.chatService.messageStatus$.subscribe((statusUpdate: MessageStatusUpdate) => {
      // Skip running the update if not currently in the component's view
      if (!this.messages || this.messages.length === 0) return;

      console.log(`Message list received status update: ${statusUpdate.messageId} → ${statusUpdate.status}`);

      // Request change detection check to update the UI immediately
      this.ngZone.run(() => {
        // Status updates are automatically handled by the chat service's messages$ observable,
        // but we need to manually trigger change detection since we're using OnPush strategy
        this.cdRef.markForCheck();
      });
    });

    // Subscribe to messages observable to handle newly sent messages
    const messagesSub = this.chatService.messages$.subscribe(messages => {
      // If we have a new message (more messages than before), scroll to bottom
      if (messages.length > 0 && (!this.messages || messages.length > this.messages.length)) {
        // Use setTimeout to ensure UI has updated before scrolling
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
      }
    });

    // Add to subscriptions for cleanup
    this.statusSubscription.add(messagesSub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle message changes
    if (changes['messages']) {
      const previousMessages = changes['messages'].previousValue || [];
      const currentMessages = changes['messages'].currentValue || [];

      // Cache message groups to avoid recalculating on every render
      this.cachedMessageGroups = this.calculateMessageGroups();

      // Check if new messages were added and from where
      const newMessagesAdded = currentMessages.length > previousMessages.length;
      const olderMessagesLoaded = newMessagesAdded &&
        previousMessages.length > 0 &&
        currentMessages[0] !== previousMessages[0];


      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (olderMessagesLoaded) {
          // Older messages were loaded, maintain scroll position
          this.maintainScrollPosition();
          this.stopLoadingAnimation();
          this.isLoadingMore = false;
        } else if ((newMessagesAdded) || previousMessages.length === 0) {
          // New messages were added at the bottom (and we were near bottom) or initial load
          this.scrollToBottom();
        }

        // Force change detection to update UI immediately
        this.ngZone.run(() => {
          this.cdRef.detectChanges();
        });
      });
    }

    // Handle loading state changes
    if (changes['loading'] && !changes['loading'].firstChange) {
      const isNowLoading = changes['loading'].currentValue;
      const wasLoading = changes['loading'].previousValue;

      if (isNowLoading && !wasLoading && this.messages.length > 0) {
        // Started loading older messages
        this.startLoadingAnimation();
      } else if (!isNowLoading && wasLoading) {
        // Finished loading
        this.stopLoadingAnimation();

        // Force change detection to update UI immediately
        this.ngZone.run(() => {
          this.cdRef.detectChanges();
        });
      }
    }

    // Handle typing indicator changes
    if (changes['isTyping'] || changes['typingUser']) {
      // If typing status changed, scroll to bottom to show typing indicator
      if (this.isTyping && this.typingUser) {
        console.log(`ChatMessageList: Showing typing indicator for ${this.typingUser}`);
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      } else if (!this.isTyping) {
        console.log('ChatMessageList: Hiding typing indicator');
      }

      // Force change detection to update UI immediately
      this.ngZone.run(() => {
        this.cdRef.detectChanges();
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up scroll event listener
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
    }

    // Clean up status update subscription
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }

    // Clear any running animations
    this.stopLoadingAnimation();
  }

  /**
   * Scroll to the bottom of the message list
   */
  scrollToBottom(): void {
    try {
      const element = this.scrollContainer.nativeElement;
      // Use smooth scrolling for better UX
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });

      // Double-check scroll position after a short delay
      // This ensures scrolling works even with dynamic content
      setTimeout(() => {
        if (element.scrollTop + element.clientHeight < element.scrollHeight - 50) {
          element.scrollTop = element.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Setup scroll event listener for infinite scrolling
   */
  private setupScrollListener(): void {
    // Run outside Angular zone for better performance
    this.ngZone.runOutsideAngular(() => {
      const element = this.scrollContainer?.nativeElement;
      if (!element) return;

      // Save initial scroll height for reference
      this.lastScrollHeight = element.scrollHeight;

      // Setup touch events for pull-to-refresh
      const touchStart$ = fromEvent<TouchEvent>(element, 'touchstart');
      const touchMove$ = fromEvent<TouchEvent>(element, 'touchmove');
      const touchEnd$ = fromEvent<TouchEvent>(element, 'touchend');

      // Setup mouse events for pull-to-refresh (desktop support)
      const mouseDown$ = fromEvent<MouseEvent>(element, 'mousedown');
      const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
      const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');

      // Handle touch start
      const touchStartSub = touchStart$.subscribe((e: TouchEvent) => {
        if (element.scrollTop <= 0 && this.hasMoreMessages && !this.isLoadingMore) {
          this.touchStartY = e.touches[0].clientY;
          this.isPulling = true;
        }
      });

      // Handle touch move for pull-to-refresh
      const touchMoveSub = touchMove$.pipe(
        throttleTime(16, animationFrameScheduler) // ~60fps
      ).subscribe((e: TouchEvent) => {
        if (this.isPulling && !this.isLoadingMore) {
          const touchY = e.touches[0].clientY;
          const diff = touchY - this.touchStartY;

          // Only allow pulling down
          if (diff > 0 && element.scrollTop <= 0) {
            // Apply resistance to make pull feel natural
            this.pullDistance = Math.min(diff * 0.5, this.pullThreshold * 1.5);
            this.pullProgress = Math.min(100, (this.pullDistance / this.pullThreshold) * 100);

            // Run in Angular zone to update UI
            this.ngZone.run(() => {
              this.cdRef.markForCheck();
            });

            // Prevent default scrolling behavior
            e.preventDefault();
          }
        }
      });

      // Handle touch end
      const touchEndSub = touchEnd$.subscribe(() => {
        if (this.isPulling && !this.isLoadingMore) {
          if (this.pullDistance >= this.pullThreshold) {
            // Threshold reached, trigger loading
            this.isLoadingMore = true;

            // Save current scroll position and height
            this.lastScrollHeight = element.scrollHeight;
            this.lastScrollTop = element.scrollTop;

            // Run in Angular zone to trigger loading
            this.ngZone.run(() => {
              this.loadOlderMessages.emit();
              this.startLoadingAnimation();
              this.cdRef.markForCheck();
            });
          }

          // Reset pull state with animation
          this.isPulling = false;
          this.pullDistance = 0;
          this.pullProgress = 0;

          // Update UI
          this.ngZone.run(() => {
            this.cdRef.markForCheck();
          });
        }
      });

      // Handle mouse down
      const mouseDownSub = mouseDown$.subscribe((e: MouseEvent) => {
        if (element.scrollTop <= 0 && this.hasMoreMessages && !this.isLoadingMore) {
          this.mouseStartY = e.clientY;
          this.isMouseDown = true;
          // Prevent text selection during pull
          e.preventDefault();
        }
      });

      // Handle mouse move for pull-to-refresh
      const mouseMoveSub = mouseMove$.pipe(
        throttleTime(16, animationFrameScheduler) // ~60fps
      ).subscribe((e: MouseEvent) => {
        if (this.isMouseDown && !this.isLoadingMore) {
          const diff = e.clientY - this.mouseStartY;

          // Only allow pulling down
          if (diff > 0 && element.scrollTop <= 0) {
            // Apply resistance to make pull feel natural
            this.pullDistance = Math.min(diff * 0.5, this.pullThreshold * 1.5);
            this.pullProgress = Math.min(100, (this.pullDistance / this.pullThreshold) * 100);
            this.isPulling = true;

            // Run in Angular zone to update UI
            this.ngZone.run(() => {
              this.cdRef.markForCheck();
            });

            // Prevent default behavior
            e.preventDefault();
          }
        }
      });

      // Handle mouse up
      const mouseUpSub = mouseUp$.subscribe(() => {
        if (this.isMouseDown && this.isPulling && !this.isLoadingMore) {
          if (this.pullDistance >= this.pullThreshold) {
            // Threshold reached, trigger loading
            this.isLoadingMore = true;

            // Save current scroll position and height
            this.lastScrollHeight = element.scrollHeight;
            this.lastScrollTop = element.scrollTop;

            // Run in Angular zone to trigger loading
            this.ngZone.run(() => {
              this.loadOlderMessages.emit();
              this.startLoadingAnimation();
              this.cdRef.markForCheck();
            });
          }

          // Reset pull state with animation
          this.isMouseDown = false;
          this.isPulling = false;
          this.pullDistance = 0;
          this.pullProgress = 0;

          // Update UI
          this.ngZone.run(() => {
            this.cdRef.markForCheck();
          });
        }
      });

      // Add all event subscriptions to main subscription for cleanup
      this.scrollSubscription.add(touchStartSub);
      this.scrollSubscription.add(touchMoveSub);
      this.scrollSubscription.add(touchEndSub);
      this.scrollSubscription.add(mouseDownSub);
      this.scrollSubscription.add(mouseMoveSub);
      this.scrollSubscription.add(mouseUpSub);

      // Use RxJS to handle scroll events with throttling
      const scrollSub = fromEvent(element, 'scroll').pipe(
        throttleTime(200),
        map(() => element.scrollTop),
        distinctUntilChanged()
      ).subscribe((scrollTop) => {
        // Check if user has scrolled to the top
        if (scrollTop <= this.scrollThreshold && !this.isLoadingMore && this.hasMoreMessages) {
          this.isLoadingMore = true;

          // Save current scroll position and height
          this.lastScrollHeight = element.scrollHeight;
          this.lastScrollTop = scrollTop;

          // Run back in Angular zone to trigger change detection
          this.ngZone.run(() => {
            this.loadOlderMessages.emit();
            this.startLoadingAnimation();
            this.cdRef.markForCheck();
          });
        }
      });

      this.scrollSubscription.add(scrollSub);
    });
  }

  /**
   * Maintain scroll position when older messages are loaded
   * This prevents the scroll from jumping to the top or bottom
   */
  private maintainScrollPosition(): void {
    try {
      const element = this.scrollContainer.nativeElement;
      const newScrollHeight = element.scrollHeight;
      const heightDifference = newScrollHeight - this.lastScrollHeight;

      // Set scroll position to maintain the same relative position
      // This keeps the same messages in view after loading older ones
      element.scrollTop = this.lastScrollTop + heightDifference;

      // Update last known scroll height
      this.lastScrollHeight = newScrollHeight;
    } catch (err) {
      console.error('Error maintaining scroll position:', err);
    }
  }

  /**
   * Start the loading animation for older messages
   * Creates a smooth progress animation
   */
  private startLoadingAnimation(): void {
    // Clear any existing animation
    this.stopLoadingAnimation();

    // Reset progress
    this.loadingProgress = 0;

    // Create a smooth loading animation
    this.loadingAnimationInterval = setInterval(() => {
      // Increment progress with easing (slower as it approaches 100%)
      const remaining = 100 - this.loadingProgress;
      const increment = remaining * 0.05;

      this.loadingProgress = Math.min(99, this.loadingProgress + increment);

      // Run in Angular zone to update UI
      this.ngZone.run(() => {
        this.cdRef.markForCheck();
      });
    }, 100);
  }

  /**
   * Stop the loading animation and clean up
   */
  private stopLoadingAnimation(): void {
    if (this.loadingAnimationInterval) {
      clearInterval(this.loadingAnimationInterval);
      this.loadingAnimationInterval = null;
    }

    // Complete the progress animation
    this.loadingProgress = 100;

    // Run in Angular zone to update UI
    this.ngZone.run(() => {
      this.cdRef.markForCheck();

      // Reset progress after animation completes
      setTimeout(() => {
        this.loadingProgress = 0;
        this.cdRef.markForCheck();
      }, 500);
    });
  }

  /**
   * Check if a message is from the current user
   * @param message The message to check
   */
  isOwnMessage(message: ChatMessage): boolean {
    return this.userId !== undefined && message.senderId === this.userId;
  }

  /**
   * Handle retry message event from a message item
   * @param messageId The ID of the message to retry
   */
  onRetryMessage(messageId: string | number): void {
    this.retryMessage.emit(messageId);
  }

  /**
   * Get the date of a message
   * @param message The message to get the date for
   */
  getMessageDate(message: ChatMessage): Date {
    return message.sentAt ? new Date(message.sentAt) : new Date();
  }

  /**
   * Check if two messages are from different days
   * @param prev The previous message
   * @param current The current message
   */
  isDifferentDay(prev: ChatMessage, current: ChatMessage): boolean {
    const prevDate = this.getMessageDate(prev);
    const currDate = this.getMessageDate(current);

    return prevDate.toDateString() !== currDate.toDateString();
  }

  /**
   * Check if a message should show the sender's avatar
   * @param index Index of the message in the group
   * @param message The current message
   * @param groupMessages All messages in the current date group
   */
  shouldShowAvatar(index: number, message: ChatMessage, groupMessages: ChatMessage[]): boolean {
    // Always show avatar for the first message
    if (index === 0) {
      return true;
    }

    // Show avatar if the sender changed
    const prevMessage = groupMessages[index - 1];
    return prevMessage.senderId !== message.senderId;
  }

  /**
   * Group messages by date
   */
  getMessageGroups(): { date: Date, messages: ChatMessage[] }[] {
    // Return cached groups if available
    if (this.cachedMessageGroups.length > 0) {
      return this.cachedMessageGroups;
    }

    // Calculate groups if cache is empty
    return this.calculateMessageGroups();
  }

  /**
   * Calculate message groups by date
   * This is separated to allow caching
   * Ensures messages are sorted chronologically (oldest first)
   */
  private calculateMessageGroups(): { date: Date, messages: ChatMessage[] }[] {
    // First, create a copy of messages to avoid modifying the original array
    const messagesCopy = [...this.messages];

    // Sort messages by date (oldest first)
    messagesCopy.sort((a, b) => {
      const dateA = this.getMessageDate(a).getTime();
      const dateB = this.getMessageDate(b).getTime();
      return dateA - dateB; // Ascending order (oldest first)
    });

    const groups: { date: Date, messages: ChatMessage[] }[] = [];

    // Group sorted messages by date
    messagesCopy.forEach(message => {
      const messageDate = this.getMessageDate(message);
      const dateString = messageDate.toDateString();

      // Find existing group or create new one
      let group = groups.find(g => g.date.toDateString() === dateString);

      if (!group) {
        group = { date: messageDate, messages: [] };
        groups.push(group);
      }

      group.messages.push(message);
    });

    // Sort groups by date (oldest first)
    groups.sort((a, b) => a.date.getTime() - b.date.getTime());

    return groups;
  }

  /**
   * Track message groups by date string to improve rendering performance
   */
  trackByDate(_index: number, group: { date: Date, messages: ChatMessage[] }): string {
    return group.date.toDateString();
  }

  /**
   * Track messages by ID to improve rendering performance
   */
  trackByMessage(index: number, message: ChatMessage): string | number {
    return message.id || index;
  }
}

