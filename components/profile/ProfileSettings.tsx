'use client';

/**
 * Profile/Settings page component.
 * Contains user account info and theme toggle for dark mode.
 *
 * Validates: Requirement 13.5
 */

import { useAuth } from '@/lib/auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export function ProfileSettings() {
  const { user, profile, signOut } = useAuth();

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Settings</h2>

      {/* User info section */}
      {user && (
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Account</h3>
          <div style={infoCardStyle}>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Email</span>
              <span style={infoValueStyle}>{user.email}</span>
            </div>
            {profile?.display_name && (
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Name</span>
                <span style={infoValueStyle}>{profile.display_name}</span>
              </div>
            )}
            {profile?.tier && (
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Plan</span>
                <span style={tierBadgeStyle}>
                  {profile.tier === 'premium' ? '⭐ Premium' : 'Free'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Theme toggle section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Display</h3>
        <ThemeToggle />
      </div>

      {/* Export applications section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Aplikacje i Raporty</h3>
        <div style={infoCardStyle}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            Pobierz podsumowanie wszystkich wysłanych aplikacji (dla Urzędu Pracy lub rejestru własnego).
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                const stored = localStorage.getItem('naetacie_applications');
                const apps = stored ? JSON.parse(stored) : {};
                const keys = Object.keys(apps);
                
                if (keys.length === 0) {
                  alert('Brak zarejestrowanych aplikacji do wyeksportowania.');
                  return;
                }

                let csv = 'ID Ogłoszenia;Status;Data zmiany\n';
                keys.forEach((k) => {
                  csv += `"${k}";"${apps[k].status || 'Aplikowano'}";"${apps[k].updatedAt || new Date().toISOString()}"\n`;
                });

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `naetacie_raport_aplikacji_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
              } catch (e) {
                alert('Błąd podczas generowania raportu.');
              }
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-primary)',
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📄 Pobierz raport moich aplikacji (CSV)
          </button>
        </div>
      </div>

      {/* Sign out button */}
      {user && (
        <div style={sectionStyle}>
          <button type="button" onClick={() => signOut()} style={signOutButtonStyle}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// --- Styles ---

const containerStyle: React.CSSProperties = {
  padding: 'var(--spacing-4)',
  maxWidth: '600px',
  margin: '0 auto',
  fontFamily: 'var(--font-family)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-h2)',
  fontWeight: 'var(--font-weight-bold)' as unknown as number,
  color: 'var(--color-text-primary)',
  margin: '0 0 var(--spacing-6) 0',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 'var(--spacing-6)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-body-sm)',
  fontWeight: 'var(--font-weight-semibold)' as unknown as number,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 var(--spacing-3) 0',
};

const infoCardStyle: React.CSSProperties = {
  padding: 'var(--spacing-4)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'var(--spacing-2) 0',
  borderBottom: '1px solid var(--color-border)',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-body-sm)',
  color: 'var(--color-text-secondary)',
};

const infoValueStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-body-sm)',
  color: 'var(--color-text-primary)',
  fontWeight: 'var(--font-weight-medium)' as unknown as number,
};

const tierBadgeStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-caption)',
  fontWeight: 'var(--font-weight-medium)' as unknown as number,
  color: 'var(--color-primary)',
  backgroundColor: 'var(--color-surface-raised)',
  padding: '2px 8px',
  borderRadius: 'var(--radius-full)',
};

const signOutButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--spacing-3) var(--spacing-4)',
  border: '1px solid var(--color-error)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'transparent',
  color: 'var(--color-error)',
  fontSize: 'var(--font-size-body)',
  fontWeight: 'var(--font-weight-medium)' as unknown as number,
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
  transition: 'background-color var(--transition-fast)',
};
