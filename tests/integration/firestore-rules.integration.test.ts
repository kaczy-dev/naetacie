/**
 * Integration tests for Firestore Security Rules
 *
 * Tests the security rules defined in firestore.rules using the
 * Firebase Rules Unit Testing library with the Firestore emulator.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  setLogLevel,
  Timestamp,
} from 'firebase/firestore';

// Suppress Firestore logs in test output
setLogLevel('error');

const PROJECT_ID = 'firestore-rules-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;

/** Helper: Create a Firestore Timestamp representing N hours ago */
function hoursAgo(hours: number): Timestamp {
  const ms = Date.now() - hours * 60 * 60 * 1000;
  return Timestamp.fromMillis(ms);
}

/** Helper: Check if the Firestore emulator is reachable */
async function isEmulatorRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/`);
    return response.ok || response.status === 200 || response.status === 404;
  } catch {
    return false;
  }
}

describe('Firestore Security Rules Integration', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const emulatorUp = await isEmulatorRunning();
    if (!emulatorUp) {
      console.warn(
        '\n⚠️  Firestore emulator is not running on port 8080.\n' +
          '   Start it with: firebase emulators:start --only firestore\n' +
          '   Skipping Firestore rules integration tests.\n'
      );
      return;
    }

    const rules = readFileSync(RULES_PATH, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async (context) => {
    if (!testEnv) {
      context.skip();
      return;
    }
    await testEnv.clearFirestore();
  });

  // ─────────────────────────────────────────────────────────
  // Requirement 8.1: Guest (unauthenticated) read access
  // ─────────────────────────────────────────────────────────

  describe('Requirement 8.1: Unauthenticated read access to announcements', () => {
    it('allows unauthenticated read of announcements older than 48 hours', async () => {
      // Seed data: announcement scraped 72 hours ago
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'announcements', 'old-announcement'), {
          title: 'Old Listing',
          scraped_at: hoursAgo(72),
          source_portal: 'olx',
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, 'announcements', 'old-announcement');

      await assertSucceeds(getDoc(docRef));
    });

    it('denies unauthenticated read of announcements newer than 48 hours', async () => {
      // Seed data: announcement scraped 24 hours ago
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'announcements', 'new-announcement'), {
          title: 'New Listing',
          scraped_at: hoursAgo(24),
          source_portal: 'olx',
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, 'announcements', 'new-announcement');

      await assertFails(getDoc(docRef));
    });

    it('denies unauthenticated read of announcements scraped exactly at the 48h boundary', async () => {
      // Seed data: announcement scraped exactly 47 hours ago (just under 48h)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'announcements', 'boundary-announcement'), {
          title: 'Boundary Listing',
          scraped_at: hoursAgo(47),
          source_portal: 'olx',
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, 'announcements', 'boundary-announcement');

      await assertFails(getDoc(docRef));
    });
  });

  // ─────────────────────────────────────────────────────────
  // Requirement 8.2: Authenticated tier-based read access
  // ─────────────────────────────────────────────────────────

  describe('Requirement 8.2: Authenticated tier-based read access', () => {
    it('allows premium users to read announcements newer than 48 hours', async () => {
      const userId = 'premium-user-1';

      // Seed: user profile with tier=premium and a recent announcement
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'premium@test.com',
          tier: 'premium',
        });
        await setDoc(doc(db, 'announcements', 'recent-ad'), {
          title: 'Recent Premium Listing',
          scraped_at: hoursAgo(12),
          source_portal: 'olx',
        });
      });

      const premiumDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(premiumDb, 'announcements', 'recent-ad');

      await assertSucceeds(getDoc(docRef));
    });

    it('allows premium users to read announcements older than 48 hours', async () => {
      const userId = 'premium-user-2';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'premium2@test.com',
          tier: 'premium',
        });
        await setDoc(doc(db, 'announcements', 'old-ad-premium'), {
          title: 'Old Premium Listing',
          scraped_at: hoursAgo(100),
          source_portal: 'oferteo',
        });
      });

      const premiumDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(premiumDb, 'announcements', 'old-ad-premium');

      await assertSucceeds(getDoc(docRef));
    });

    it('denies free-tier users from reading announcements newer than 48 hours', async () => {
      const userId = 'free-user-1';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'free@test.com',
          tier: 'free',
        });
        await setDoc(doc(db, 'announcements', 'recent-ad-free'), {
          title: 'Recent Free Listing',
          scraped_at: hoursAgo(6),
          source_portal: 'olx',
        });
      });

      const freeDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(freeDb, 'announcements', 'recent-ad-free');

      await assertFails(getDoc(docRef));
    });

    it('allows free-tier users to read announcements older than 48 hours', async () => {
      const userId = 'free-user-2';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'free2@test.com',
          tier: 'free',
        });
        await setDoc(doc(db, 'announcements', 'old-ad-free'), {
          title: 'Old Free Listing',
          scraped_at: hoursAgo(96),
          source_portal: 'oferteo',
        });
      });

      const freeDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(freeDb, 'announcements', 'old-ad-free');

      await assertSucceeds(getDoc(docRef));
    });
  });

  // ─────────────────────────────────────────────────────────
  // Requirement 8.3: Write denial on announcements and geo_cache
  // ─────────────────────────────────────────────────────────

  describe('Requirement 8.3: Write denial on announcements and geo_cache', () => {
    it('denies unauthenticated create on announcements', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, 'announcements', 'new-ad-write');

      await assertFails(
        setDoc(docRef, {
          title: 'Malicious Write',
          scraped_at: hoursAgo(100),
          source_portal: 'olx',
        })
      );
    });

    it('denies authenticated create on announcements', async () => {
      const userId = 'write-user-1';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'writer@test.com',
          tier: 'premium',
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'announcements', 'attempted-create');

      await assertFails(
        setDoc(docRef, {
          title: 'Attempted Create',
          scraped_at: hoursAgo(100),
          source_portal: 'olx',
        })
      );
    });

    it('denies authenticated update on announcements', async () => {
      const userId = 'write-user-2';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'writer2@test.com',
          tier: 'premium',
        });
        await setDoc(doc(db, 'announcements', 'existing-ad'), {
          title: 'Existing Ad',
          scraped_at: hoursAgo(100),
          source_portal: 'olx',
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'announcements', 'existing-ad');

      await assertFails(updateDoc(docRef, { title: 'Modified Title' }));
    });

    it('denies authenticated delete on announcements', async () => {
      const userId = 'write-user-3';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: 'writer3@test.com',
          tier: 'premium',
        });
        await setDoc(doc(db, 'announcements', 'delete-target'), {
          title: 'Delete Target',
          scraped_at: hoursAgo(100),
          source_portal: 'olx',
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'announcements', 'delete-target');

      await assertFails(deleteDoc(docRef));
    });

    it('denies unauthenticated write on geo_cache', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, 'geo_cache', 'cache-entry');

      await assertFails(
        setDoc(docRef, {
          address: 'ul. Testowa 1',
          lat: 53.43,
          lng: 14.55,
        })
      );
    });

    it('denies authenticated write on geo_cache', async () => {
      const userId = 'geo-writer';
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'geo_cache', 'cache-entry-auth');

      await assertFails(
        setDoc(docRef, {
          address: 'ul. Testowa 2',
          lat: 53.43,
          lng: 14.55,
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // Requirement 8.4: Profile field-level update restrictions
  // ─────────────────────────────────────────────────────────

  describe('Requirement 8.4: Profile field-level update restrictions', () => {
    const userId = 'profile-user';
    const profileData = {
      uid: userId,
      email: 'profile@test.com',
      display_name: 'Test User',
      tier: 'free',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      notification_prefs: null,
    };

    beforeEach(async () => {
      // Seed the user profile
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', userId), profileData);
      });
    });

    it('allows user to read their own profile', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertSucceeds(getDoc(docRef));
    });

    it('denies user from reading another user profile', async () => {
      const otherUserId = 'other-user';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', otherUserId), {
          uid: otherUserId,
          email: 'other@test.com',
          tier: 'free',
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', otherUserId);

      await assertFails(getDoc(docRef));
    });

    it('allows user to create their own profile', async () => {
      const newUserId = 'new-user';
      const authDb = testEnv.authenticatedContext(newUserId).firestore();
      const docRef = doc(authDb, 'users', newUserId);

      await assertSucceeds(
        setDoc(docRef, {
          uid: newUserId,
          email: 'new@test.com',
          display_name: 'New User',
          tier: 'free',
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
          notification_prefs: null,
        })
      );
    });

    it('denies user from creating a profile for another user', async () => {
      const attackerId = 'attacker';
      const victimId = 'victim';

      const authDb = testEnv.authenticatedContext(attackerId).firestore();
      const docRef = doc(authDb, 'users', victimId);

      await assertFails(
        setDoc(docRef, {
          uid: victimId,
          email: 'victim@test.com',
          display_name: 'Victim',
          tier: 'free',
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
          notification_prefs: null,
        })
      );
    });

    it('allows user to update display_name', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertSucceeds(
        setDoc(docRef, { ...profileData, display_name: 'Updated Name', updated_at: Timestamp.now() })
      );
    });

    it('allows user to update notification_prefs', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertSucceeds(
        setDoc(docRef, {
          ...profileData,
          notification_prefs: { email: true, push: false },
          updated_at: Timestamp.now(),
        })
      );
    });

    it('allows user to update updated_at', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertSucceeds(
        setDoc(docRef, { ...profileData, updated_at: Timestamp.now() })
      );
    });

    it('denies user from modifying uid field', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertFails(
        setDoc(docRef, { ...profileData, uid: 'different-uid', updated_at: Timestamp.now() })
      );
    });

    it('denies user from modifying email field', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertFails(
        setDoc(docRef, { ...profileData, email: 'changed@test.com', updated_at: Timestamp.now() })
      );
    });

    it('denies user from modifying tier field', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertFails(
        setDoc(docRef, { ...profileData, tier: 'premium', updated_at: Timestamp.now() })
      );
    });

    it('denies user from modifying created_at field', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertFails(
        setDoc(docRef, {
          ...profileData,
          created_at: Timestamp.fromMillis(0),
          updated_at: Timestamp.now(),
        })
      );
    });

    it('denies user from deleting their own profile', async () => {
      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'users', userId);

      await assertFails(deleteDoc(docRef));
    });
  });

  // ─────────────────────────────────────────────────────────
  // Requirement 8.5: geo_cache denied from client SDKs
  // ─────────────────────────────────────────────────────────

  describe('Requirement 8.5: geo_cache denied from all client SDKs', () => {
    it('denies unauthenticated read on geo_cache', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'geo_cache', 'test-cache'), {
          address: 'ul. Testowa 5',
          lat: 53.43,
          lng: 14.55,
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, 'geo_cache', 'test-cache');

      await assertFails(getDoc(docRef));
    });

    it('denies authenticated read on geo_cache', async () => {
      const userId = 'geo-reader';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'geo_cache', 'test-cache-auth'), {
          address: 'ul. Testowa 6',
          lat: 53.43,
          lng: 14.55,
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'geo_cache', 'test-cache-auth');

      await assertFails(getDoc(docRef));
    });

    it('denies authenticated update on geo_cache', async () => {
      const userId = 'geo-updater';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'geo_cache', 'update-cache'), {
          address: 'ul. Testowa 7',
          lat: 53.43,
          lng: 14.55,
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'geo_cache', 'update-cache');

      await assertFails(updateDoc(docRef, { lat: 99.99 }));
    });

    it('denies authenticated delete on geo_cache', async () => {
      const userId = 'geo-deleter';

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'geo_cache', 'delete-cache'), {
          address: 'ul. Testowa 8',
          lat: 53.43,
          lng: 14.55,
        });
      });

      const authDb = testEnv.authenticatedContext(userId).firestore();
      const docRef = doc(authDb, 'geo_cache', 'delete-cache');

      await assertFails(deleteDoc(docRef));
    });
  });
});
