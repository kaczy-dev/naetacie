import { describe, it, expect, vi } from 'vitest';
import { sendNotificationEmail } from './email';
import { Announcement } from '../../../lib/types/announcement';
import { Transporter } from 'nodemailer';

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

function createMockTransporter(sendMailImpl?: () => Promise<unknown>) {
  return {
    sendMail: vi.fn(sendMailImpl ?? (() => Promise.resolve({ messageId: 'test-id' }))),
  } as unknown as Transporter;
}

describe('sendNotificationEmail', () => {
  it('sends email with correct recipient', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement()];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
      })
    );
  });

  it('includes announcement title in email body', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement({ title: 'Test Renovation Job' })];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.text).toContain('Test Renovation Job');
  });

  it('includes location_text in email body', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement({ location_text: 'Szczecin, Dąbie' })];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.text).toContain('Szczecin, Dąbie');
  });

  it('includes price in email body when price is set', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement({ price: 3500 })];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.text).toContain('3500 PLN');
  });

  it('shows "Price not listed" when price is null', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement({ price: null })];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.text).toContain('Price not listed');
  });

  it('lists multiple announcements in email body', async () => {
    const transporter = createMockTransporter();
    const announcements = [
      makeAnnouncement({ title: 'Job A', location_text: 'Location A', price: 1000 }),
      makeAnnouncement({ title: 'Job B', location_text: 'Location B', price: 2000 }),
    ];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.text).toContain('Job A');
    expect(call.text).toContain('Location A');
    expect(call.text).toContain('1000 PLN');
    expect(call.text).toContain('Job B');
    expect(call.text).toContain('Location B');
    expect(call.text).toContain('2000 PLN');
  });

  it('uses singular subject for single announcement', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement()];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.subject).toBe('New construction ad matching your preferences');
  });

  it('uses plural subject with count for multiple announcements', async () => {
    const transporter = createMockTransporter();
    const announcements = [makeAnnouncement(), makeAnnouncement()];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.subject).toBe('2 new construction ads matching your preferences');
  });

  it('logs error and does not throw on delivery failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const transporter = createMockTransporter(() => Promise.reject(new Error('SMTP connection failed')));
    const announcements = [makeAnnouncement()];

    // Should not throw
    await expect(
      sendNotificationEmail('user@example.com', announcements, transporter)
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send notification email'),
      expect.stringContaining('SMTP connection failed')
    );

    consoleSpy.mockRestore();
  });

  it('does not retry on delivery failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const transporter = createMockTransporter(() => Promise.reject(new Error('fail')));
    const announcements = [makeAnnouncement()];

    await sendNotificationEmail('user@example.com', announcements, transporter);

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
