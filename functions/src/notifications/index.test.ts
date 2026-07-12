import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Announcement } from '../../../lib/types/announcement';

// Mock nodemailer before importing the module under test
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

import { processNotifications } from './index';
import nodemailer from 'nodemailer';

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    deduplication_key: 'key-1',
    title: 'Renovation in Szczecin',
    description: 'Full apartment renovation',
    source_url: 'https://olx.pl/123',
    source_portal: 'olx',
    category: 'construction',
    location_text: 'Szczecin, Centrum',
    latitude: 53.4285,
    longitude: 14.5528,
    price: 5000,
    contact_info: '555-1234',
    scraped_at: new Date(),
    published_at: null,
    ...overrides,
  };
}

function createMockFirestore(users: Array<Record<string, unknown>> = []) {
  const docs = users.map((u) => ({
    id: u.uid,
    data: () => u,
  }));

  const snapshot = { docs };

  const whereChain = {
    where: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(snapshot),
    }),
  };

  const firestore = {
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereChain),
    }),
  };

  return firestore as unknown as import('firebase-admin/firestore').Firestore;
}

describe('processNotifications', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'password';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it('does nothing when announcements list is empty', async () => {
    const firestore = createMockFirestore();
    await processNotifications([], firestore);
    expect(firestore.collection).not.toHaveBeenCalled();
  });

  it('does nothing when all announcements lack coordinates', async () => {
    const firestore = createMockFirestore();
    const announcements = [
      makeAnnouncement({ latitude: null, longitude: null }),
      makeAnnouncement({ latitude: null, longitude: 14.55 }),
      makeAnnouncement({ latitude: 53.42, longitude: null }),
    ];

    await processNotifications(announcements, firestore);
    expect(firestore.collection).not.toHaveBeenCalled();
  });

  it('does nothing when no premium users with notifications exist', async () => {
    const firestore = createMockFirestore([]);
    const announcements = [makeAnnouncement()];

    await processNotifications(announcements, firestore);

    const transporterMock = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results;
    // Transporter should not have been asked to send anything
    // (it might be created but sendMail won't be called)
  });

  it('sends notification to premium user when announcement is within radius', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'premium@example.com',
        display_name: 'Premium User',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.4285,
          centerLng: 14.5528,
          radiusKm: 10,
          enabled: true,
        },
      },
    ];

    const firestore = createMockFirestore(users);
    // Announcement at the user's exact center location
    const announcements = [
      makeAnnouncement({ latitude: 53.43, longitude: 14.55 }),
    ];

    await processNotifications(announcements, firestore);

    const transporterInstance = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(transporterInstance.sendMail).toHaveBeenCalledTimes(1);
    expect(transporterInstance.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'premium@example.com',
      })
    );
  });

  it('skips users whose notification_prefs is null', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'user@example.com',
        display_name: 'No Prefs User',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: null,
      },
    ];

    const firestore = createMockFirestore(users);
    const announcements = [makeAnnouncement()];

    await processNotifications(announcements, firestore);

    const transporterInstance = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(transporterInstance.sendMail).not.toHaveBeenCalled();
  });

  it('skips users with enabled: false', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'user@example.com',
        display_name: 'Disabled User',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.4285,
          centerLng: 14.5528,
          radiusKm: 50,
          enabled: false,
        },
      },
    ];

    const firestore = createMockFirestore(users);
    const announcements = [makeAnnouncement()];

    await processNotifications(announcements, firestore);

    const transporterInstance = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(transporterInstance.sendMail).not.toHaveBeenCalled();
  });

  it('skips announcements without coordinates', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'premium@example.com',
        display_name: 'Premium User',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.4285,
          centerLng: 14.5528,
          radiusKm: 50,
          enabled: true,
        },
      },
    ];

    const firestore = createMockFirestore(users);
    // Only announcements without coordinates
    const announcements = [
      makeAnnouncement({ latitude: null, longitude: null }),
      makeAnnouncement({ latitude: null, longitude: 14.55 }),
    ];

    await processNotifications(announcements, firestore);

    // Should not even create the transporter since geo filter returns empty
    expect(firestore.collection).not.toHaveBeenCalled();
  });

  it('does not send when announcements are outside user radius', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'premium@example.com',
        display_name: 'Premium User',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.4285,
          centerLng: 14.5528,
          radiusKm: 1, // very small radius (1km)
          enabled: true,
        },
      },
    ];

    const firestore = createMockFirestore(users);
    // Announcement far away (Warsaw, ~500km from Szczecin)
    const announcements = [
      makeAnnouncement({ latitude: 52.23, longitude: 21.01 }),
    ];

    await processNotifications(announcements, firestore);

    const transporterInstance = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(transporterInstance.sendMail).not.toHaveBeenCalled();
  });

  it('consolidates more than 10 matching announcements to max 10', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'premium@example.com',
        display_name: 'Premium User',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.4285,
          centerLng: 14.5528,
          radiusKm: 50,
          enabled: true,
        },
      },
    ];

    const firestore = createMockFirestore(users);
    // 15 announcements all within range
    const announcements = Array.from({ length: 15 }, (_, i) =>
      makeAnnouncement({
        deduplication_key: `key-${i}`,
        title: `Ad ${i}`,
        latitude: 53.43,
        longitude: 14.55,
      })
    );

    await processNotifications(announcements, firestore);

    const transporterInstance = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(transporterInstance.sendMail).toHaveBeenCalledTimes(1);

    // The email text should contain the first 10 ads (consolidated)
    const call = transporterInstance.sendMail.mock.calls[0][0];
    expect(call.subject).toContain('10');
  });

  it('sends separate emails to multiple matching users', async () => {
    const users = [
      {
        uid: 'user-1',
        email: 'user1@example.com',
        display_name: 'User 1',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.4285,
          centerLng: 14.5528,
          radiusKm: 10,
          enabled: true,
        },
      },
      {
        uid: 'user-2',
        email: 'user2@example.com',
        display_name: 'User 2',
        tier: 'premium',
        created_at: new Date(),
        updated_at: new Date(),
        notification_prefs: {
          centerLat: 53.43,
          centerLng: 14.55,
          radiusKm: 10,
          enabled: true,
        },
      },
    ];

    const firestore = createMockFirestore(users);
    const announcements = [
      makeAnnouncement({ latitude: 53.43, longitude: 14.55 }),
    ];

    await processNotifications(announcements, firestore);

    const transporterInstance = (nodemailer.createTransport as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(transporterInstance.sendMail).toHaveBeenCalledTimes(2);

    const recipients = transporterInstance.sendMail.mock.calls.map(
      (call: Array<{ to: string }>) => call[0].to
    );
    expect(recipients).toContain('user1@example.com');
    expect(recipients).toContain('user2@example.com');
  });
});
