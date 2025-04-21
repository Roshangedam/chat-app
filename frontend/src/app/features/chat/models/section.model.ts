/**
 * Represents a section in the dashboard navigation.
 * This model is used for sidebar and top tabs navigation.
 */
export interface Section {
  /**
   * Unique identifier for the section
   */
  id: string;
  
  /**
   * Material icon name for the section
   */
  icon: string;
  
  /**
   * Display label for the section
   */
  label: string;
  
  /**
   * Optional badge count to display
   */
  badgeCount?: number;
  
  /**
   * Whether the section is disabled
   */
  disabled?: boolean;
}
