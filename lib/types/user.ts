/**
 * Notification preferences and Multi-Channel Alert settings.
 * Defines geographic radius, trade filters, and notification channels.
 */
export interface NotificationPreferences {
  centerLat: number;
  centerLng: number;
  /** Notification radius in kilometers (1-50). */
  radiusKm: number;
  enabled: boolean;
  minPriceFilter?: number | null;
  selectedTrades?: string[];
  channels?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

export type UserRole = 'candidate' | 'employer';

export interface TradeCertifications {
  sep: boolean;
  udt: boolean;
  fgaz: boolean;
  drivingLicenseB: boolean;
  drivingLicenseC: boolean;
  hds: boolean;
  heights: boolean;
  welding: boolean;
}

/**
 * User profile stored in the Firestore `users` collection.
 * Document ID is the Firebase Authentication UID.
 */
export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  tier: 'free' | 'premium';
  auth_provider: 'email' | 'google' | 'magic_link' | 'phone';
  email_verified: boolean;
  phone?: string | null;
  trades?: string[];
  certifications?: Partial<TradeCertifications>;
  expected_salary_min?: number | null;
  employment_types?: string[];
  bio?: string | null;
  portfolio_urls?: string[];
  created_at: Date;
  updated_at: Date;
  notification_prefs: NotificationPreferences | null;
}
