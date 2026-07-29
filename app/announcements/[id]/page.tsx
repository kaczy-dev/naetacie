'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AnnouncementDetail } from '@/components/list';
import { SEED_DATA } from '@/lib/data/announcements';
import { ensureAbsoluteUrl } from '@/lib/utils';
import type { MaskedAnnouncement, SourcePortal } from '@/lib/types/announcement';

/**
 * Announcement detail page.
 * Fetches a single announcement by its deduplication_key (from the [id] route param)
 * and renders it using the AnnouncementDetail component.
 * Fallbacks to SEED_DATA for static/demo items.
 */
export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [announcement, setAnnouncement] = useState<MaskedAnnouncement | null>(null);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnnouncement() {
      if (authLoading) return;
      setLoading(true);
      setError(null);

      const id = params.id;
      if (!id) {
        setError('Brak identyfikatora ogłoszenia');
        setLoading(false);
        return;
      }

      // First check SEED_DATA for instantaneous offline/demo resolution
      const seedItem = SEED_DATA.find((s) => s.id === id || s.id.toLowerCase() === id.toLowerCase());
      if (seedItem) {
        setAnnouncement({
          deduplication_key: seedItem.id,
          title: seedItem.title,
          description: seedItem.description,
          source_portal: seedItem.source_portal as SourcePortal,
          category: seedItem.category,
          location_text: seedItem.location_text,
          latitude: seedItem.latitude,
          longitude: seedItem.longitude,
          price: seedItem.price,
          scraped_at: new Date(),
          published_at: new Date(),
          source_url: ensureAbsoluteUrl(seedItem.source_url, seedItem.source_portal) || seedItem.source_url,
          contact_info: seedItem.phone,
        });
        setTier('premium');
        setLoading(false);
        return;
      }

      try {
        const headers: Record<string, string> = {};
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch announcements from API
        const response = await fetch(`/api/announcements?page=1&limit=100`, { headers });
        if (response.ok) {
          const result = await response.json();
          const found = result.data?.find((a: MaskedAnnouncement) => a.deduplication_key === id || a.title.toLowerCase().includes(id.toLowerCase()));

          if (found) {
            setAnnouncement({
              ...found,
              source_url: found.source_url ? (ensureAbsoluteUrl(found.source_url, found.source_portal) || found.source_url) : undefined,
            });
            setTier(found.source_url !== undefined ? 'premium' : 'free');
            setLoading(false);
            return;
          }
        }
        setError('Ogłoszenie nie zostało znalezione');
      } catch (err) {
        setError('Nie udało się pobrać szczegółów ogłoszenia');
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncement();
  }, [params.id, authLoading, user]);

  function handleBack() {
    router.back();
  }


  function handleUpgradeClick() {
    // Navigate to a future premium upgrade page
    router.push('/');
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading announcement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
          <button type="button" onClick={handleBack} style={styles.backButton}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button type="button" onClick={handleBack} style={styles.backLink}>
          ← Back
        </button>
      </div>
      <div style={styles.content}>
        <AnnouncementDetail
          announcement={announcement}
          tier={tier}
          onUpgradeClick={handleUpgradeClick}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 0',
  },
  content: {
    padding: '16px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  loading: {
    padding: '48px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  errorContainer: {
    padding: '48px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '14px',
  },
  backButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
