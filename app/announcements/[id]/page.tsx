'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';
import { AnnouncementDetail } from '@/components/list';
import type { MaskedAnnouncement } from '@/lib/types/announcement';

/**
 * Announcement detail page.
 * Fetches a single announcement by its deduplication_key (from the [id] route param)
 * and renders it using the AnnouncementDetail component.
 *
 * Determines user tier from the API response (presence/absence of source_url).
 */
export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<MaskedAnnouncement | null>(null);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, (user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    async function fetchAnnouncement() {
      setLoading(true);
      setError(null);

      try {
        const user = clientAuth.currentUser;
        if (!user) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();
        const id = params.id;

        // Fetch announcement by ID using the API endpoint
        const response = await fetch(`/api/announcements?page=1&limit=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.error || `Request failed with status ${response.status}`);
          setLoading(false);
          return;
        }

        const result = await response.json();

        // Find the specific announcement from the data
        // In a production app, we'd have a dedicated endpoint like /api/announcements/:id
        // For now, we try to find it from a broader query
        const found = result.data?.find(
          (a: MaskedAnnouncement) => a.deduplication_key === id
        );

        if (found) {
          setAnnouncement(found);
          // Determine tier: if source_url is present, user is premium
          setTier(found.source_url !== undefined ? 'premium' : 'free');
        } else {
          // Fetch with larger limit to try to find the announcement
          const broadResponse = await fetch(
            `/api/announcements?page=1&limit=100`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (broadResponse.ok) {
            const broadResult = await broadResponse.json();
            const broadFound = broadResult.data?.find(
              (a: MaskedAnnouncement) => a.deduplication_key === id
            );

            if (broadFound) {
              setAnnouncement(broadFound);
              setTier(broadFound.source_url !== undefined ? 'premium' : 'free');
            } else {
              setError('Announcement not found');
            }
          } else {
            setError('Failed to load announcement');
          }
        }
      } catch (err) {
        setError('Failed to load announcement');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchAnnouncement();
    }
  }, [params.id]);

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
