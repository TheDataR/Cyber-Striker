import { EquippedCosmetics, WeaponClassKey } from './types';
import { DEFAULT_EQUIPPED_COSMETICS } from './constants';

export interface PlayerStats {
  kills: number;
  deaths: number;
  wins: number;
  matchesPlayed: number;
  score: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  callsign: string;
  password?: string;
  email?: string;
  isAdmin?: boolean;
  isGuest: boolean;
  level: number;
  xp: number;
  cscCoins: number;
  ownedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
  stats: PlayerStats;
  preferredWeaponClass: WeaponClassKey;
  createdAt: number;
  lastLogin: number;
}

const STORAGE_ACCOUNTS = 'cyberStriker_accounts_v2';
const STORAGE_ACTIVE_ID = 'cyberStriker_active_userId_v2';

export function createDefaultGuestProfile(): PlayerProfile {
  const randTag = Math.floor(100 + Math.random() * 900);
  return {
    id: `guest_${Date.now()}`,
    username: `Guest_${randTag}`,
    callsign: `GUEST_${randTag}`,
    isGuest: true,
    level: 1,
    xp: 0,
    cscCoins: 30,
    ownedCosmetics: ['weapon_default', 'op_default', 'exp_default', 'glove_default'],
    equippedCosmetics: { ...DEFAULT_EQUIPPED_COSMETICS },
    stats: {
      kills: 0,
      deaths: 0,
      wins: 0,
      matchesPlayed: 0,
      score: 0
    },
    preferredWeaponClass: 'ar',
    createdAt: Date.now(),
    lastLogin: Date.now()
  };
}

export function getAllSavedAccounts(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        // Ensure dataruruaa@gmail.com is always admin
        return list.map((acc: PlayerProfile) => {
          if (acc.username.toLowerCase() === 'dataruruaa@gmail.com' || acc.email?.toLowerCase() === 'dataruruaa@gmail.com') {
            return { ...acc, isAdmin: true, email: 'dataruruaa@gmail.com' };
          }
          return acc;
        });
      }
    }
  } catch (err) {
    console.error('Failed reading accounts', err);
  }
  return [];
}

export function saveAccountsList(accounts: PlayerProfile[]): void {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed saving accounts', err);
  }
}

export function getActiveUserSession(): PlayerProfile {
  try {
    const activeId = localStorage.getItem(STORAGE_ACTIVE_ID);
    if (activeId) {
      const accounts = getAllSavedAccounts();
      const found = accounts.find((a) => a.id === activeId);
      if (found) {
        if (found.username.toLowerCase() === 'dataruruaa@gmail.com' || found.email?.toLowerCase() === 'dataruruaa@gmail.com') {
          found.isAdmin = true;
          found.email = 'dataruruaa@gmail.com';
        }
        return found;
      }
    }
  } catch {}
  return createDefaultGuestProfile();
}

export function setActiveUserSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_ID);
    }
  } catch {}
}

export function registerAccount(
  username: string,
  callsign: string,
  password: string,
  currentSessionData?: Partial<PlayerProfile>
): { success: boolean; user?: PlayerProfile; error?: string } {
  const cleanUser = username.trim();
  const cleanSign = (callsign || cleanUser).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const cleanPass = password.trim();

  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const accounts = getAllSavedAccounts();
  const existing = accounts.find(
    (a) => a.username.toLowerCase() === cleanUser.toLowerCase()
  );
  if (existing) {
    return { success: false, error: 'An operative account with this username already exists.' };
  }

  const isAdminUser = cleanUser.toLowerCase() === 'dataruruaa@gmail.com';
  const emailVal = isAdminUser ? 'dataruruaa@gmail.com' : (cleanUser.includes('@') ? cleanUser : undefined);

  // Preserve existing coins or bonus from session if any
  const starterCoins = Math.max(50, currentSessionData?.cscCoins ?? 50);
  const ownedCosmetics = Array.from(
    new Set([
      'weapon_default',
      'op_default',
      'exp_default',
      'glove_default',
      ...(currentSessionData?.ownedCosmetics || [])
    ])
  );

  const newUser: PlayerProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUser,
    callsign: cleanSign || `OPERATOR_${cleanUser.slice(0, 4).toUpperCase()}`,
    password: cleanPass,
    email: emailVal,
    isAdmin: isAdminUser,
    isGuest: false,
    level: currentSessionData?.level ?? (isAdminUser ? 50 : 1),
    xp: currentSessionData?.xp ?? (isAdminUser ? 25000 : 0),
    cscCoins: isAdminUser ? 9999 : starterCoins,
    ownedCosmetics,
    equippedCosmetics: currentSessionData?.equippedCosmetics || { ...DEFAULT_EQUIPPED_COSMETICS },
    stats: currentSessionData?.stats || {
      kills: 0,
      deaths: 0,
      wins: 0,
      matchesPlayed: 0,
      score: 0
    },
    preferredWeaponClass: currentSessionData?.preferredWeaponClass || 'ar',
    createdAt: Date.now(),
    lastLogin: Date.now()
  };

  accounts.push(newUser);
  saveAccountsList(accounts);
  setActiveUserSessionId(newUser.id);

  return { success: true, user: newUser };
}

export function loginAccount(
  username: string,
  password: string
): { success: boolean; user?: PlayerProfile; error?: string } {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  const accounts = getAllSavedAccounts();
  let found = accounts.find(
    (a) => a.username.toLowerCase() === cleanUser || a.callsign.toLowerCase() === cleanUser || a.email?.toLowerCase() === cleanUser
  );

  // If dataruruaa@gmail.com logs in and doesn't exist yet, auto-register them as admin!
  if (!found && cleanUser === 'dataruruaa@gmail.com') {
    const regRes = registerAccount('dataruruaa@gmail.com', 'ADMIN', cleanPass);
    if (regRes.success && regRes.user) {
      found = regRes.user;
    }
  }

  if (!found) {
    return { success: false, error: 'Account not found. Please check your username or sign up.' };
  }
  if (found.password !== cleanPass) {
    return { success: false, error: 'Incorrect password for this operator account.' };
  }

  if (found.username.toLowerCase() === 'dataruruaa@gmail.com' || found.email?.toLowerCase() === 'dataruruaa@gmail.com') {
    found.isAdmin = true;
    found.email = 'dataruruaa@gmail.com';
  }

  found.lastLogin = Date.now();
  saveAccountsList(accounts);
  setActiveUserSessionId(found.id);

  return { success: true, user: found };
}

export function saveUserProfile(user: PlayerProfile): void {
  if (user.isGuest) {
    // Guest profiles are ephemeral; do not permanently save to registered accounts list
    return;
  }
  const accounts = getAllSavedAccounts();
  const index = accounts.findIndex((a) => a.id === user.id);
  if (index !== -1) {
    accounts[index] = { ...user, lastLogin: Date.now() };
  } else {
    accounts.push(user);
  }
  saveAccountsList(accounts);
}

export function logoutAccount(): PlayerProfile {
  setActiveUserSessionId(null);
  return createDefaultGuestProfile();
}
