/**
 * Notification preferences for premium users.
 * Defines a geographic circle for new-ad alerts.
 */
export interface NotificationPreferences {
  centerLat: number;
  centerLng: number;
  /** Notification radius in kilometers (1-50). */
  radiusKm: number;
  enabled: boolean;
}

/**
 * User profile stored in the Firestore `users` collection.
 * Document ID is the Firebase Authentication UID.
 */
export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  tier: 'free' | 'premium';
  auth_provider: 'email' | 'google';
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  notification_prefs: NotificationPreferences | null;
}
