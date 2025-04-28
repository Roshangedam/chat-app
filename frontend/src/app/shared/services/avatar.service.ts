import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

/**
 * Service for managing user avatars with caching
 */
@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private avatarCache = new Map<string, string>();
  private loadingAvatars = new Map<string, boolean>();
  private errorAvatars = new Map<string, boolean>();
  private defaultAvatar = 'assets/images/user-avatar.png';
  private defaultGroupAvatar = 'assets/images/group-avatar.png';

  // Observable for avatar updates
  private avatarUpdatesSubject = new BehaviorSubject<{userId: string | number, avatarUrl: string}>({userId: '', avatarUrl: ''});
  public avatarUpdates$ = this.avatarUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Add these properties
  private readonly DEFAULT_AVATAR = 'assets/images/default-avatar-fixed.png'; // Ensure this file exists
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_EXPIRY_MS = 3600000; // 1 hour

  /**
   * Enhanced getAvatarUrl with better caching and error handling
   */
  getAvatarUrl(userId: string | number, avatarUrl?: string | null, isGroup = false): string {
    if (!userId) {
      return isGroup ? this.defaultGroupAvatar : this.DEFAULT_AVATAR;
    }

    const userIdStr = String(userId);

    // If we have a cached avatar, return it
    if (this.avatarCache.has(userIdStr)) {
      return this.avatarCache.get(userIdStr)!;
    }

    // If we have an avatar URL, verify it exists before caching
    if (avatarUrl) {
      // Store default while we check if the URL is valid
      this.cacheAvatar(userIdStr, isGroup ? this.defaultGroupAvatar : this.DEFAULT_AVATAR);

      // Verify image exists asynchronously
      this.verifyImageExists(avatarUrl).then(exists => {
        if (exists) {
          this.cacheAvatar(userIdStr, avatarUrl);
        }
      });

      return this.avatarCache.get(userIdStr)!;
    }

    // Return default avatar
    const defaultAvatar = isGroup ? this.defaultGroupAvatar : this.DEFAULT_AVATAR;
    this.cacheAvatar(userIdStr, defaultAvatar);
    return defaultAvatar;
  }

  /**
   * Preload an avatar to cache
   * @param userId User ID
   * @param avatarUrl Avatar URL
   */
  preloadAvatar(userId: string | number, avatarUrl?: string | null): Observable<string> {
    if (!userId || !avatarUrl) {
      return of(this.defaultAvatar);
    }

    const userIdStr = String(userId);

    // If already cached, return cached URL
    if (this.avatarCache.has(userIdStr)) {
      return of(this.avatarCache.get(userIdStr)!);
    }

    // If already loading, return default
    if (this.loadingAvatars.get(userIdStr)) {
      return of(this.defaultAvatar);
    }

    // If previously errored, return default
    if (this.errorAvatars.get(userIdStr)) {
      return of(this.defaultAvatar);
    }

    // Mark as loading
    this.loadingAvatars.set(userIdStr, true);

    // Create a new image to preload
    return new Observable<string>(observer => {
      const img = new Image();

      img.onload = () => {
        // Cache the avatar URL
        this.cacheAvatar(userIdStr, avatarUrl!);
        this.loadingAvatars.set(userIdStr, false);
        observer.next(avatarUrl!);
        observer.complete();
      };

      img.onerror = () => {
        // Mark as error and return default
        this.errorAvatars.set(userIdStr, true);
        this.loadingAvatars.set(userIdStr, false);
        observer.next(this.defaultAvatar);
        observer.complete();
      };

      // Start loading the image
      img.src = avatarUrl!;
    }).pipe(
      // Share the same observable for multiple subscribers
      shareReplay(1)
    );
  }

  /**
   * Bulk preload avatars for a list of users
   * @param users List of users with IDs and avatar URLs
   */
  preloadAvatars(users: Array<{id: string | number, avatarUrl?: string | null}>): void {
    if (!users || users.length === 0) return;

    // Preload avatars in batches to avoid too many simultaneous requests
    const batchSize = 5;
    const batches = Math.ceil(users.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, users.length);
      const batch = users.slice(start, end);

      setTimeout(() => {
        batch.forEach(user => {
          if (user.id && user.avatarUrl) {
            this.preloadAvatar(user.id, user.avatarUrl).subscribe();
          }
        });
      }, i * 100); // Stagger batches by 100ms
    }
  }

  /**
   * Cache an avatar URL
   * @param userId User ID
   * @param avatarUrl Avatar URL
   */
  private cacheAvatar(userId: string, avatarUrl: string): void {
    this.avatarCache.set(userId, avatarUrl);
    this.avatarUpdatesSubject.next({userId, avatarUrl});
  }

  /**
   * Clear the avatar cache for a specific user or all users
   * @param userId Optional user ID to clear cache for
   */
  clearCache(userId?: string | number): void {
    if (userId) {
      const userIdStr = String(userId);
      this.avatarCache.delete(userIdStr);
      this.loadingAvatars.delete(userIdStr);
      this.errorAvatars.delete(userIdStr);
    } else {
      this.avatarCache.clear();
      this.loadingAvatars.clear();
      this.errorAvatars.clear();
    }
  }

  /**
   * Update an avatar in the cache
   * @param userId User ID
   * @param avatarUrl New avatar URL
   */
  updateAvatar(userId: string | number, avatarUrl: string): void {
    if (!userId) return;
    this.cacheAvatar(String(userId), avatarUrl);
  }

  /**
   * Verify if an image exists and is loadable
   */
  private verifyImageExists(url: string): Promise<boolean> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }
}

