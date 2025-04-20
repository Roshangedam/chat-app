import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateFormatterUtils {
  /**
   * Format a date for message timestamps
   * @param date The date to format
   * @returns Formatted string (e.g., "10:30 AM" or "Yesterday" or "Mon, 12 Apr")
   */
  formatMessageTime(date: Date | string | undefined): string {
    if (!date) return '';
    
    const messageDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Check if valid date
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    // Same day: show time only
    if (this.isSameDay(messageDate, now)) {
      return this.formatTime(messageDate);
    }
    
    // Yesterday: show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(messageDate, yesterday)) {
      return 'Yesterday';
    }
    
    // Within last 7 days: show day name
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (messageDate >= oneWeekAgo) {
      return this.formatDayName(messageDate);
    }
    
    // This year: show day and month
    if (messageDate.getFullYear() === now.getFullYear()) {
      return this.formatDayMonth(messageDate);
    }
    
    // Different year: show day, month and year
    return this.formatDayMonthYear(messageDate);
  }
  
  /**
   * Format a date for conversation list
   * @param date The date to format
   * @returns Formatted string (e.g., "10:30 AM" or "Yesterday" or "12/04/2023")
   */
  formatConversationTime(date: Date | string | undefined): string {
    if (!date) return '';
    
    const messageDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Check if valid date
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    // Same day: show time only
    if (this.isSameDay(messageDate, now)) {
      return this.formatTime(messageDate);
    }
    
    // Yesterday: show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (this.isSameDay(messageDate, yesterday)) {
      return 'Yesterday';
    }
    
    // Within last 7 days: show day name
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (messageDate >= oneWeekAgo) {
      return this.formatDayName(messageDate);
    }
    
    // Different year or more than a week ago: show date
    return this.formatShortDate(messageDate);
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
   * Format day and month (e.g., "12 Apr")
   */
  private formatDayMonth(date: Date): string {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
  
  /**
   * Format day, month and year (e.g., "12 Apr 2023")
   */
  private formatDayMonthYear(date: Date): string {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  /**
   * Format short date (e.g., "12/04/2023")
   */
  private formatShortDate(date: Date): string {
    return date.toLocaleDateString();
  }
}
