import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Crosshair,
  Settings as SettingsIcon,
  Play,
  RotateCcw,
  Volume2,
  Shield,
  Zap,
  Target,
  Flame,
  Award,
  LogOut,
  Sliders,
  Eye,
  Info,
  ArrowLeft,
  Check,
  Undo2,
  Swords,
  Flag,
  Heart,
  Plane,
  Tablet,
  Radiation,
  Users,
  Plus,
  Minus,
  Monitor,
  Coins,
  ShoppingBag,
  Trophy,
  Bomb,
  Sparkles,
  X,
  ChevronRight,
  Timer,
  Clock,
  Globe,
  Server,
  Radio,
  Bot,
  User,
  Lock,
  ShieldCheck,
  Music,
  VolumeX,
  AlertTriangle
} from 'lucide-react';
import { GameEngine } from './game/engine';
import { soundManager } from './game/sound';
import {
  DEFAULT_SETTINGS,
  MAP_CONFIGS,
  WEAPON_CLASSES,
  WEAPONS_FIXED,
  COSMETIC_CATALOG,
  DEFAULT_EQUIPPED_COSMETICS
} from './game/constants';
import {
  DomPointState,
  GameSettings,
  KillFeedItem,
  MapKey,
  StreakAnnouncement,
  WeaponClassKey,
  ScoreboardEntry,
  MatchEndResult,
  CosmeticItem,
  EquippedCosmetics,
  ServerListing
} from './game/types';
import { ScoreboardView } from './components/ScoreboardView';
import { CosmeticsShopView } from './components/CosmeticsShopView';
import { MatchEndModal } from './components/MatchEndModal';
import { ServerBrowserView, getSmartnessTag } from './components/ServerBrowserView';
import { AuthModal } from './components/AuthModal';
import {
  getActiveUserSession,
  saveUserProfile,
  PlayerProfile
} from './game/auth';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Operator Account Profile & Authentication
  const [currentUser, setCurrentUser] = useState<PlayerProfile>(() => getActiveUserSession());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  const [inGame, setInGame] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDead, setIsDead] = useState(false);

  // Futuristic Rock Menu Music & Edge Barrier Warning States
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(true);
  const [edgeWarning, setEdgeWarning] = useState<{ active: boolean; dist: number }>({ active: false, dist: 0 });

  const [menuTab, setMenuTab] = useState<'play' | 'servers' | 'shop' | 'settings' | 'crosshair'>('play');
  const [pauseTab, setPauseTab] = useState<'resume' | 'loadout' | 'shop' | 'scoreboard' | 'settings' | 'map' | 'leave'>('resume');

  const [weaponClass, setWeaponClass] = useState<WeaponClassKey>(() => {
    const initialUser = getActiveUserSession();
    if (initialUser.isGuest) return 'ar';
    return initialUser.preferredWeaponClass || 'ar';
  });
  const [weaponSlot, setWeaponSlot] = useState<number>(1);
  const [mapKey, setMapKey] = useState<MapKey>('neoncity');
  const [gameMode, setGameMode] = useState<'ffa' | 'tdm' | 'dom' | 'ctf'>('ffa');

  // CSC Coins Currency Persistence
  const COINS_STORAGE_KEY = 'cyberStrikerCscCoins_v1';
  const [cscCoins, setCscCoins] = useState<number>(() => {
    return currentUser.cscCoins ?? 30;
  });

  const updateCoins = (amountOrUpdater: number | ((prev: number) => number)) => {
    setCscCoins((prev) => {
      const next = typeof amountOrUpdater === 'function' ? amountOrUpdater(prev) : amountOrUpdater;
      try {
        localStorage.setItem(COINS_STORAGE_KEY, next.toString());
      } catch {}
      setCurrentUser((curr) => {
        const updated = { ...curr, cscCoins: next };
        if (!updated.isGuest) {
          saveUserProfile(updated);
        }
        return updated;
      });
      return next;
    });
  };

  // Cosmetics Persistence
  const COSMETICS_STORAGE_KEY = 'cyberStrikerCosmetics_v1';
  const OWNED_STORAGE_KEY = 'cyberStrikerOwnedCosmetics_v1';
  const [equippedCosmetics, setEquippedCosmetics] = useState<EquippedCosmetics>(() => {
    return currentUser.equippedCosmetics || DEFAULT_EQUIPPED_COSMETICS;
  });
  const [ownedCosmetics, setOwnedCosmetics] = useState<string[]>(() => {
    return currentUser.ownedCosmetics || ['weapon_default', 'op_default', 'exp_default', 'glove_default'];
  });
  const [shopCategory, setShopCategory] = useState<'all' | 'weapon' | 'operative' | 'explosive' | 'gloves'>('all');

  // Scoreboard & Match End Result
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [scoreboardEntries, setScoreboardEntries] = useState<ScoreboardEntry[]>([]);
  const [matchResult, setMatchResult] = useState<MatchEndResult | null>(null);

  // Health increased to 150 (bigger health pool)
  const [health, setHealth] = useState(150);
  const [maxHealth, setMaxHealth] = useState(150);
  const [ammoCur, setAmmoCur] = useState<number | string>(30);
  const [ammoMax, setAmmoMax] = useState<number | string>(30);
  const [score, setScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);

  // Online Multiplayer state & Online Server Maker Bot Options
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [callsign, setCallsign] = useState<string>(() => currentUser.callsign || 'CYBER_VIPER');

  const handleUserChange = (newUser: PlayerProfile) => {
    setCurrentUser(newUser);
    setCallsign(newUser.callsign);
    setCscCoins(newUser.cscCoins);
    setOwnedCosmetics(newUser.ownedCosmetics);
    setEquippedCosmetics(newUser.equippedCosmetics);
    if (newUser.isGuest) {
      if (weaponClass === 'shotgun' || weaponClass === 'sniper') {
        setWeaponClass('ar');
        if (engineRef.current) engineRef.current.selectWeaponClass('ar');
      }
      if (menuTab !== 'play' && menuTab !== 'servers') {
        setMenuTab('play');
      }
    }
    if (engineRef.current) {
      engineRef.current.setPlayerCallsign(newUser.callsign);
      engineRef.current.setEquippedCosmetics(newUser.equippedCosmetics);
    }
  };
  const [onlineRoom, setOnlineRoom] = useState<string>('CyberArena1');
  const [onlineTeam, setOnlineTeam] = useState<'blue' | 'red'>('blue');
  const [offlineTeam, setOfflineTeam] = useState<'blue' | 'red'>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOfflineTeam');
      if (saved === 'red' || saved === 'blue') return saved;
    } catch {}
    return 'blue';
  });

  const handleSetOfflineTeam = (team: 'blue' | 'red') => {
    setOfflineTeam(team);
    try {
      localStorage.setItem('cyberStrikerOfflineTeam', team);
    } catch {}
    if (engineRef.current) {
      engineRef.current.setPlayerTeam(team);
    }
  };

  const effectiveTeam = isOnlineMode ? onlineTeam : offlineTeam;
  const [onlinePing, setOnlinePing] = useState<number>(0);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState<number>(1);
  const [onlineEnableBots, setOnlineEnableBots] = useState<boolean>(true);
  const [onlineBotCount, setOnlineBotCount] = useState<number>(6);

  // Match Duration Settings (1 to 30 minutes)
  const [offlineMatchDuration, setOfflineMatchDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOfflineMatchDuration');
      if (saved) return Math.min(30, Math.max(1, parseInt(saved, 10)));
    } catch {}
    return 5;
  });
  const [onlineMatchDuration, setOnlineMatchDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOnlineMatchDuration');
      if (saved) return Math.min(30, Math.max(1, parseInt(saved, 10)));
    } catch {}
    return 5;
  });
  const [matchTimeRemaining, setMatchTimeRemaining] = useState<number>(300);
  const [matchTotalSeconds, setMatchTotalSeconds] = useState<number>(300);

  const formatMatchTime = (totalSeconds: number) => {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetOfflineMatchDuration = (mins: number) => {
    const clamped = Math.min(30, Math.max(1, Math.round(mins)));
    setOfflineMatchDuration(clamped);
    try {
      localStorage.setItem('cyberStrikerOfflineMatchDuration', clamped.toString());
    } catch {}
  };

  const handleSetOnlineMatchDuration = (mins: number) => {
    const clamped = Math.min(30, Math.max(1, Math.round(mins)));
    setOnlineMatchDuration(clamped);
    try {
      localStorage.setItem('cyberStrikerOnlineMatchDuration', clamped.toString());
    } catch {}
  };

  // Higher match target scores (prevents matches from terminating prematurely)
  const [targetScoreTdm, setTargetScoreTdm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerTargetScoreTdm');
      if (saved) return Math.max(200, parseInt(saved, 10));
    } catch {}
    return 750;
  });
  const [targetScoreDom, setTargetScoreDom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerTargetScoreDom');
      if (saved) return Math.max(200, parseInt(saved, 10));
    } catch {}
    return 500;
  });
  const [targetScoreFfa, setTargetScoreFfa] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerTargetScoreFfa');
      if (saved) return Math.max(500, parseInt(saved, 10));
    } catch {}
    return 3500;
  });

  const handleSetTargetScoreTdm = (val: number) => {
    const clamped = Math.max(200, Math.min(3000, Math.round(val)));
    setTargetScoreTdm(clamped);
    try {
      localStorage.setItem('cyberStrikerTargetScoreTdm', clamped.toString());
    } catch {}
    if (engineRef.current) engineRef.current.targetScoreTdm = clamped;
  };

  const handleSetTargetScoreDom = (val: number) => {
    const clamped = Math.max(200, Math.min(2500, Math.round(val)));
    setTargetScoreDom(clamped);
    try {
      localStorage.setItem('cyberStrikerTargetScoreDom', clamped.toString());
    } catch {}
    if (engineRef.current) engineRef.current.targetScoreDom = clamped;
  };

  const handleSetTargetScoreFfa = (val: number) => {
    const clamped = Math.max(1000, Math.min(10000, Math.round(val)));
    setTargetScoreFfa(clamped);
    try {
      localStorage.setItem('cyberStrikerTargetScoreFfa', clamped.toString());
    } catch {}
    if (engineRef.current) engineRef.current.targetScoreFfa = clamped;
  };

  // Bot Smartness (1 to 10, 10 being hardest) - controlled separately for Ally and Enemy bots
  const [offlineAllySmartness, setOfflineAllySmartness] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOfflineAllySmartness');
      if (saved) return Math.min(10, Math.max(1, parseInt(saved, 10)));
    } catch {}
    return 5;
  });
  const [offlineEnemySmartness, setOfflineEnemySmartness] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOfflineEnemySmartness');
      if (saved) return Math.min(10, Math.max(1, parseInt(saved, 10)));
    } catch {}
    return 6;
  });
  const [onlineAllySmartness, setOnlineAllySmartness] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOnlineAllySmartness');
      if (saved) return Math.min(10, Math.max(1, parseInt(saved, 10)));
    } catch {}
    return 5;
  });
  const [onlineEnemySmartness, setOnlineEnemySmartness] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cyberStrikerOnlineEnemySmartness');
      if (saved) return Math.min(10, Math.max(1, parseInt(saved, 10)));
    } catch {}
    return 6;
  });

  const handleSetOfflineAllySmartness = (lvl: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(lvl)));
    setOfflineAllySmartness(clamped);
    try {
      localStorage.setItem('cyberStrikerOfflineAllySmartness', clamped.toString());
    } catch {}
    if (engineRef.current) {
      engineRef.current.setBotSmartness(clamped, offlineEnemySmartness);
    }
  };

  const handleSetOfflineEnemySmartness = (lvl: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(lvl)));
    setOfflineEnemySmartness(clamped);
    try {
      localStorage.setItem('cyberStrikerOfflineEnemySmartness', clamped.toString());
    } catch {}
    if (engineRef.current) {
      engineRef.current.setBotSmartness(offlineAllySmartness, clamped);
    }
  };

  const handleSetOnlineAllySmartness = (lvl: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(lvl)));
    setOnlineAllySmartness(clamped);
    try {
      localStorage.setItem('cyberStrikerOnlineAllySmartness', clamped.toString());
    } catch {}
  };

  const handleSetOnlineEnemySmartness = (lvl: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(lvl)));
    setOnlineEnemySmartness(clamped);
    try {
      localStorage.setItem('cyberStrikerOnlineEnemySmartness', clamped.toString());
    } catch {}
  };

  const [scopeAmount, setScopeAmount] = useState(0);
  const [aimLineAmount, setAimLineAmount] = useState(0);

  const [hitmarker, setHitmarker] = useState<{ active: boolean; isKill: boolean }>({ active: false, isKill: false });
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [fps, setFps] = useState(0);
  const [spawnShield, setSpawnShield] = useState<number>(3.0);
  const [shieldDeflect, setShieldDeflect] = useState<boolean>(false);

  const [flashType, setFlashType] = useState<'none' | 'flash' | 'damage-flash' | 'slash-flash' | 'emp-blind'>('none');
  const flashTimeout = useRef<number | null>(null);

  // Domination & Health state
  const [domPoints, setDomPoints] = useState<DomPointState[]>([]);
  const [healNotice, setHealNotice] = useState<{ amount: number; reason: string } | null>(null);
  const healNoticeTimer = useRef<number | null>(null);
  const [inCover, setInCover] = useState<boolean>(false);
  const [isCoverHealing, setIsCoverHealing] = useState<boolean>(false);

  // Streaks, Achievements & Server Bots
  const [activeAchievement, setActiveAchievement] = useState<StreakAnnouncement | null>(null);
  const achievementTimeout = useRef<number | null>(null);
  const [tabletStrikeReady, setTabletStrikeReady] = useState<boolean>(false);
  const [nukeCountdown, setNukeCountdown] = useState<number | null>(null);
  const [serverBotCount, setServerBotCount] = useState<number>(12);

  // Full Settings Persistence Key
  const SETTINGS_STORAGE_KEY = 'cyberStrikerFullSettings_v2';

  // Load all settings from localStorage
  const loadSavedSettings = (): GameSettings => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      const savedUi = localStorage.getItem('cyberStrikerUIColor');
      const savedCx = localStorage.getItem('cyberStrikerCxColor');
      if (savedUi || savedCx) {
        return {
          ...DEFAULT_SETTINGS,
          uiColor: savedUi || DEFAULT_SETTINGS.uiColor,
          cxColor: savedCx || DEFAULT_SETTINGS.cxColor
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  };

  // Applied/committed settings
  const [settings, setSettings] = useState<GameSettings>(loadSavedSettings);

  // Draft settings being edited in Settings/Crosshair menus
  const [draftSettings, setDraftSettings] = useState<GameSettings>(loadSavedSettings);

  // Notice notification when settings are saved or reverted
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const saveNoticeTimer = useRef<number | null>(null);

  // Check if draft has unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(draftSettings) !== JSON.stringify(settings);
  }, [draftSettings, settings]);

  // Apply & Save settings permanently
  const handleApplySettings = () => {
    setSettings({ ...draftSettings });
    if (draftSettings.matchDuration) {
      handleSetOfflineMatchDuration(draftSettings.matchDuration);
    }
    if (draftSettings.allyBotSmartness) {
      handleSetOfflineAllySmartness(draftSettings.allyBotSmartness);
    }
    if (draftSettings.enemyBotSmartness) {
      handleSetOfflineEnemySmartness(draftSettings.enemyBotSmartness);
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(draftSettings));
      localStorage.setItem('cyberStrikerUIColor', draftSettings.uiColor);
      localStorage.setItem('cyberStrikerCxColor', draftSettings.cxColor);
    } catch {}

    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice('SETTINGS & CROSSHAIR SAVED & APPLIED!');
    saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 3000);
  };

  // Revert back to last saved settings
  const handleRevertSettings = () => {
    setDraftSettings({ ...settings });
    if (settings.matchDuration) {
      handleSetOfflineMatchDuration(settings.matchDuration);
    }
    if (settings.allyBotSmartness) {
      handleSetOfflineAllySmartness(settings.allyBotSmartness);
    }
    if (settings.enemyBotSmartness) {
      handleSetOfflineEnemySmartness(settings.enemyBotSmartness);
    }
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice('CHANGES DISCARDED / REVERTED');
    saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 2500);
  };

  // Back button: discard any accidental changes and go back to play tab
  const handleBackFromSettings = () => {
    setDraftSettings({ ...settings });
    setMenuTab('play');
    if (isPaused) setPauseTab('resume');
  };

  // Reset to default factory settings
  const handleResetDefaults = () => {
    setDraftSettings({ ...DEFAULT_SETTINGS });
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice('RESET TO DEFAULTS (CLICK APPLY TO SAVE)');
    saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 3000);
  };

  // Sync applied settings to CSS variables and engine
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', settings.uiScale.toString());
    root.style.setProperty('--primary-color', settings.uiColor);
    root.style.setProperty('--cx-c', settings.cxColor);
    root.style.setProperty('--cx-s', `${settings.cxSize}px`);
    root.style.setProperty('--cx-g', `${settings.cxGap}px`);
    root.style.setProperty('--cx-t', `${settings.cxThick}px`);

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}

    if (engineRef.current) {
      engineRef.current.applySettings(settings);
    }
  }, [settings]);

  // Initialize engine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, settings);
    engineRef.current = engine;

    engine.onHealthChange = (hp, maxHp) => {
      setHealth(hp);
      setMaxHealth(maxHp);
    };
    engine.onOnlinePlayerCount = (c) => setOnlinePlayerCount(c);
    engine.onOnlinePing = (p) => setOnlinePing(p);
    engine.onShieldChange = (sec) => setSpawnShield(sec);
    engine.onShieldHit = () => {
      setShieldDeflect(true);
      setTimeout(() => setShieldDeflect(false), 240);
    };
    engine.onAmmoChange = (cur, max) => {
      setAmmoCur(cur);
      setAmmoMax(max);
    };
    engine.onScoreChange = (sc, b, r) => {
      setScore(sc);
      setBlueScore(b);
      setRedScore(r);
    };
    engine.onDomUpdate = (pts, b, r) => {
      setDomPoints(pts);
      setBlueScore(b);
      setRedScore(r);
    };
    engine.onHeal = (amount, reason) => {
      setHealNotice({ amount, reason });
      if (healNoticeTimer.current) clearTimeout(healNoticeTimer.current);
      healNoticeTimer.current = window.setTimeout(() => setHealNotice(null), 1400);
    };
    engine.onCoverStatusChange = (cover, healing) => {
      setInCover(cover);
      setIsCoverHealing(healing);
    };
    engine.onAchievement = (announcement) => {
      setActiveAchievement(announcement);
      if (achievementTimeout.current) clearTimeout(achievementTimeout.current);
      achievementTimeout.current = window.setTimeout(() => setActiveAchievement(null), 3600);
    };
    engine.onTabletReadyChange = (ready) => {
      setTabletStrikeReady(ready);
    };
    engine.onNukeCountdown = (countdown) => {
      setNukeCountdown(countdown);
    };
    engine.onBotCountChange = (count) => {
      setServerBotCount(count);
    };
    engine.onScopeChange = (sc, al) => {
      setScopeAmount(sc);
      setAimLineAmount(al);
    };
    engine.onFpsUpdate = (f) => setFps(f);
    engine.onDeathChange = (dead) => setIsDead(dead);

    engine.onPauseChange = (paused) => {
      setIsPaused(paused);
      if (paused) setPauseTab('resume');
    };

    engine.onHitmarker = (isKill) => {
      setHitmarker({ active: true, isKill });
      setTimeout(() => {
        setHitmarker((prev) => (prev.isKill === isKill ? { active: false, isKill: false } : prev));
      }, isKill ? 220 : 110);
    };

    engine.onFlash = (type) => {
      setFlashType(type);
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = window.setTimeout(
        () => {
          setFlashType('none');
        },
        type === 'emp-blind' ? 2800 : type === 'slash-flash' ? 140 : 60
      );
    };

    engine.onWeaponSlotChange = (slot) => {
      setWeaponSlot(slot);
    };

    engine.onScoreboardUpdate = (entries) => {
      setScoreboardEntries(entries);
    };

    engine.onTimeRemainingUpdate = (secLeft, totalSec) => {
      setMatchTimeRemaining(secLeft);
      setMatchTotalSeconds(totalSec);
    };

    engine.onMatchEnd = (result) => {
      setMatchResult(result);
      if (result.coinsEarned > 0) {
        updateCoins((prev) => prev + result.coinsEarned);
      }
      setCurrentUser((prevUser) => {
        const localEntry = result.scoreboard.find((p) => p.isLocalPlayer);
        const playerKills = localEntry?.kills || 0;
        const playerDeaths = localEntry?.deaths || 0;
        const playerScore = localEntry?.score || 0;
        const wonMatch = result.playerRank === 1 || (result.winnerTeam && result.winnerTeam === effectiveTeam);

        const newXp = prevUser.xp + 150 + (result.coinsEarned * 25);
        const newLevel = Math.max(1, Math.floor(newXp / 1000) + 1);

        const updated: PlayerProfile = {
          ...prevUser,
          level: newLevel,
          xp: newXp,
          stats: {
            kills: prevUser.stats.kills + playerKills,
            deaths: prevUser.stats.deaths + playerDeaths,
            wins: prevUser.stats.wins + (wonMatch ? 1 : 0),
            matchesPlayed: prevUser.stats.matchesPlayed + 1,
            score: prevUser.stats.score + playerScore
          }
        };
        if (!updated.isGuest) {
          saveUserProfile(updated);
        }
        return updated;
      });
    };

    engine.onKillFeed = (item) => {
      setKillFeed((prev) => [...prev.slice(-4), item]);
      setTimeout(() => {
        setKillFeed((prev) => prev.filter((k) => k.id !== item.id));
      }, 3500);
    };

    engine.onEdgeWarning = (active, dist) => {
      setEdgeWarning({ active, dist });
    };

    return () => {
      engine.destroy();
    };
  }, []);

  // Futuristic Rock Menu Music Lifecycle
  useEffect(() => {
    if (!inGame) {
      if (isMusicPlaying) {
        soundManager.startMenuMusic();
      }
    } else {
      soundManager.stopMenuMusic();
    }
    return () => {
      soundManager.stopMenuMusic();
    };
  }, [inGame, isMusicPlaying]);

  const toggleMusic = () => {
    const isNowActive = soundManager.toggleMusicMute();
    setIsMusicPlaying(isNowActive);
    if (isNowActive && !inGame) {
      soundManager.startMenuMusic();
    }
  };

  // Sync equipped cosmetics to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setEquippedCosmetics(equippedCosmetics);
    }
  }, [equippedCosmetics]);

  // Tab key to toggle scoreboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        if (inGame && !matchResult) {
          setShowScoreboard((prev) => {
            const next = !prev;
            if (next && engineRef.current) {
              setScoreboardEntries(engineRef.current.getScoreboard());
            }
            return next;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [inGame, matchResult]);

  const handleStartGame = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.currentGameMode = gameMode;
    engine.playerName = callsign.trim() || 'OPERATIVE';
    engine.playerTeam = isOnlineMode ? onlineTeam : offlineTeam;
    engine.setEquippedCosmetics(equippedCosmetics);
    engine.selectMap(mapKey);
    engine.selectWeaponClass(weaponClass);
    engine.resetPlayer();

    const duration = isOnlineMode ? onlineMatchDuration : offlineMatchDuration;
    engine.setMatchDuration(duration);
    engine.setTargetScores(targetScoreTdm, targetScoreDom, targetScoreFfa);

    const allySmart = isOnlineMode ? onlineAllySmartness : offlineAllySmartness;
    const enemySmart = isOnlineMode ? onlineEnemySmartness : offlineEnemySmartness;
    engine.setBotSmartness(allySmart, enemySmart);

    engine.startNewMatch();
    setMatchTimeRemaining(duration * 60);
    setMatchTotalSeconds(duration * 60);
    setMatchResult(null);
    setShowScoreboard(false);

    if (isOnlineMode) {
      const botsToSpawn = onlineEnableBots ? onlineBotCount : 0;
      engine.startMultiplayer(
        onlineRoom.trim() || 'CyberArena1',
        callsign.trim() || 'Operative',
        onlineTeam,
        botsToSpawn,
        onlineMatchDuration,
        onlineAllySmartness,
        onlineEnemySmartness,
        gameMode,
        mapKey
      );
    } else {
      engine.stopMultiplayer();
    }

    engine.gameActive = true;
    setInGame(true);
    setIsPaused(false);
    engine.controls.lock();
  };

  const handleJoinServerFromBrowser = (server: ServerListing) => {
    setOnlineRoom(server.name);
    setIsOnlineMode(true);
    setGameMode(server.gameMode);
    setMapKey(server.mapKey);
    setOnlineAllySmartness(server.allyBotSmartness);
    setOnlineEnemySmartness(server.enemyBotSmartness);
    setOnlineMatchDuration(server.matchDuration);
    setOnlineBotCount(server.botCount);
    setOnlineEnableBots(server.botCount > 0);

    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.currentGameMode = server.gameMode;
    engine.playerName = callsign.trim() || 'OPERATIVE';
    engine.playerTeam = onlineTeam;
    engine.setEquippedCosmetics(equippedCosmetics);
    engine.selectMap(server.mapKey);
    engine.selectWeaponClass(weaponClass);
    engine.resetPlayer();

    engine.setMatchDuration(server.matchDuration);
    engine.setTargetScores(targetScoreTdm, targetScoreDom, targetScoreFfa);
    engine.setBotSmartness(server.allyBotSmartness, server.enemyBotSmartness);

    engine.startNewMatch();
    setMatchTimeRemaining(server.matchDuration * 60);
    setMatchTotalSeconds(server.matchDuration * 60);
    setMatchResult(null);
    setShowScoreboard(false);

    engine.startMultiplayer(
      server.name,
      callsign.trim() || 'Operative',
      onlineTeam,
      server.botCount,
      server.matchDuration,
      server.allyBotSmartness,
      server.enemyBotSmartness,
      server.gameMode,
      server.mapKey
    );

    engine.gameActive = true;
    setInGame(true);
    setIsPaused(false);
    engine.controls.lock();
  };

  const handleResumeGame = () => {
    if (!engineRef.current) return;
    setIsPaused(false);
    engineRef.current.controls.lock();
  };

  const handleLeaveMatch = () => {
    if (!engineRef.current) return;
    engineRef.current.stopMultiplayer();
    engineRef.current.gameActive = false;
    engineRef.current.controls.unlock();
    setInGame(false);
    setIsPaused(false);
    setMenuTab('play');
  };

  const handleSelectWeapon = (wKey: WeaponClassKey) => {
    if (currentUser.isGuest && (wKey === 'shotgun' || wKey === 'sniper')) {
      setShowAuthModal(true);
      return;
    }
    setWeaponClass(wKey);
    if (!currentUser.isGuest) {
      setCurrentUser((prev) => {
        const updated = { ...prev, preferredWeaponClass: wKey };
        saveUserProfile(updated);
        return updated;
      });
    }
    if (engineRef.current) {
      engineRef.current.selectWeaponClass(wKey);
    }
  };

  const handleSelectMap = (mKey: MapKey) => {
    setMapKey(mKey);
    if (engineRef.current) {
      engineRef.current.selectMap(mKey);
    }
  };

  const handleSelectSlot = (slot: number) => {
    setWeaponSlot(slot);
    if (engineRef.current) {
      engineRef.current.setWeapon(slot);
    }
  };

  const handleAddBot = () => {
    if (engineRef.current) {
      engineRef.current.addBot();
    }
  };

  const handleRemoveBot = () => {
    if (engineRef.current) {
      engineRef.current.removeBot();
    }
  };

  const handleSetGraphicsPreset = (preset: 'low' | 'medium' | 'high' | 'ultra') => {
    const updated = { ...settings, graphicsPreset: preset };
    setSettings(updated);
    setDraftSettings(updated);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    if (engineRef.current) {
      engineRef.current.applyGraphicsPreset(preset);
    }
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    setSaveNotice(`GRAPHICS PRESET SET TO ${preset.toUpperCase()}`);
    saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 2000);
  };

  const getSlot1Label = () => {
    switch (weaponClass) {
      case 'ar':
        return 'ASSAULT';
      case 'smg':
        return 'SMG';
      case 'shotgun':
        return 'SHOTGUN';
      case 'sniper':
        return 'SNIPER';
    }
  };

  const getSlot1WeaponName = () => {
    switch (weaponClass) {
      case 'ar':
        return '[1] ASSAULT RIFLE';
      case 'smg':
        return '[1] SUBMACHINE GUN';
      case 'shotgun':
        return '[1] COMBAT SHOTGUN';
      case 'sniper':
        return '[1] SNIPER RIFLE';
    }
  };

  const currentWeaponTag = () => {
    if (weaponSlot === 5) return '[5] EMP FLASH CONCUSSION';
    if (weaponSlot === 4) return '[4] PLASMA FRAG GRENADE';
    if (weaponSlot === 3) return '[3] TALON KNIFE';
    if (weaponSlot === 2) return '[2] SILENCED PISTOL';
    return getSlot1WeaponName();
  };

  const handleBuyOrEquipCosmetic = (item: CosmeticItem) => {
    const isOwned = ownedCosmetics.includes(item.id);
    if (isOwned) {
      const categoryKeyMap: Record<string, keyof EquippedCosmetics> = {
        weapon: 'weaponSkin',
        operative: 'operativeSkin',
        explosive: 'explosiveFx',
        gloves: 'gloves'
      };
      const key = categoryKeyMap[item.category];
      if (key) {
        const updated = { ...equippedCosmetics, [key]: item.id };
        setEquippedCosmetics(updated);
        try {
          localStorage.setItem(COSMETICS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        setCurrentUser((curr) => {
          const userUpdated = { ...curr, equippedCosmetics: updated };
          if (!userUpdated.isGuest) saveUserProfile(userUpdated);
          return userUpdated;
        });
        if (engineRef.current) {
          engineRef.current.setEquippedCosmetics(updated);
        }
        setSaveNotice(`EQUIPPED ${item.name.toUpperCase()}!`);
        if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
        saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 2500);
      }
      return;
    }

    if (cscCoins < item.price) {
      setSaveNotice(`INSUFFICIENT CSC COINS! NEED ${item.price - cscCoins} MORE`);
      if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
      saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 2500);
      return;
    }

    updateCoins((prev) => prev - item.price);
    const newOwned = [...ownedCosmetics, item.id];
    setOwnedCosmetics(newOwned);
    try {
      localStorage.setItem(OWNED_STORAGE_KEY, JSON.stringify(newOwned));
    } catch {}

    const categoryKeyMap: Record<string, keyof EquippedCosmetics> = {
      weapon: 'weaponSkin',
      operative: 'operativeSkin',
      explosive: 'explosiveFx',
      gloves: 'gloves'
    };
    const key = categoryKeyMap[item.category];
    let updatedEquipped = equippedCosmetics;
    if (key) {
      updatedEquipped = { ...equippedCosmetics, [key]: item.id };
      setEquippedCosmetics(updatedEquipped);
      try {
        localStorage.setItem(COSMETICS_STORAGE_KEY, JSON.stringify(updatedEquipped));
      } catch {}
      if (engineRef.current) {
        engineRef.current.setEquippedCosmetics(updatedEquipped);
      }
    }

    setCurrentUser((curr) => {
      const userUpdated = {
        ...curr,
        ownedCosmetics: newOwned,
        equippedCosmetics: updatedEquipped
      };
      if (!userUpdated.isGuest) saveUserProfile(userUpdated);
      return userUpdated;
    });

    setSaveNotice(`PURCHASED & EQUIPPED ${item.name.toUpperCase()}! (-${item.price} CSC)`);
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    saveNoticeTimer.current = window.setTimeout(() => setSaveNotice(null), 3000);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030308] select-none text-[#e8f2fa] font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Screen Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)'
        }}
      />

      {/* Visual Flash Overlays */}
      {flashType === 'flash' && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.75), rgba(0,212,255,0.3))',
            mixBlendMode: 'overlay'
          }}
        />
      )}
      {flashType === 'damage-flash' && (
        <div
          className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-150"
          style={{
            background: 'radial-gradient(circle at center, rgba(255,0,0,0) 25%, rgba(255,0,40,0.75) 100%)'
          }}
        />
      )}
      {flashType === 'slash-flash' && (
        <div
          className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-100"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), rgba(255,255,255,0.8), transparent)',
            transform: 'skewX(-15deg)'
          }}
        />
      )}
      {flashType === 'emp-blind' && (
        <div
          className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-1000 flex flex-col items-center justify-center animate-in fade-in"
          style={{
            background: 'radial-gradient(circle at center, #ffffff 50%, rgba(220, 250, 255, 0.98) 100%)',
            mixBlendMode: 'screen'
          }}
        >
          <div className="px-5 py-2 rounded-2xl bg-black/70 border border-cyan-400 text-cyan-200 font-mono font-black text-xs tracking-[8px] uppercase backdrop-blur-md shadow-[0_0_30px_#00d4ff] animate-pulse">
            ⚡ EMP FLASH DISRUPTION • SENSORS BLINDED ⚡
          </div>
        </div>
      )}

      {/* Low Health Heartbeat Pulse */}
      {inGame && health <= 35 && health > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-15 animate-pulse"
          style={{
            boxShadow: `inset 0 0 160px rgba(255, 0, 40, ${0.35 + (35 - health) / 100})`
          }}
        />
      )}

      {/* 3-Second Spawn Shield Perimeter Barrier */}
      {inGame && spawnShield > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-15 transition-opacity duration-150"
          style={{
            boxShadow: `inset 0 0 90px rgba(0, 212, 255, ${0.2 + (spawnShield / 3) * 0.25}), inset 0 0 160px rgba(0, 140, 255, 0.15)`,
            border: '2px solid rgba(0, 212, 255, 0.4)'
          }}
        />
      )}

      {/* Spawn Shield HUD Badge & Countdown */}
      {inGame && spawnShield > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center animate-in fade-in duration-150">
          <div className="px-4 py-1.5 rounded-full bg-cyan-950/85 border border-cyan-400 shadow-[0_0_24px_rgba(0,212,255,0.7)] backdrop-blur-md flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-cyan-300 animate-pulse drop-shadow-[0_0_8px_#00d4ff]" />
            <span className="text-xs font-black italic tracking-widest text-cyan-100 uppercase">
              SHIELD: {spawnShield.toFixed(1)}s
            </span>
            <div className="w-20 h-2 bg-black/60 rounded-full overflow-hidden border border-cyan-400/40 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_10px_#00d4ff] transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(0, (spawnShield / 3.0) * 100))}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-cyan-300/80 uppercase mt-1 drop-shadow">
            INVULNERABILITY ACTIVE
          </span>
        </div>
      )}

      {/* Shield Deflection Energy Flash */}
      {shieldDeflect && (
        <div
          className="absolute inset-0 pointer-events-none z-25 transition-opacity duration-150 flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.25) 0%, rgba(0, 140, 255, 0.4) 65%, transparent 100%)',
            mixBlendMode: 'screen'
          }}
        >
          <div className="px-4 py-1.5 rounded-full bg-cyan-900/80 border border-cyan-300 shadow-[0_0_20px_#00d4ff] text-cyan-100 text-xs font-black italic tracking-widest uppercase">
            DAMAGE DEFLECTED
          </div>
        </div>
      )}

      {/* Death Screen Overlay */}
      {isDead && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-red-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-6xl font-black italic tracking-widest text-[#ff2a6d] drop-shadow-[0_0_30px_rgba(255,42,109,0.9)]">
            ELIMINATED
          </div>
          <div className="text-sm font-bold tracking-[8px] text-pink-200 mt-3">
            REBOOTING COMBAT PROTOCOL
          </div>
        </div>
      )}

      {/* Achievement & Killstreak Banner Popup */}
      {inGame && activeAchievement && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center animate-in slide-in-from-top-6 zoom-in-95 duration-200">
          <div
            className="px-6 py-2.5 rounded-2xl border backdrop-blur-xl flex items-center gap-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            style={{
              borderColor: activeAchievement.color,
              backgroundColor: 'rgba(6, 10, 20, 0.92)',
              boxShadow: `0 0 35px ${activeAchievement.color}40, inset 0 0 15px ${activeAchievement.color}25`
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: `${activeAchievement.color}35`, borderColor: activeAchievement.color, borderWidth: 1 }}
            >
              {activeAchievement.type === 'double' && <Swords className="w-5 h-5 text-cyan-300 drop-shadow" />}
              {activeAchievement.type === 'triple' && <Plane className="w-5 h-5 text-sky-300 animate-pulse drop-shadow" />}
              {activeAchievement.type === 'quad' && <Tablet className="w-5 h-5 text-amber-300 drop-shadow" />}
              {activeAchievement.type === 'nuke' && <Radiation className="w-5 h-5 text-rose-400 animate-spin drop-shadow" />}
            </div>
            <div>
              <div
                className="text-lg font-black italic tracking-widest uppercase drop-shadow"
                style={{ color: activeAchievement.color }}
              >
                {activeAchievement.title}
              </div>
              <div className="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-2">
                <span>{activeAchievement.subtitle}</span>
                {activeAchievement.reward && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">
                    {activeAchievement.reward}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Nuke Emergency Siren Banner */}
      {inGame && nukeCountdown !== null && (
        <div className="fixed top-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center">
          <div className="w-full bg-red-600/90 text-white font-black text-xs tracking-[6px] py-1.5 text-center uppercase shadow-[0_0_30px_#ff0033] animate-pulse flex items-center justify-center gap-3">
            <Radiation className="w-4 h-4 animate-spin text-yellow-300" />
            <span>⚠ TACTICAL NUKE IMMINENT • ALL UNITS BRACE FOR DETONATION ⚠</span>
            <Radiation className="w-4 h-4 animate-spin text-yellow-300" />
          </div>
          <div className="mt-4 px-8 py-3 rounded-2xl bg-black/90 border-2 border-red-500 shadow-[0_0_50px_rgba(255,0,50,0.8)] backdrop-blur-xl flex flex-col items-center animate-bounce">
            <span className="text-[11px] font-black tracking-[4px] text-red-400 uppercase">DETONATION T-MINUS</span>
            <span className="text-5xl font-black italic tracking-tighter text-white font-mono drop-shadow-[0_0_20px_#ff2a6d]">
              00:0{nukeCountdown}
            </span>
          </div>
        </div>
      )}

      {/* Tactical Tablet Strike Ready Button on HUD */}
      {inGame && tabletStrikeReady && !isDead && (
        <div className="absolute bottom-24 right-6 z-30 pointer-events-auto animate-bounce">
          <button
            type="button"
            onClick={() => engineRef.current?.launchTabletStrike()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 border border-yellow-300 text-black font-black text-xs tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.8)] hover:scale-105 transition-transform flex items-center gap-2 cursor-pointer"
          >
            <Tablet className="w-4 h-4 text-black drop-shadow" />
            <span>[4] TABLET STRIKE READY!</span>
          </button>
        </div>
      )}

      {/* FPS Counter */}
      {settings.showFps && inGame && (
        <div className="absolute top-3 left-3 z-30 font-mono text-xs text-[#00d4ff]/80 tracking-widest pointer-events-none drop-shadow">
          FPS: {fps}
        </div>
      )}

      {/* Scope Overlay (Sniper Rifle) */}
      <div
        id="scope-overlay"
        className="fixed inset-0 z-20 pointer-events-none transition-opacity duration-150"
        style={{ opacity: scopeAmount }}
      >
        <div id="scope-lens">
          <svg className="absolute inset-0 w-full h-full text-[#00ff9a] drop-shadow-[0_0_2px_rgba(0,255,154,0.8)]" viewBox="-50 -50 100 100">
            <circle cx="0" cy="0" r="47" fill="none" stroke="rgba(0,255,154,0.18)" strokeWidth="0.3" />
            <circle cx="0" cy="0" r="45" fill="none" stroke="rgba(0,255,154,0.25)" strokeWidth="0.2" />
            {/* Open center crosshairs (hair-line thin, starting 4 units away from center) */}
            <line x1="-46" y1="0" x2="-4" y2="0" stroke="currentColor" strokeWidth="0.15" />
            <line x1="4" y1="0" x2="46" y2="0" stroke="currentColor" strokeWidth="0.15" />
            <line x1="0" y1="-46" x2="0" y2="-4" stroke="currentColor" strokeWidth="0.15" />
            <line x1="0" y1="4" x2="0" y2="46" stroke="currentColor" strokeWidth="0.15" />
            <g fill="currentColor" opacity="0.8">
              <circle cx="0" cy="12" r="0.5" />
              <circle cx="0" cy="24" r="0.5" />
              <circle cx="0" cy="36" r="0.5" />
              <circle cx="0" cy="-12" r="0.5" />
              <circle cx="0" cy="-24" r="0.5" />
              <circle cx="0" cy="-36" r="0.5" />
              <circle cx="12" cy="0" r="0.5" />
              <circle cx="24" cy="0" r="0.5" />
              <circle cx="36" cy="0" r="0.5" />
              <circle cx="-12" cy="0" r="0.5" />
              <circle cx="-24" cy="0" r="0.5" />
              <circle cx="-36" cy="0" r="0.5" />
            </g>
          </svg>
        </div>
      </div>

      {/* Iron Sight / Aim Line (AR / SMG / Shotgun) - Ultra-thin toothpick hairline SVG with open center */}
      <div
        className="fixed inset-0 z-20 pointer-events-none transition-opacity duration-150 flex items-center justify-center"
        style={{ opacity: aimLineAmount }}
      >
        <svg className="absolute w-24 h-24 text-[#00ff9a] drop-shadow-[0_0_1px_rgba(0,255,154,0.8)]" viewBox="-50 -50 100 100">
          <line x1="-30" y1="0" x2="-2" y2="0" stroke="currentColor" strokeWidth="0.08" />
          <line x1="2" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="0.08" />
          <line x1="0" y1="-30" x2="0" y2="-2" stroke="currentColor" strokeWidth="0.08" />
          <line x1="0" y1="2" x2="0" y2="30" stroke="currentColor" strokeWidth="0.08" />
        </svg>
      </div>

      {/* Standard Hipfire Crosshair */}
      {inGame && scopeAmount < 0.7 && aimLineAmount < 0.7 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 transition-transform duration-75"
        >
          {/* Top */}
          <div
            className="absolute rounded-sm"
            style={{
              backgroundColor: settings.cxColor,
              width: `${settings.cxThick}px`,
              height: `${settings.cxSize}px`,
              left: `${-settings.cxThick / 2}px`,
              bottom: `${settings.cxGap}px`,
              boxShadow: `0 0 4px ${settings.cxColor}`
            }}
          />
          {/* Bottom */}
          <div
            className="absolute rounded-sm"
            style={{
              backgroundColor: settings.cxColor,
              width: `${settings.cxThick}px`,
              height: `${settings.cxSize}px`,
              left: `${-settings.cxThick / 2}px`,
              top: `${settings.cxGap}px`,
              boxShadow: `0 0 4px ${settings.cxColor}`
            }}
          />
          {/* Left */}
          <div
            className="absolute rounded-sm"
            style={{
              backgroundColor: settings.cxColor,
              height: `${settings.cxThick}px`,
              width: `${settings.cxSize}px`,
              top: `${-settings.cxThick / 2}px`,
              right: `${settings.cxGap}px`,
              boxShadow: `0 0 4px ${settings.cxColor}`
            }}
          />
          {/* Right */}
          <div
            className="absolute rounded-sm"
            style={{
              backgroundColor: settings.cxColor,
              height: `${settings.cxThick}px`,
              width: `${settings.cxSize}px`,
              top: `${-settings.cxThick / 2}px`,
              left: `${settings.cxGap}px`,
              boxShadow: `0 0 4px ${settings.cxColor}`
            }}
          />
        </div>
      )}

      {/* Hitmarker Overlay */}
      {hitmarker.active && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none z-25">
          <div
            className={`absolute w-2 h-0.5 top-0.5 left-0.5 rotate-45 ${
              hitmarker.isKill ? 'bg-[#ff2a6d] shadow-[0_0_8px_#ff2a6d]' : 'bg-white shadow-[0_0_6px_#fff]'
            }`}
          />
          <div
            className={`absolute w-2 h-0.5 top-0.5 right-0.5 -rotate-45 ${
              hitmarker.isKill ? 'bg-[#ff2a6d] shadow-[0_0_8px_#ff2a6d]' : 'bg-white shadow-[0_0_6px_#fff]'
            }`}
          />
          <div
            className={`absolute w-2 h-0.5 bottom-0.5 left-0.5 -rotate-45 ${
              hitmarker.isKill ? 'bg-[#ff2a6d] shadow-[0_0_8px_#ff2a6d]' : 'bg-white shadow-[0_0_6px_#fff]'
            }`}
          />
          <div
            className={`absolute w-2 h-0.5 bottom-0.5 right-0.5 rotate-45 ${
              hitmarker.isKill ? 'bg-[#ff2a6d] shadow-[0_0_8px_#ff2a6d]' : 'bg-white shadow-[0_0_6px_#fff]'
            }`}
          />
        </div>
      )}

      {/* Top Bar Right: Quick Graphics Changer (Low, Med, High, Ultra) */}
      {inGame && (
        <div className="absolute top-4 right-4 z-30 pointer-events-auto flex items-center gap-1.5 bg-black/85 border border-cyan-400/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-[0_0_20px_rgba(0,212,255,0.2)]">
          <Monitor className="w-3.5 h-3.5 text-cyan-300 drop-shadow" />
          <span className="text-[10px] font-black tracking-wider text-slate-300 uppercase hidden sm:inline mr-0.5">
            GRAPHICS:
          </span>
          {(['low', 'medium', 'high', 'ultra'] as const).map((preset) => {
            const isActive = (settings.graphicsPreset || 'high') === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetGraphicsPreset(preset)}
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold shadow-[0_0_10px_#00d4ff]'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={`Set graphics preset to ${preset}`}
              >
                {preset === 'medium' ? 'MED' : preset}
              </button>
            );
          })}
        </div>
      )}

      {/* Killfeed */}
      <div className="absolute top-16 right-4 z-30 flex flex-col gap-1.5 items-end pointer-events-none">
        {killFeed.map((kf) => (
          <div
            key={kf.id}
            className="bg-black/60 border border-[#00d4ff]/20 border-r-2 border-r-[#00d4ff] px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-bold tracking-wider text-cyan-100 animate-in slide-in-from-right duration-200"
          >
            <span style={{ color: kf.color }}>{kf.killer}</span>
            <span className="text-[#00d4ff] mx-1.5">&#10230;</span>
            <span>{kf.victim}</span>
          </div>
        ))}
      </div>

      {/* Low Health Screen Perimeter Warning */}
      {inGame && health < 45 && !isDead && (
        <div className="fixed inset-0 pointer-events-none z-15 shadow-[inset_0_0_100px_rgba(255,42,109,0.55)] animate-pulse" />
      )}

      {/* Cover / Hide Healing Screen Aura */}
      {inGame && isCoverHealing && !isDead && (
        <div className="fixed inset-0 pointer-events-none z-15 shadow-[inset_0_0_90px_rgba(16,185,129,0.35)] transition-opacity duration-300 animate-pulse" />
      )}

      {/* In-Game HUD */}
      {inGame && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Top Left: Online Match Status & Bot Controls */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
            {isOnlineMode && (
              <div className="flex items-center gap-2 bg-black/75 border border-cyan-400/35 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(0,212,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider text-cyan-200 uppercase">
                  {onlineRoom}
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/30 font-bold">
                  {onlinePlayerCount} {onlinePlayerCount === 1 ? 'PLAYER' : 'PLAYERS'}
                </span>
                {onlinePing > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {onlinePing}ms
                  </span>
                )}
              </div>
            )}

            {/* Multiplayer / Server Bot Control Widget */}
            <div className="pointer-events-auto flex items-center gap-1.5 bg-black/85 border border-cyan-400/35 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-[0_0_14px_rgba(0,212,255,0.2)]">
              <Users className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-[10px] font-black tracking-wider text-slate-300 uppercase">
                BOTS: <span className="text-cyan-300 font-mono font-bold">{serverBotCount}</span>
              </span>
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={handleRemoveBot}
                  title="Remove bot from server"
                  className="w-5 h-5 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(255,42,109,0.3)]"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleAddBot}
                  title="Add bot to server"
                  className="w-5 h-5 rounded bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 hover:text-white flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.3)]"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Scoreboard Trigger Button */}
            <button
              type="button"
              onClick={() => {
                if (engineRef.current) {
                  setScoreboardEntries(engineRef.current.getScoreboard());
                }
                setShowScoreboard((prev) => !prev);
              }}
              className="pointer-events-auto flex items-center gap-1.5 bg-black/85 hover:bg-black border border-cyan-400/40 hover:border-cyan-400 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-black tracking-wider text-cyan-300 hover:text-white cursor-pointer transition-all shadow-[0_0_14px_rgba(0,212,255,0.2)]"
              title="Toggle Scoreboard (or press TAB)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>SCOREBOARD</span>
              <span className="text-[9px] font-mono bg-cyan-950 px-1 py-0.5 rounded border border-cyan-400/30 text-cyan-200">
                TAB
              </span>
            </button>

            {/* CSC Coins Balance Chip in HUD */}
            <div className="flex items-center gap-1.5 bg-black/85 border border-amber-400/40 px-3 py-1.5 rounded-lg backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-black font-mono text-amber-300">{cscCoins}</span>
              <span className="text-[9px] font-bold text-amber-400">CSC</span>
            </div>

            {/* Match Timer HUD Widget */}
            <div
              className={`flex items-center gap-1.5 bg-black/85 border px-3 py-1.5 rounded-lg backdrop-blur-md transition-all ${
                matchTimeRemaining <= 30
                  ? 'border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(255,42,109,0.5)] animate-pulse'
                  : 'border-cyan-400/40 text-cyan-200 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
              }`}
              title={`Match Time Remaining: ${formatMatchTime(matchTimeRemaining)}`}
            >
              <Clock className={`w-3.5 h-3.5 ${matchTimeRemaining <= 30 ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
              <span className="text-xs font-black font-mono tracking-wider">{formatMatchTime(matchTimeRemaining)}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase hidden sm:inline">TIME</span>
            </div>
          </div>

          {/* Top Center: Domination Mode Objectives */}
          {gameMode === 'dom' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
              {/* Domination Score Ticker (Race to targetScoreDom) */}
              <div className="flex items-center gap-3.5 bg-black/85 border border-cyan-400/35 px-4 py-1.5 rounded-xl backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                  <span className="text-xs font-black tracking-wider text-cyan-300">BLUE: {blueScore}</span>
                </div>
                <div className="w-28 h-2 bg-black/90 rounded-full overflow-hidden border border-white/15 flex">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_6px_#00d4ff]"
                    style={{ width: `${Math.min(100, (blueScore / targetScoreDom) * 100)}%` }}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-300 ml-auto shadow-[0_0_6px_#ff2a6d]"
                    style={{ width: `${Math.min(100, (redScore / targetScoreDom) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wider text-rose-400">RED: {redScore}</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#ff2a6d]" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">/ {targetScoreDom}</span>
              </div>

              {/* Point Badges (A, B, C) */}
              <div className="flex items-center gap-2.5">
                {domPoints.map((pt) => {
                  const isBlue = pt.owner === 'blue';
                  const isRed = pt.owner === 'red';
                  const isContested = pt.isContested;

                  return (
                    <div
                      key={pt.id}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border backdrop-blur-md transition-all ${
                        isContested
                          ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.6)] animate-pulse'
                          : isBlue
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                          : isRed
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(255,42,109,0.4)]'
                          : 'bg-black/60 border-white/20 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black tracking-widest">{pt.id}</span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">{pt.name}</span>
                      {isContested ? (
                        <span className="text-xs font-black text-amber-300 animate-spin">⚔</span>
                      ) : pt.progress > 0 && pt.progress < 100 ? (
                        <span className="text-[9px] font-mono font-bold text-cyan-200">{pt.progress}%</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Inside Capture Zone Meter */}
              {domPoints.find((p) => p.playerInside) && (
                <div className="bg-black/90 border border-cyan-400/50 px-4 py-1.5 rounded-xl backdrop-blur-xl shadow-[0_0_20px_rgba(0,212,255,0.3)] animate-in slide-in-from-top duration-150 flex flex-col items-center gap-1">
                  {(() => {
                    const activePoint = domPoints.find((p) => p.playerInside)!;
                    return (
                      <>
                        <div className="flex items-center gap-2 text-xs font-black tracking-wider uppercase">
                          {activePoint.isContested ? (
                            <span className="text-amber-300 flex items-center gap-1.5 animate-pulse">
                              <span>⚔</span> CONTESTED: {activePoint.name}
                            </span>
                          ) : activePoint.owner === 'blue' ? (
                            <span className="text-cyan-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> DEFENDING {activePoint.name}
                            </span>
                          ) : activePoint.capturingTeam === 'blue' ? (
                            <span className="text-cyan-300">CAPTURING {activePoint.name}... {activePoint.progress}%</span>
                          ) : (
                            <span className="text-rose-400">HOSTILE ZONE: {activePoint.name}</span>
                          )}
                        </div>
                        <div className="w-44 h-1.5 bg-black/80 rounded-full border border-white/10 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-150 ${
                              activePoint.isContested
                                ? 'bg-amber-400'
                                : activePoint.owner === 'blue' || activePoint.capturingTeam === 'blue'
                                ? 'bg-cyan-400 shadow-[0_0_8px_#00d4ff]'
                                : 'bg-rose-500 shadow-[0_0_8px_#ff2a6d]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(6, activePoint.progress))}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Bottom Left: Score & Enhanced Health Matrix */}
          <div className="absolute bottom-6 left-6">
            <div className="text-2xl font-black italic tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-2.5">
              {gameMode === 'ffa' ? (
                <div className="text-cyan-400 drop-shadow-[0_0_12px_rgba(0,212,255,0.6)] flex items-baseline gap-2">
                  <span>SCORE: {score}</span>
                  <span className="text-xs font-mono font-bold text-cyan-200/60">/ {targetScoreFfa}</span>
                </div>
              ) : gameMode === 'tdm' ? (
                <div className="flex gap-4 text-base font-black">
                  <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.6)] flex items-baseline gap-1">
                    BLUE {blueScore} <span className="text-xs font-mono font-bold text-cyan-200/60">/ {targetScoreTdm}</span>
                  </span>
                  <span className="text-pink-500 drop-shadow-[0_0_8px_rgba(255,42,109,0.6)] flex items-baseline gap-1">
                    RED {redScore} <span className="text-xs font-mono font-bold text-rose-200/60">/ {targetScoreTdm}</span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Health Status & HP Value */}
            <div className="flex items-center justify-between mb-1.5 px-0.5 max-w-[384px] relative">
              {/* Combat Siphon Heal Notification */}
              {healNotice && (
                <div className="absolute -top-6 right-0 flex items-center gap-1.5 text-emerald-400 font-black text-xs tracking-wider animate-bounce drop-shadow-[0_0_8px_#10b981]">
                  <span>+{healNotice.amount} HP</span>
                  <span className="text-[10px] text-emerald-300 font-mono">[{healNotice.reason}]</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black tracking-widest uppercase ${health > 50 ? 'text-cyan-300' : 'text-rose-400 animate-pulse'}`}>
                  HEALTH MATRIX
                </span>
                {isCoverHealing && !isDead ? (
                  <span className="text-[9px] font-mono font-black text-emerald-300 bg-emerald-950/90 border border-emerald-400/80 px-2 py-0.5 rounded shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-400" />
                    <span>IN COVER • RAPID HEAL (+38 HP/s)</span>
                  </span>
                ) : inCover && health < maxHealth && !isDead ? (
                  <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-400/50 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                    <Shield className="w-2.5 h-2.5 text-cyan-400" />
                    <span>IN COVER • HIDING</span>
                  </span>
                ) : !inCover && health < maxHealth && !isDead ? (
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-500/50 px-1.5 py-0.5 rounded animate-pulse">
                    EXPOSED • HIDE BEHIND COVER TO HEAL
                  </span>
                ) : null}
              </div>

              <span className="font-mono text-xs font-black tabular-nums tracking-wider">
                <span className={health > 50 ? 'text-white text-sm' : 'text-rose-400 text-sm'}>
                  {Math.round(health)}
                </span>
                <span className="text-slate-400 text-[11px]"> / {maxHealth} HP</span>
              </span>
            </div>

            {/* Skewed Cyber Health Bar - Enhanced with tick marks */}
            <div className="w-80 sm:w-96 h-6 bg-black/90 border border-cyan-400/50 rounded -skew-x-12 overflow-hidden shadow-[0_0_24px_rgba(0,212,255,0.25)] p-0.5 relative">
              {/* Background segmented notches */}
              <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-20 z-10">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-[1px] h-full bg-white" />
                ))}
              </div>

              <div
                className="h-full transition-all duration-150 ease-out rounded-sm relative"
                style={{
                  width: `${Math.min(100, Math.max(0, (health / maxHealth) * 100))}%`,
                  background:
                    health > 50
                      ? 'linear-gradient(90deg, #00d4ff, #0066ff 60%, #00e5ff)'
                      : 'linear-gradient(90deg, #ff2a6d, #b8003a)',
                  boxShadow: health > 50 ? '0 0 18px rgba(0,212,255,0.7)' : '0 0 18px rgba(255,42,109,0.9)'
                }}
              />
            </div>
          </div>

          {/* Bottom Center: Weapon & Explosives Slots (1-5 & Scrollwheel) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto">
            <div className="flex gap-2">
              {/* Slot 1: Primary Weapon */}
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setWeapon(1);
                  setWeaponSlot(1);
                }}
                className={`w-16 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer ${
                  weaponSlot === 1
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.5)] scale-105 ring-1 ring-cyan-400/50'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/30'
                }`}
                title="Primary Weapon (Key [1] or Scroll Wheel)"
              >
                <span className="text-xs leading-none font-bold text-cyan-400">1</span>
                <span className="truncate max-w-[56px]">{getSlot1Label()}</span>
              </button>

              {/* Slot 2: Pistol */}
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setWeapon(2);
                  setWeaponSlot(2);
                }}
                className={`w-16 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer ${
                  weaponSlot === 2
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.5)] scale-105 ring-1 ring-cyan-400/50'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/30'
                }`}
                title="Secondary Pistol (Key [2] or Scroll Wheel)"
              >
                <span className="text-xs leading-none font-bold text-cyan-400">2</span>
                <span>PISTOL</span>
              </button>

              {/* Slot 3: Melee Blade */}
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setWeapon(3);
                  setWeaponSlot(3);
                }}
                className={`w-16 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer ${
                  weaponSlot === 3
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.5)] scale-105 ring-1 ring-cyan-400/50'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/30'
                }`}
                title="Talon Knife (Key [3] or Scroll Wheel)"
              >
                <span className="text-xs leading-none font-bold text-cyan-400">3</span>
                <span>BLADE</span>
              </button>

              {/* Slot 4: Lethal Explosive (Plasma Frag) */}
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setWeapon(4);
                  setWeaponSlot(4);
                }}
                className={`w-16 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer ${
                  weaponSlot === 4
                    ? 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-[0_0_16px_rgba(255,42,109,0.5)] scale-105 ring-1 ring-rose-400/50'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white hover:border-rose-400/30'
                }`}
                title="Lethal Plasma Frag Grenade (Key [4] / [G] or Scroll Wheel)"
              >
                <div className="flex items-center gap-0.5">
                  <Bomb className="w-2.5 h-2.5 text-rose-400" />
                  <span className="text-xs leading-none font-bold text-rose-400">4</span>
                </div>
                <span className="text-rose-300">FRAG</span>
              </button>

              {/* Slot 5: Non-Lethal Explosive (EMP Flash Concussion) */}
              <button
                type="button"
                onClick={() => {
                  engineRef.current?.setWeapon(5);
                  setWeaponSlot(5);
                }}
                className={`w-16 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-black tracking-wider backdrop-blur-md border transition-all cursor-pointer ${
                  weaponSlot === 5
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.5)] scale-105 ring-1 ring-amber-400/50'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white hover:border-amber-400/30'
                }`}
                title="Non-Lethal EMP Flash Canister (Key [5] or Scroll Wheel)"
              >
                <div className="flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-xs leading-none font-bold text-amber-400">5</span>
                </div>
                <span className="text-amber-300">EMP</span>
              </button>
            </div>
            <div className="text-[9px] font-mono font-bold text-slate-400/80 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded border border-white/10">
              SWITCH: SCROLL WHEEL OR [1 - 5]
            </div>
          </div>

          {/* Bottom Right: Ammo HUD */}
          <div className="absolute bottom-6 right-6">
            <div className="bg-gradient-to-br from-slate-900/80 to-black/70 border border-cyan-400/30 rounded-xl px-5 py-2.5 backdrop-blur-md text-right min-w-[200px] shadow-[0_0_24px_rgba(0,212,255,0.1)]">
              <span className="text-xs font-bold tracking-wider text-cyan-400 italic block">
                {currentWeaponTag()}
              </span>
              <div className="text-3xl font-black tabular-nums tracking-tight mt-0.5">
                <span className={ammoCur === 0 ? 'text-[#ff2a6d]' : 'text-white'}>{ammoCur}</span>
                {ammoMax !== '' && <span className="text-slate-400 text-base">/{ammoMax}</span>}
              </div>
            </div>
          </div>

          {/* Edge Boundary Barrier Alert: "THIS IS THE EDGE!" */}
          {edgeWarning.active && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="border-2 border-red-500 rounded-lg px-6 py-2 bg-neutral-950 text-center shadow-md flex flex-col items-center gap-0.5">
                <span className="text-lg sm:text-xl font-bold tracking-wider text-yellow-300">
                  ⚠️ THIS IS THE EDGE! ⚠️
                </span>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-red-400 uppercase">
                  CONTAINMENT BARRIER ACTIVE
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Menu Screen */}
      {!inGame && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl menu-grid-bg animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#101726]/95 via-[#0b101c]/95 to-[#050810]/98 border border-cyan-400/35 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_50px_rgba(0,212,255,0.18)] backdrop-blur-2xl overflow-hidden flex flex-col cyber-panel-animated">
            {/* Sci-Fi Corner Reticles */}
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none" />

            {/* Neon top rim */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-90" />

            {/* Header: The ONLY Login/Sign Up Option (Next to Title) + Title + CS Futuristic Rock Music + CSC Coins */}
            <div className="pt-6 pb-2.5 px-6 flex items-center justify-between gap-2 border-b border-white/5">
              {/* Only Login & Sign Up Option next to the Title */}
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-left cursor-pointer ${
                  currentUser.isGuest
                    ? 'bg-gradient-to-r from-amber-950/70 to-black/80 hover:from-amber-900/70 hover:to-cyan-950/70 border-amber-400/50 hover:border-amber-300 text-white shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:shadow-[0_0_24px_rgba(245,158,11,0.45)]'
                    : 'bg-gradient-to-r from-cyan-950/70 to-black/80 hover:from-cyan-900/70 hover:to-black/90 border-cyan-400/50 hover:border-cyan-300 text-white shadow-[0_0_16px_rgba(0,212,255,0.2)] hover:shadow-[0_0_24px_rgba(0,212,255,0.4)]'
                }`}
                title={currentUser.isGuest ? 'Log in or Sign up to save your progress, stats, and loadouts' : 'Manage Operator Account'}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border transition-transform group-hover:scale-105 ${
                    currentUser.isGuest
                      ? 'bg-amber-950/80 border-amber-400/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-cyan-950/80 border-cyan-400/80 text-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.4)]'
                  }`}
                >
                  {currentUser.isGuest ? (
                    <User className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    currentUser.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={`text-[8px] font-mono font-bold tracking-wider ${currentUser.isGuest ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {currentUser.isGuest ? 'GUEST MODE' : `LVL ${currentUser.level}`}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${currentUser.isGuest ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-cyan-200 group-hover:text-white leading-tight mt-0.5">
                    {currentUser.isGuest ? 'LOGIN / SIGN UP' : currentUser.callsign}
                  </div>
                </div>
              </button>

              {/* Game Title */}
              <div className="text-center px-1">
                <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-[#00d4ff] drop-shadow-[0_0_24px_rgba(0,212,255,0.6)]">
                  CYBER<span className="text-[#ff2a6d]">STRIKER</span>
                </h1>
                <div className="text-[9px] font-bold tracking-[6px] uppercase text-slate-400 mt-0.5">
                  Neon Combat Protocol
                </div>
              </div>

              {/* Right Side: Futuristic Rock Menu Music & CSC Coins */}
              <div className="flex items-center gap-2">
                {/* Futuristic Rock Menu Music (CS Style) */}
                <button
                  type="button"
                  onClick={toggleMusic}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isMusicPlaying
                      ? 'bg-gradient-to-r from-pink-950/70 to-purple-950/70 border-pink-500/60 text-pink-300 shadow-[0_0_16px_rgba(255,42,109,0.35)] hover:border-pink-300'
                      : 'bg-black/60 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500'
                  }`}
                  title={isMusicPlaying ? 'Mute Futuristic Rock Menu Music' : 'Play Futuristic Rock Menu Music'}
                >
                  {isMusicPlaying ? (
                    <Music className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-[7.5px] font-mono font-bold leading-none text-pink-400">
                      {isMusicPlaying ? 'FUTURISTIC ROCK' : 'MUSIC MUTED'}
                    </div>
                    <div className="text-[9.5px] font-black leading-tight flex items-center gap-1">
                      <span>CS OST</span>
                      {isMusicPlaying && (
                        <span className="flex gap-0.5 items-end h-2.5 ml-0.5">
                          <span className="w-0.5 bg-pink-400 anim-eq-1 rounded-full" />
                          <span className="w-0.5 bg-pink-400 anim-eq-2 rounded-full" />
                          <span className="w-0.5 bg-pink-400 anim-eq-3 rounded-full" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Coins */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/80 to-yellow-950/80 border border-amber-400/60 px-2.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-xs font-black font-mono text-amber-300">
                    {cscCoins}
                  </span>
                  <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-widest">
                    CSC
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/10 bg-black/30 mt-3">
              <button
                onClick={() => setMenuTab('play')}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest transition-all relative ${
                  menuTab === 'play' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Deploy
                {menuTab === 'play' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
              <button
                onClick={() => setMenuTab('servers')}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest transition-all relative ${
                  menuTab === 'servers' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Servers</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                {menuTab === 'servers' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
              <button
                onClick={() => {
                  if (currentUser.isGuest) {
                    setShowAuthModal(true);
                  } else {
                    setMenuTab('shop');
                  }
                }}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest transition-all relative ${
                  menuTab === 'shop' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                } ${currentUser.isGuest ? 'opacity-70 hover:opacity-100' : ''}`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {currentUser.isGuest ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Shop</span>
                  {currentUser.isGuest && (
                    <span className="text-[8px] font-mono font-bold text-amber-400 px-1 py-0.2 rounded bg-amber-950/80 border border-amber-400/40">
                      LOCK
                    </span>
                  )}
                </div>
                {menuTab === 'shop' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                )}
              </button>
              <button
                onClick={() => {
                  if (currentUser.isGuest) {
                    setShowAuthModal(true);
                  } else {
                    setDraftSettings({ ...settings });
                    setMenuTab('settings');
                  }
                }}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest transition-all relative ${
                  menuTab === 'settings' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                } ${currentUser.isGuest ? 'opacity-70 hover:opacity-100' : ''}`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {currentUser.isGuest && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Settings</span>
                  {currentUser.isGuest && (
                    <span className="text-[8px] font-mono font-bold text-slate-400 px-1 py-0.2 rounded bg-slate-900 border border-slate-700">
                      LOCK
                    </span>
                  )}
                </div>
                {menuTab === 'settings' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
              <button
                onClick={() => {
                  if (currentUser.isGuest) {
                    setShowAuthModal(true);
                  } else {
                    setDraftSettings({ ...settings });
                    setMenuTab('crosshair');
                  }
                }}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-widest transition-all relative ${
                  menuTab === 'crosshair' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
                } ${currentUser.isGuest ? 'opacity-70 hover:opacity-100' : ''}`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {currentUser.isGuest && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Crosshair</span>
                  {currentUser.isGuest && (
                    <span className="text-[8px] font-mono font-bold text-slate-400 px-1 py-0.2 rounded bg-slate-900 border border-slate-700">
                      LOCK
                    </span>
                  )}
                </div>
                {menuTab === 'crosshair' && (
                  <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00d4ff]" />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 max-h-[64vh] overflow-y-auto space-y-6">
              {menuTab === 'play' && (
                <div className="space-y-5">
                  {/* Online / Offline Mode Switcher */}
                  <div className="bg-black/50 border border-cyan-400/25 p-1 rounded-xl flex gap-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setIsOnlineMode(false)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-black tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        !isOnlineMode
                          ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(0,212,255,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>OFFLINE (BOTS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOnlineMode(true)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-black tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isOnlineMode
                          ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(0,212,255,0.4)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>ONLINE MULTIPLAYER</span>
                    </button>
                  </div>

                  {/* Offline Creator Settings */}
                  {!isOnlineMode && (
                    <div className="bg-cyan-950/20 border border-cyan-400/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-cyan-400" />
                          Offline Match Creator Settings
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-black/60 px-2 py-0.5 rounded border border-cyan-400/30">
                          SOLO SIMULATION
                        </span>
                      </div>

                      {/* Offline Team Faction & Weapon Loadout */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Player Team Faction & Arsenal</span>
                          </label>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            offlineTeam === 'red'
                              ? 'text-rose-300 bg-rose-950/80 border-rose-500/40 shadow-[0_0_8px_rgba(255,42,109,0.3)]'
                              : 'text-cyan-300 bg-cyan-950/80 border-cyan-400/40 shadow-[0_0_8px_rgba(0,212,255,0.3)]'
                          }`}>
                            {offlineTeam === 'red' ? 'TEAM RED (AK-47 • VECTOR • ST870 • AWP)' : 'TEAM BLUE (M4 • UMP-45 • DP-12 • M107)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetOfflineTeam('blue')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              offlineTeam === 'blue'
                                ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.35)] ring-1 ring-cyan-400/50'
                                : 'bg-black/40 border-white/10 text-slate-400 hover:border-cyan-400/30'
                            }`}
                          >
                            <div className="text-xs font-black tracking-wider flex items-center justify-between">
                              <span>TEAM BLUE</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">CYAN</span>
                            </div>
                            <div className="text-[10px] text-slate-300 mt-1">
                              AR: <span className="text-cyan-300 font-bold">M4</span> • SMG: <span className="text-cyan-300 font-bold">UMP-45</span>
                            </div>
                            <div className="text-[10px] text-slate-300">
                              SG: <span className="text-cyan-300 font-bold">DP-12</span> • SNP: <span className="text-cyan-300 font-bold">M107</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetOfflineTeam('red')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              offlineTeam === 'red'
                                ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(255,42,109,0.35)] ring-1 ring-rose-500/50'
                                : 'bg-black/40 border-white/10 text-slate-400 hover:border-rose-400/30'
                            }`}
                          >
                            <div className="text-xs font-black tracking-wider flex items-center justify-between">
                              <span>TEAM RED</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">CRIMSON</span>
                            </div>
                            <div className="text-[10px] text-slate-300 mt-1">
                              AR: <span className="text-rose-300 font-bold">AK-47</span> • SMG: <span className="text-rose-300 font-bold">VECTOR</span>
                            </div>
                            <div className="text-[10px] text-slate-300">
                              SG: <span className="text-rose-300 font-bold">ST870</span> • SNP: <span className="text-rose-300 font-bold">AWP</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Offline Match Duration Setting (1 to 30 minutes) */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Match Duration Limit</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">1 - 30 MIN</span>
                            <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40 shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                              {offlineMatchDuration} MIN ({formatMatchTime(offlineMatchDuration * 60)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSetOfflineMatchDuration(offlineMatchDuration - 1)}
                            disabled={offlineMatchDuration <= 1}
                            className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                            title="Decrease 1 minute"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 relative flex items-center">
                            <input
                              type="range"
                              min="1"
                              max="30"
                              step="1"
                              value={offlineMatchDuration}
                              onChange={(e) => handleSetOfflineMatchDuration(Number(e.target.value))}
                              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSetOfflineMatchDuration(offlineMatchDuration + 1)}
                            disabled={offlineMatchDuration >= 30}
                            className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                            title="Increase 1 minute"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          {[1, 3, 5, 10, 15, 20, 30].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => handleSetOfflineMatchDuration(mins)}
                              className={`flex-1 py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                offlineMatchDuration === mins
                                  ? 'bg-cyan-500 text-black border border-cyan-300 shadow-[0_0_10px_#00d4ff]'
                                  : 'bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/30'
                              }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Offline Match Target Score Setting (Higher Target Score to prevent quick matches) */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Match Target Score Limit</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                              {gameMode === 'tdm'
                                ? `${targetScoreTdm} PTS (${Math.round(targetScoreTdm / 10)} KILLS)`
                                : gameMode === 'dom'
                                ? `${targetScoreDom} PTS (FLAGS)`
                                : `${targetScoreFfa} PTS (${Math.round(targetScoreFfa / 100)} KILLS)`}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Increased target score ensures intense, longer tactical combat so matches never end prematurely.
                        </p>

                        {/* Adjuster based on gameMode */}
                        {gameMode === 'tdm' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleSetTargetScoreTdm(targetScoreTdm - 50)}
                                disabled={targetScoreTdm <= 200}
                                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                                title="Decrease 50 points (5 kills)"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex-1 relative flex items-center">
                                <input
                                  type="range"
                                  min="200"
                                  max="2000"
                                  step="50"
                                  value={targetScoreTdm}
                                  onChange={(e) => handleSetTargetScoreTdm(Number(e.target.value))}
                                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSetTargetScoreTdm(targetScoreTdm + 50)}
                                disabled={targetScoreTdm >= 2000}
                                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                                title="Increase 50 points (5 kills)"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-5 gap-1 pt-0.5">
                              {[
                                { score: 500, label: '500 (50k)' },
                                { score: 750, label: '750 (75k)' },
                                { score: 1000, label: '1,000 (100k)' },
                                { score: 1500, label: '1,500 (150k)' },
                                { score: 2000, label: '2,000 (200k)' }
                              ].map((opt) => (
                                <button
                                  key={opt.score}
                                  type="button"
                                  onClick={() => handleSetTargetScoreTdm(opt.score)}
                                  className={`py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                    targetScoreTdm === opt.score
                                      ? 'bg-amber-400 text-black border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-bold'
                                      : 'bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:border-amber-400/30'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : gameMode === 'dom' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleSetTargetScoreDom(targetScoreDom - 50)}
                                disabled={targetScoreDom <= 200}
                                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                                title="Decrease 50 points"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex-1 relative flex items-center">
                                <input
                                  type="range"
                                  min="200"
                                  max="2000"
                                  step="50"
                                  value={targetScoreDom}
                                  onChange={(e) => handleSetTargetScoreDom(Number(e.target.value))}
                                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSetTargetScoreDom(targetScoreDom + 50)}
                                disabled={targetScoreDom >= 2000}
                                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                                title="Increase 50 points"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-5 gap-1 pt-0.5">
                              {[
                                { score: 300, label: '300 PTS' },
                                { score: 500, label: '500 PTS' },
                                { score: 750, label: '750 PTS' },
                                { score: 1000, label: '1,000 PTS' },
                                { score: 1500, label: '1,500 PTS' }
                              ].map((opt) => (
                                <button
                                  key={opt.score}
                                  type="button"
                                  onClick={() => handleSetTargetScoreDom(opt.score)}
                                  className={`py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                    targetScoreDom === opt.score
                                      ? 'bg-amber-400 text-black border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-bold'
                                      : 'bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:border-amber-400/30'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleSetTargetScoreFfa(targetScoreFfa - 250)}
                                disabled={targetScoreFfa <= 1000}
                                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                                title="Decrease 250 score"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex-1 relative flex items-center">
                                <input
                                  type="range"
                                  min="1000"
                                  max="10000"
                                  step="250"
                                  value={targetScoreFfa}
                                  onChange={(e) => handleSetTargetScoreFfa(Number(e.target.value))}
                                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSetTargetScoreFfa(targetScoreFfa + 250)}
                                disabled={targetScoreFfa >= 10000}
                                className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                                title="Increase 250 score"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-5 gap-1 pt-0.5">
                              {[
                                { score: 2000, label: '2,000 (20k)' },
                                { score: 3500, label: '3,500 (35k)' },
                                { score: 5000, label: '5,000 (50k)' },
                                { score: 7500, label: '7,500 (75k)' },
                                { score: 10000, label: '10,000 (100k)' }
                              ].map((opt) => (
                                <button
                                  key={opt.score}
                                  type="button"
                                  onClick={() => handleSetTargetScoreFfa(opt.score)}
                                  className={`py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                    targetScoreFfa === opt.score
                                      ? 'bg-amber-400 text-black border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-bold'
                                      : 'bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:border-amber-400/30'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Offline AI Bot Combatants */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            <span>AI Bot Combatants</span>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/30">
                            {settings.botCount} ACTIVE BOTS
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[4, 8, 12, 16, 20].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => {
                                setDraftSettings((prev) => ({ ...prev, botCount: cnt }));
                                setSettings((prev) => ({ ...prev, botCount: cnt }));
                                if (engineRef.current) engineRef.current.setBotCount(cnt);
                              }}
                              className={`py-1.5 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer ${
                                settings.botCount === cnt
                                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_10px_#00d4ff]'
                                  : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                              }`}
                            >
                              {cnt} BOTS
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Offline Bot Smartness (1 to 10) - Separate Friendly and Enemy Controls */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Bot Smartness & Difficulty (1 - 10)</span>
                          </label>
                          <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                            10 = HARDEST
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Tune AI combat intelligence separately for both teams from 1 (slow reactions, low accuracy) to 10 (laser aim, instant reaction time, dodging, tactical strafing, and high damage).
                        </p>

                        {/* Separate Control 1: Friendly / Your Team Bots */}
                        <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-400/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3 h-3 text-cyan-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                                Your Team's Bots Smartness
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                                getSmartnessTag(offlineAllySmartness).bgCol
                              } ${getSmartnessTag(offlineAllySmartness).textCol} ${
                                getSmartnessTag(offlineAllySmartness).borderCol
                              }`}
                            >
                              LVL {offlineAllySmartness} • {getSmartnessTag(offlineAllySmartness).name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSetOfflineAllySmartness(offlineAllySmartness - 1)}
                              disabled={offlineAllySmartness <= 1}
                              className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                              title="Decrease friendly smartness"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={offlineAllySmartness}
                              onChange={(e) => handleSetOfflineAllySmartness(Number(e.target.value))}
                              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetOfflineAllySmartness(offlineAllySmartness + 1)}
                              disabled={offlineAllySmartness >= 10}
                              className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                              title="Increase friendly smartness"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Quick Presets */}
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            {[1, 3, 5, 8, 10].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleSetOfflineAllySmartness(lvl)}
                                className={`flex-1 py-1 rounded text-[9px] font-bold tracking-wider transition-all cursor-pointer ${
                                  offlineAllySmartness === lvl
                                    ? 'bg-cyan-500 text-black border border-cyan-300 font-black shadow-[0_0_8px_#00d4ff]'
                                    : 'bg-black/50 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/30'
                                }`}
                              >
                                {lvl === 1 ? '1 (Recruit)' : lvl === 10 ? '10 (Hardest)' : `Lvl ${lvl}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Separate Control 2: Enemy Team Bots */}
                        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Swords className="w-3 h-3 text-rose-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                                Enemy Team's Bots Smartness
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                                getSmartnessTag(offlineEnemySmartness).bgCol
                              } ${getSmartnessTag(offlineEnemySmartness).textCol} ${
                                getSmartnessTag(offlineEnemySmartness).borderCol
                              }`}
                            >
                              LVL {offlineEnemySmartness} • {getSmartnessTag(offlineEnemySmartness).name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSetOfflineEnemySmartness(offlineEnemySmartness - 1)}
                              disabled={offlineEnemySmartness <= 1}
                              className="w-7 h-7 rounded-lg bg-black/70 hover:bg-rose-950 border border-rose-500/30 disabled:opacity-40 disabled:pointer-events-none text-rose-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                              title="Decrease enemy smartness"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={offlineEnemySmartness}
                              onChange={(e) => handleSetOfflineEnemySmartness(Number(e.target.value))}
                              className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetOfflineEnemySmartness(offlineEnemySmartness + 1)}
                              disabled={offlineEnemySmartness >= 10}
                              className="w-7 h-7 rounded-lg bg-black/70 hover:bg-rose-950 border border-rose-500/30 disabled:opacity-40 disabled:pointer-events-none text-rose-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                              title="Increase enemy smartness"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Quick Presets */}
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            {[1, 3, 5, 8, 10].map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleSetOfflineEnemySmartness(lvl)}
                                className={`flex-1 py-1 rounded text-[9px] font-bold tracking-wider transition-all cursor-pointer ${
                                  offlineEnemySmartness === lvl
                                    ? 'bg-rose-500 text-black border border-rose-300 font-black shadow-[0_0_8px_#ff2a6d]'
                                    : 'bg-black/50 border border-white/10 text-slate-400 hover:text-white hover:border-rose-500/30'
                                }`}
                              >
                                {lvl === 1 ? '1 (Recruit)' : lvl === 10 ? '10 (Hardest)' : `Lvl ${lvl}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Online Multiplayer Room & Profile Settings */}
                  {isOnlineMode && (
                    <div className="bg-cyan-950/25 border border-cyan-400/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                          Multiplayer Relay Network
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold bg-black/60 px-2 py-0.5 rounded border border-cyan-400/30">
                          WS PROTOCOL LIVE
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-300 uppercase block mb-1">
                            Player Callsign
                          </label>
                          <input
                            type="text"
                            value={callsign}
                            maxLength={16}
                            onChange={(e) => setCallsign(e.target.value)}
                            placeholder="OPERATIVE"
                            className="w-full bg-black/60 border border-cyan-400/30 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-bold font-mono tracking-wide"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-300 uppercase block mb-1">
                            Lobby / Room
                          </label>
                          <input
                            type="text"
                            value={onlineRoom}
                            maxLength={20}
                            onChange={(e) => setOnlineRoom(e.target.value)}
                            placeholder="CyberArena1"
                            className="w-full bg-black/60 border border-cyan-400/30 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-bold font-mono tracking-wide"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-300 uppercase block mb-1">
                          Team Faction
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setOnlineTeam('blue')}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              onlineTeam === 'blue'
                                ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.35)] ring-1 ring-cyan-400/50'
                                : 'bg-black/40 border-white/10 text-slate-400'
                            }`}
                          >
                            <div className="text-xs font-black tracking-wider flex items-center justify-between">
                              <span>TEAM BLUE</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">CYAN</span>
                            </div>
                            <div className="text-[10px] text-slate-300 mt-0.5">
                              M4 • UMP-45 • DP-12 • M107
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOnlineTeam('red')}
                            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                              onlineTeam === 'red'
                                ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(255,42,109,0.35)] ring-1 ring-rose-500/50'
                                : 'bg-black/40 border-white/10 text-slate-400'
                            }`}
                          >
                            <div className="text-xs font-black tracking-wider flex items-center justify-between">
                              <span>TEAM RED</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">CRIMSON</span>
                            </div>
                            <div className="text-[10px] text-slate-300 mt-0.5">
                              AK-47 • VECTOR • ST870 • AWP
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Online Server AI Bots Options */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Server AI Bots Option</span>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-slate-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/30">
                            {onlineEnableBots ? `${onlineBotCount} AI BOTS` : 'NO BOTS (PVP ONLY)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setOnlineEnableBots(true)}
                            className={`py-2 rounded-lg border text-xs font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              onlineEnableBots
                                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                                : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            <span>ENABLE BOTS</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOnlineEnableBots(false)}
                            className={`py-2 rounded-lg border text-xs font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              !onlineEnableBots
                                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(255,42,109,0.4)]'
                                : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <X className="w-3.5 h-3.5 text-rose-400" />
                            <span>NO BOTS (PVP)</span>
                          </button>
                        </div>

                        {onlineEnableBots && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Bot Count:</span>
                              <span className="font-mono text-cyan-300 font-black">{onlineBotCount} Combatants</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[2, 4, 6, 8, 12, 16].slice(0, 4).map((cnt) => (
                                <button
                                  key={cnt}
                                  type="button"
                                  onClick={() => setOnlineBotCount(cnt)}
                                  className={`py-1.5 rounded-lg border text-xs font-black tracking-wider transition-all cursor-pointer ${
                                    onlineBotCount === cnt
                                      ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_10px_#00d4ff]'
                                      : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {cnt} BOTS
                                </button>
                              ))}
                            </div>

                            {/* Online Server Bot Smartness (1 to 10) - Separate Friendly and Enemy Controls */}
                            <div className="pt-2 space-y-2.5 border-t border-cyan-400/15">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Server Bot Smartness (1 - 10)</span>
                                </label>
                                <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                                  10 = HARDEST
                                </span>
                              </div>

                              {/* Separate Online Control 1: Friendly / Your Team Bots */}
                              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-400/20 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Shield className="w-3 h-3 text-cyan-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                                      Your Team's Bots Smartness
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${
                                      getSmartnessTag(onlineAllySmartness).bgCol
                                    } ${getSmartnessTag(onlineAllySmartness).textCol} ${
                                      getSmartnessTag(onlineAllySmartness).borderCol
                                    }`}
                                  >
                                    LVL {onlineAllySmartness} • {getSmartnessTag(onlineAllySmartness).name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSetOnlineAllySmartness(onlineAllySmartness - 1)}
                                    disabled={onlineAllySmartness <= 1}
                                    className="w-6 h-6 rounded bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                                    title="Decrease friendly smartness"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={onlineAllySmartness}
                                    onChange={(e) => handleSetOnlineAllySmartness(Number(e.target.value))}
                                    className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSetOnlineAllySmartness(onlineAllySmartness + 1)}
                                    disabled={onlineAllySmartness >= 10}
                                    className="w-6 h-6 rounded bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                                    title="Increase friendly smartness"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  {[1, 3, 5, 8, 10].map((lvl) => (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() => handleSetOnlineAllySmartness(lvl)}
                                      className={`flex-1 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all cursor-pointer ${
                                        onlineAllySmartness === lvl
                                          ? 'bg-cyan-500 text-black border border-cyan-300 font-black shadow-[0_0_6px_#00d4ff]'
                                          : 'bg-black/50 border border-white/10 text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {lvl === 1 ? '1' : lvl === 10 ? '10 (Max)' : `${lvl}`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Separate Online Control 2: Enemy Team Bots */}
                              <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Swords className="w-3 h-3 text-rose-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                                      Enemy Team's Bots Smartness
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${
                                      getSmartnessTag(onlineEnemySmartness).bgCol
                                    } ${getSmartnessTag(onlineEnemySmartness).textCol} ${
                                      getSmartnessTag(onlineEnemySmartness).borderCol
                                    }`}
                                  >
                                    LVL {onlineEnemySmartness} • {getSmartnessTag(onlineEnemySmartness).name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSetOnlineEnemySmartness(onlineEnemySmartness - 1)}
                                    disabled={onlineEnemySmartness <= 1}
                                    className="w-6 h-6 rounded bg-black/70 hover:bg-rose-950 border border-rose-500/30 disabled:opacity-40 disabled:pointer-events-none text-rose-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                                    title="Decrease enemy smartness"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={onlineEnemySmartness}
                                    onChange={(e) => handleSetOnlineEnemySmartness(Number(e.target.value))}
                                    className="w-full accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSetOnlineEnemySmartness(onlineEnemySmartness + 1)}
                                    disabled={onlineEnemySmartness >= 10}
                                    className="w-6 h-6 rounded bg-black/70 hover:bg-rose-950 border border-rose-500/30 disabled:opacity-40 disabled:pointer-events-none text-rose-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                                    title="Increase enemy smartness"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  {[1, 3, 5, 8, 10].map((lvl) => (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() => handleSetOnlineEnemySmartness(lvl)}
                                      className={`flex-1 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all cursor-pointer ${
                                        onlineEnemySmartness === lvl
                                          ? 'bg-rose-500 text-black border border-rose-300 font-black shadow-[0_0_6px_#ff2a6d]'
                                          : 'bg-black/50 border border-white/10 text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {lvl === 1 ? '1' : lvl === 10 ? '10 (Max)' : `${lvl}`}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Online Match Duration Setting (1 to 30 minutes) */}
                      <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/25 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Online Match Duration Limit</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">1 - 30 MIN</span>
                            <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40 shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                              {onlineMatchDuration} MIN ({formatMatchTime(onlineMatchDuration * 60)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSetOnlineMatchDuration(onlineMatchDuration - 1)}
                            disabled={onlineMatchDuration <= 1}
                            className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                            title="Decrease 1 minute"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 relative flex items-center">
                            <input
                              type="range"
                              min="1"
                              max="30"
                              step="1"
                              value={onlineMatchDuration}
                              onChange={(e) => handleSetOnlineMatchDuration(Number(e.target.value))}
                              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSetOnlineMatchDuration(onlineMatchDuration + 1)}
                            disabled={onlineMatchDuration >= 30}
                            className="w-7 h-7 rounded-lg bg-black/70 hover:bg-cyan-950 border border-cyan-400/30 disabled:opacity-40 disabled:pointer-events-none text-cyan-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all shadow-[0_0_6px_rgba(0,212,255,0.2)]"
                            title="Increase 1 minute"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          {[1, 3, 5, 10, 15, 20, 30].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => handleSetOnlineMatchDuration(mins)}
                              className={`flex-1 py-1 rounded-md text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                                onlineMatchDuration === mins
                                  ? 'bg-cyan-500 text-black border border-cyan-300 shadow-[0_0_10px_#00d4ff]'
                                  : 'bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/30'
                              }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Primary Weapon Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-extrabold tracking-widest uppercase text-cyan-300">
                        Primary Weapon Class
                      </div>
                      {currentUser.isGuest && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          GUEST ARSENAL (AR & SMG ONLY)
                        </span>
                      )}
                    </div>

                    {currentUser.isGuest && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 border border-amber-400/40 mb-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-[11px] text-amber-200">
                            <strong className="text-amber-300">Guest Restriction:</strong> Assault Rifle & Submachine Gun available. Create or Sign In to an account to unlock Shotgun & Sniper.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAuthModal(true)}
                          className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_10px_#00d4ff] transition-all shrink-0 ml-2"
                        >
                          Sign In / Sign Up
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Assault Rifle */}
                      <div
                        onClick={() => handleSelectWeapon('ar')}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                          weaponClass === 'ar'
                            ? effectiveTeam === 'red'
                              ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_16px_rgba(255,42,109,0.3)] ring-1 ring-rose-500/50'
                              : 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,212,255,0.3)] ring-1 ring-cyan-400/50'
                            : 'bg-black/30 border-white/10 hover:border-cyan-400/40'
                        }`}
                      >
                        <div className={`h-10 rounded-lg mb-2 flex items-center justify-center ${
                          effectiveTeam === 'red'
                            ? 'bg-gradient-to-br from-[#2e050f] to-[#8a0028]'
                            : 'bg-gradient-to-br from-[#001a2e] to-[#005c8a]'
                        }`}>
                          <Zap className={`w-5 h-5 ${effectiveTeam === 'red' ? 'text-rose-300' : 'text-cyan-300'}`} />
                        </div>
                        <div className="text-xs font-black tracking-wider">ASSAULT RIFLE</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Balanced & auto</div>
                      </div>

                      {/* Submachine Gun */}
                      <div
                        onClick={() => handleSelectWeapon('smg')}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                          weaponClass === 'smg'
                            ? effectiveTeam === 'red'
                              ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_16px_rgba(255,42,109,0.3)] ring-1 ring-rose-500/50'
                              : 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,212,255,0.3)] ring-1 ring-cyan-400/50'
                            : 'bg-black/30 border-white/10 hover:border-cyan-400/40'
                        }`}
                      >
                        <div className={`h-10 rounded-lg mb-2 flex items-center justify-center ${
                          effectiveTeam === 'red'
                            ? 'bg-gradient-to-br from-[#2a0518] to-[#9c0548]'
                            : 'bg-gradient-to-br from-[#00281a] to-[#00b070]'
                        }`}>
                          <Zap className={`w-5 h-5 ${effectiveTeam === 'red' ? 'text-rose-300' : 'text-emerald-300'}`} />
                        </div>
                        <div className="text-xs font-black tracking-wider">SUBMACHINE GUN</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">High fire rate</div>
                      </div>

                      {/* Combat Shotgun */}
                      {currentUser.isGuest ? (
                        <div
                          onClick={() => setShowAuthModal(true)}
                          className="relative p-3 rounded-xl border border-white/10 bg-black/40 text-center opacity-70 cursor-pointer hover:border-amber-400/60 hover:opacity-95 transition-all group overflow-hidden"
                          title="Account required: Sign In or Sign Up to unlock Combat Shotgun"
                        >
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center z-10 p-1">
                            <Lock className="w-5 h-5 text-amber-400 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase text-amber-300">Account Required</span>
                            <span className="text-[8px] text-slate-300">Click to Unlock</span>
                          </div>
                          <div className="h-10 rounded-lg mb-2 bg-gradient-to-br from-[#2a0a05] to-[#d05000] flex items-center justify-center">
                            <Flame className="w-5 h-5 text-orange-400" />
                          </div>
                          <div className="text-xs font-black tracking-wider text-slate-400">COMBAT SHOTGUN</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">1-Shot Point Blank</div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleSelectWeapon('shotgun')}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                            weaponClass === 'shotgun'
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,212,255,0.3)] ring-1 ring-cyan-400/50'
                              : 'bg-black/30 border-white/10 hover:border-cyan-400/40'
                          }`}
                        >
                          <div className="h-10 rounded-lg mb-2 bg-gradient-to-br from-[#2a0a05] to-[#d05000] flex items-center justify-center">
                            <Flame className="w-5 h-5 text-orange-400" />
                          </div>
                          <div className="text-xs font-black tracking-wider">COMBAT SHOTGUN</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">1-Shot Point Blank</div>
                        </div>
                      )}

                      {/* Sniper Rifle */}
                      {currentUser.isGuest ? (
                        <div
                          onClick={() => setShowAuthModal(true)}
                          className="relative p-3 rounded-xl border border-white/10 bg-black/40 text-center opacity-70 cursor-pointer hover:border-amber-400/60 hover:opacity-95 transition-all group overflow-hidden"
                          title="Account required: Sign In or Sign Up to unlock Sniper Rifle"
                        >
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center z-10 p-1">
                            <Lock className="w-5 h-5 text-amber-400 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase text-amber-300">Account Required</span>
                            <span className="text-[8px] text-slate-300">Click to Unlock</span>
                          </div>
                          <div className="h-10 rounded-lg mb-2 bg-gradient-to-br from-[#1a0030] to-[#7a3cff] flex items-center justify-center">
                            <Target className="w-5 h-5 text-purple-300" />
                          </div>
                          <div className="text-xs font-black tracking-wider text-slate-400">SNIPER RIFLE</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Scoped lethal zoom</div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleSelectWeapon('sniper')}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                            weaponClass === 'sniper'
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,212,255,0.3)] ring-1 ring-cyan-400/50'
                              : 'bg-black/30 border-white/10 hover:border-cyan-400/40'
                          }`}
                        >
                          <div className="h-10 rounded-lg mb-2 bg-gradient-to-br from-[#1a0030] to-[#7a3cff] flex items-center justify-center">
                            <Target className="w-5 h-5 text-purple-300" />
                          </div>
                          <div className="text-xs font-black tracking-wider text-purple-200">SNIPER RIFLE</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Scoped lethal zoom</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Battlefield Selection */}
                  <div>
                    <div className="text-[11px] font-extrabold tracking-widest uppercase text-cyan-300 mb-2">
                      Battlefield
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {Object.entries(MAP_CONFIGS).map(([key, map]) => (
                        <div
                          key={key}
                          onClick={() => handleSelectMap(key as MapKey)}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                            mapKey === key
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_14px_rgba(0,212,255,0.3)]'
                              : 'bg-black/30 border-white/10 hover:border-cyan-400/30'
                          }`}
                        >
                          <div className="text-xs font-black tracking-wider">{map.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{map.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Game Mode */}
                  <div>
                    <div className="text-[11px] font-extrabold tracking-widest uppercase text-cyan-300 mb-1.5">
                      Combat Mode
                    </div>
                    <select
                      value={gameMode}
                      onChange={(e) => setGameMode(e.target.value as any)}
                      className="w-full bg-black/50 border border-cyan-400/25 rounded-lg px-3 py-2.5 text-sm text-cyan-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="ffa" className="bg-[#0a0f18]">Free-For-All (Classic Deathmatch)</option>
                      <option value="tdm" className="bg-[#0a0f18]">Team Deathmatch (Blue vs Red)</option>
                      <option value="dom" className="bg-[#0a0f18]">Domination (Capture Control Points)</option>
                    </select>
                  </div>

                  {/* Deploy Button */}
                  <button
                    onClick={handleStartGame}
                    className="w-full py-4 rounded-xl text-lg font-black italic tracking-widest uppercase text-white bg-gradient-to-r from-[#00e5ff] via-[#0066ff] to-[#7a2dff] shadow-[0_8px_25px_rgba(0,212,255,0.4)] hover:shadow-[0_12px_35px_rgba(0,212,255,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    ENTER COMBAT
                  </button>

                  {/* Controls helper */}
                  <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-white/10 text-[11px] text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">WASD</span>Move</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">LMB</span>Fire</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">RMB</span>Scope / ADS</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">SPACE</span>Jump</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">SHIFT</span>Slide</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">R</span>Reload</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">1 - 5 / WHEEL</span>Weapons & Explosives</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">TAB</span>Scoreboard</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-400/30 text-cyan-200 font-bold text-[10px]">ESC</span>Pause</div>
                  </div>
                </div>
              )}

              {menuTab === 'servers' && (
                <ServerBrowserView
                  onJoinServer={handleJoinServerFromBrowser}
                  onHostServer={() => {
                    setIsOnlineMode(true);
                    setMenuTab('play');
                  }}
                  currentCallsign={callsign}
                />
              )}

              {menuTab === 'shop' && (
                currentUser.isGuest ? (
                  <div className="p-8 text-center bg-black/50 border border-amber-400/30 rounded-2xl space-y-4 my-2 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950/70 border border-amber-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                      <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-black uppercase tracking-wider text-amber-300">
                        Cyber Shop Locked For Guest Accounts
                      </h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Guest accounts are only permitted on the <strong className="text-white">Deploy</strong> and <strong className="text-white">Servers</strong> pages. Sign in or create an operator account in the upper-left corner to unlock weapon skins, operative models, tactical gloves, and explosive effects!
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAuthModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Sign In / Sign Up to Unlock
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuTab('play')}
                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Back to Deploy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <CosmeticsShopView
                      cscCoins={cscCoins}
                      ownedCosmetics={ownedCosmetics}
                      equippedCosmetics={equippedCosmetics}
                      onBuyOrEquip={handleBuyOrEquipCosmetic}
                    />
                  </div>
                )
              )}

              {menuTab === 'settings' && (
                currentUser.isGuest ? (
                  <div className="p-8 text-center bg-black/50 border border-amber-400/30 rounded-2xl space-y-4 my-2 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950/70 border border-amber-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                      <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-black uppercase tracking-wider text-amber-300">
                        Settings Locked For Guest Accounts
                      </h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Guest accounts only have access to the <strong className="text-white">Deploy</strong> and <strong className="text-white">Servers</strong> pages. Create or sign in to an operator account in the upper-left corner to customize and permanently save your combat sensitivity, audio, graphics, and FOV preferences!
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAuthModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Sign In / Sign Up to Unlock
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuTab('play')}
                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Back to Deploy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                  {/* Top Navigation & Status Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <button
                      type="button"
                      onClick={handleBackFromSettings}
                      className="px-3 py-1.5 rounded-lg bg-black/60 border border-cyan-400/40 text-cyan-300 hover:text-white hover:border-cyan-400 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                      title="Back to Deploy (discards unsaved accidental changes)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges ? (
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded animate-pulse">
                          UNSAVED CHANGES
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded">
                          ALL SETTINGS SAVED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* FOV */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Field of View</span>
                    <input
                      type="range"
                      min="60"
                      max="120"
                      step="1"
                      value={draftSettings.fov}
                      onChange={(e) => setDraftSettings({ ...draftSettings, fov: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.fov}°</span>
                  </div>

                  {/* Mouse Sens */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Sensitivity</span>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={draftSettings.sens}
                      onChange={(e) => setDraftSettings({ ...draftSettings, sens: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.sens.toFixed(2)}</span>
                  </div>

                  {/* Sniper Scope Zoom */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Sniper Zoom</span>
                    <input
                      type="range"
                      min="12"
                      max="45"
                      step="1"
                      value={draftSettings.scopeZoom}
                      onChange={(e) => setDraftSettings({ ...draftSettings, scopeZoom: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.scopeZoom}×</span>
                  </div>

                  {/* Weapon Sway */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Weapon Sway</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={draftSettings.swayIntensity}
                      onChange={(e) => setDraftSettings({ ...draftSettings, swayIntensity: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.swayIntensity.toFixed(2)}</span>
                  </div>

                  {/* Screen Shake */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Screen Shake</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={draftSettings.shakeIntensity}
                      onChange={(e) => setDraftSettings({ ...draftSettings, shakeIntensity: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.shakeIntensity.toFixed(2)}</span>
                  </div>

                  {/* Graphics Quality Changer: Low, Medium, High, Ultra */}
                  <div className="bg-black/40 border border-cyan-400/25 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-cyan-300" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Graphics Quality Preset</span>
                      </div>
                      <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40">
                        {draftSettings.graphicsPreset || 'high'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDraftSettings({ ...draftSettings, graphicsPreset: preset })}
                          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            (draftSettings.graphicsPreset || 'high') === preset
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-300 text-white shadow-[0_0_14px_rgba(0,212,255,0.5)]'
                              : 'bg-black/50 border-white/10 text-slate-400 hover:text-white hover:border-cyan-400/40'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {(draftSettings.graphicsPreset === 'low') && '⚡ Low: Maximum FPS • 1.0x DPR • No dynamic shadows • Post-FX off'}
                      {(draftSettings.graphicsPreset === 'medium') && '⚖ Medium: Balanced performance • 1.15x DPR • Basic shadows • Mild bloom'}
                      {((draftSettings.graphicsPreset === 'high') || !draftSettings.graphicsPreset) && '✨ High: Enhanced fidelity • 1.5x DPR • PCF soft shadows • Bloom & FXAA'}
                      {(draftSettings.graphicsPreset === 'ultra') && '👑 Ultra: Cinematic master • 2.0x native DPR • 2K soft shadows • Max bloom'}
                    </div>
                  </div>

                  {/* Bloom Glow */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Bloom Glow</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={draftSettings.bloom}
                      onChange={(e) => setDraftSettings({ ...draftSettings, bloom: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.bloom.toFixed(2)}</span>
                  </div>

                  {/* Bot Count */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Bot Count</span>
                    <input
                      type="range"
                      min="4"
                      max="24"
                      step="1"
                      value={draftSettings.botCount}
                      onChange={(e) => setDraftSettings({ ...draftSettings, botCount: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.botCount}</span>
                  </div>

                  {/* Match Duration (1 - 30 minutes) */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Match Duration</span>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={draftSettings.matchDuration || offlineMatchDuration}
                      onChange={(e) => {
                        const val = Math.min(30, Math.max(1, Number(e.target.value)));
                        setDraftSettings({ ...draftSettings, matchDuration: val });
                        handleSetOfflineMatchDuration(val);
                      }}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">
                      {draftSettings.matchDuration || offlineMatchDuration}m
                    </span>
                  </div>

                  {/* Friendly / Ally Bot Smartness (1 - 10) */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Team Bot Lvl</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={draftSettings.allyBotSmartness || offlineAllySmartness}
                      onChange={(e) => {
                        const val = Math.min(10, Math.max(1, Number(e.target.value)));
                        setDraftSettings({ ...draftSettings, allyBotSmartness: val });
                        handleSetOfflineAllySmartness(val);
                      }}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-mono font-bold text-cyan-400 text-right">
                      L{draftSettings.allyBotSmartness || offlineAllySmartness}
                    </span>
                  </div>

                  {/* Enemy Bot Smartness (1 - 10) */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Enemy Bot Lvl</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={draftSettings.enemyBotSmartness || offlineEnemySmartness}
                      onChange={(e) => {
                        const val = Math.min(10, Math.max(1, Number(e.target.value)));
                        setDraftSettings({ ...draftSettings, enemyBotSmartness: val });
                        handleSetOfflineEnemySmartness(val);
                      }}
                      className="w-full accent-rose-500"
                    />
                    <span className="text-xs font-mono font-bold text-rose-400 text-right">
                      L{draftSettings.enemyBotSmartness || offlineEnemySmartness}
                    </span>
                  </div>

                  {/* ADS Mode */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Aim Mode</span>
                    <select
                      value={draftSettings.adsMode}
                      onChange={(e) => setDraftSettings({ ...draftSettings, adsMode: e.target.value as any })}
                      className="bg-black/50 border border-cyan-400/20 rounded-lg px-3 py-1.5 text-xs text-cyan-100 outline-none"
                    >
                      <option value="hold" className="bg-[#0a0f18]">Hold Right Click</option>
                      <option value="toggle" className="bg-[#0a0f18]">Toggle Right Click</option>
                    </select>
                  </div>

                  {/* FPS Counter Toggle */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">FPS Counter</span>
                    <select
                      value={draftSettings.showFps ? 'true' : 'false'}
                      onChange={(e) => setDraftSettings({ ...draftSettings, showFps: e.target.value === 'true' })}
                      className="bg-black/50 border border-cyan-400/20 rounded-lg px-3 py-1.5 text-xs text-cyan-100 outline-none"
                    >
                      <option value="false" className="bg-[#0a0f18]">Hidden</option>
                      <option value="true" className="bg-[#0a0f18]">Shown</option>
                    </select>
                  </div>

                  {/* UI Color */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">UI Accent</span>
                    <input
                      type="color"
                      value={draftSettings.uiColor}
                      onChange={(e) => setDraftSettings({ ...draftSettings, uiColor: e.target.value })}
                      className="h-8 w-24 rounded border border-cyan-400/30 bg-black/40 cursor-pointer"
                    />
                  </div>

                  {/* Notice Alert */}
                  {saveNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-400/70 text-emerald-200 text-xs font-bold tracking-wider text-center animate-in fade-in duration-150 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      {saveNotice}
                    </div>
                  )}

                  {/* Bottom Action Buttons: Apply, Revert / Back, Default */}
                  <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleApplySettings}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wider uppercase text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_4px_16px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply & Save</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevertSettings}
                      disabled={!hasUnsavedChanges}
                      className={`py-2.5 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        hasUnsavedChanges
                          ? 'bg-amber-950/70 border-amber-400/60 text-amber-200 hover:bg-amber-900/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-black/30 border-white/10 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                      title="Undo accidental changes and restore saved settings"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>Revert</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold tracking-wider uppercase bg-black/40 border border-white/15 text-slate-400 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Reset all settings to default factory values"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Default</span>
                    </button>
                  </div>
                </div>
              )
            )}

            {menuTab === 'crosshair' && (
                currentUser.isGuest ? (
                  <div className="p-8 text-center bg-black/50 border border-amber-400/30 rounded-2xl space-y-4 my-2 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950/70 border border-amber-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                      <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-black uppercase tracking-wider text-amber-300">
                        Crosshair Studio Locked For Guest Accounts
                      </h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Custom reticles and crosshair profiles require a registered operator profile. Create or sign in to an account in the upper-left corner to craft and save your tactical reticle crosshair!
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAuthModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Sign In / Sign Up to Unlock
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenuTab('play')}
                        className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Back to Deploy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                  {/* Top Navigation & Status Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <button
                      type="button"
                      onClick={handleBackFromSettings}
                      className="px-3 py-1.5 rounded-lg bg-black/60 border border-cyan-400/40 text-cyan-300 hover:text-white hover:border-cyan-400 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.2)]"
                      title="Back to Deploy (discards unsaved accidental changes)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges ? (
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded animate-pulse">
                          UNSAVED CHANGES
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded">
                          CROSSHAIR SAVED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Crosshair Preview */}
                  <div className="h-32 rounded-xl bg-black/60 border border-cyan-400/20 relative flex items-center justify-center overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                      }}
                    />
                    <div className="relative">
                      {/* Top */}
                      <div
                        className="absolute rounded-sm"
                        style={{
                          backgroundColor: draftSettings.cxColor,
                          width: `${draftSettings.cxThick}px`,
                          height: `${draftSettings.cxSize}px`,
                          left: `${-draftSettings.cxThick / 2}px`,
                          bottom: `${draftSettings.cxGap}px`,
                          boxShadow: `0 0 6px ${draftSettings.cxColor}`
                        }}
                      />
                      {/* Bottom */}
                      <div
                        className="absolute rounded-sm"
                        style={{
                          backgroundColor: draftSettings.cxColor,
                          width: `${draftSettings.cxThick}px`,
                          height: `${draftSettings.cxSize}px`,
                          left: `${-draftSettings.cxThick / 2}px`,
                          top: `${draftSettings.cxGap}px`,
                          boxShadow: `0 0 6px ${draftSettings.cxColor}`
                        }}
                      />
                      {/* Left */}
                      <div
                        className="absolute rounded-sm"
                        style={{
                          backgroundColor: draftSettings.cxColor,
                          height: `${draftSettings.cxThick}px`,
                          width: `${draftSettings.cxSize}px`,
                          top: `${-draftSettings.cxThick / 2}px`,
                          right: `${draftSettings.cxGap}px`,
                          boxShadow: `0 0 6px ${draftSettings.cxColor}`
                        }}
                      />
                      {/* Right */}
                      <div
                        className="absolute rounded-sm"
                        style={{
                          backgroundColor: draftSettings.cxColor,
                          height: `${draftSettings.cxThick}px`,
                          width: `${draftSettings.cxSize}px`,
                          top: `${-draftSettings.cxThick / 2}px`,
                          left: `${draftSettings.cxGap}px`,
                          boxShadow: `0 0 6px ${draftSettings.cxColor}`
                        }}
                      />
                    </div>
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Size</span>
                    <input
                      type="range"
                      min="2"
                      max="36"
                      step="1"
                      value={draftSettings.cxSize}
                      onChange={(e) => setDraftSettings({ ...draftSettings, cxSize: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.cxSize}px</span>
                  </div>

                  {/* Gap */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Gap</span>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={draftSettings.cxGap}
                      onChange={(e) => setDraftSettings({ ...draftSettings, cxGap: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.cxGap}px</span>
                  </div>

                  {/* Thickness */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Thickness</span>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={draftSettings.cxThick}
                      onChange={(e) => setDraftSettings({ ...draftSettings, cxThick: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.cxThick}px</span>
                  </div>

                  {/* Color */}
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Color</span>
                    <input
                      type="color"
                      value={draftSettings.cxColor}
                      onChange={(e) => setDraftSettings({ ...draftSettings, cxColor: e.target.value })}
                      className="h-8 w-24 rounded border border-cyan-400/30 bg-black/40 cursor-pointer"
                    />
                  </div>

                  {/* Notice Alert */}
                  {saveNotice && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-400/70 text-emerald-200 text-xs font-bold tracking-wider text-center animate-in fade-in duration-150 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      {saveNotice}
                    </div>
                  )}

                  {/* Bottom Action Buttons: Apply, Revert / Back, Default */}
                  <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleApplySettings}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wider uppercase text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_4px_16px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply & Save</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevertSettings}
                      disabled={!hasUnsavedChanges}
                      className={`py-2.5 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        hasUnsavedChanges
                          ? 'bg-amber-950/70 border-amber-400/60 text-amber-200 hover:bg-amber-900/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-black/30 border-white/10 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                      title="Undo accidental changes and restore saved settings"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>Revert</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold tracking-wider uppercase bg-black/40 border border-white/15 text-slate-400 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Reset all settings to default factory values"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Default</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    )}

      {/* Pause Menu Screen */}
      {inGame && isPaused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#101826]/95 to-[#060914]/95 border border-cyan-400/30 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_60px_rgba(0,212,255,0.15)] backdrop-blur-2xl overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-80" />

            <div className="pt-6 pb-2 px-6 flex items-center justify-between">
              <div className="w-20 hidden sm:block" />
              <div className="text-center">
                <div className="text-[10px] font-bold tracking-[6px] uppercase text-slate-400">
                  System
                </div>
                <h2 className="text-3xl font-black italic tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-[#00d4ff]">
                  PAUSED
                </h2>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Simulation holding position</span>
                </div>
              </div>

              {/* Pause Header Right: Match Time & Coins */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-black/60 border border-cyan-400/35 px-2.5 py-1 rounded-xl shadow-[0_0_10px_rgba(0,212,255,0.2)]">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-cyan-200">{formatMatchTime(matchTimeRemaining)}</span>
                </div>
                {/* CSC Coins Balance Chip in Pause Menu */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/80 to-yellow-950/80 border border-amber-400/60 px-3 py-1 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-black font-mono text-amber-300">{cscCoins}</span>
                  <span className="text-[9px] font-bold text-amber-400">CSC</span>
                </div>
              </div>
            </div>

            {/* Pause Navigation Tabs */}
            <div className="flex border-b border-white/10 bg-black/30 mt-3 overflow-x-auto">
              <button
                onClick={() => setPauseTab('resume')}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'resume' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Resume
              </button>
              <button
                onClick={() => {
                  if (engineRef.current) {
                    setScoreboardEntries(engineRef.current.getScoreboard());
                  }
                  setPauseTab('scoreboard');
                }}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'scoreboard' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Scoreboard
              </button>
              <button
                onClick={() => setPauseTab('shop')}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'shop' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Shop
              </button>
              <button
                onClick={() => setPauseTab('loadout')}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'loadout' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Loadout
              </button>
              <button
                onClick={() => {
                  setDraftSettings({ ...settings });
                  setPauseTab('settings');
                }}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'settings' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setPauseTab('map')}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'map' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setPauseTab('leave')}
                className={`flex-1 py-3 px-2 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  pauseTab === 'leave' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Leave
              </button>
            </div>

            {/* Pause Body */}
            <div className="p-6 max-h-[55vh] overflow-y-auto">
              {pauseTab === 'resume' && (
                <div className="flex flex-col items-center text-center py-2 space-y-4">
                  <div className="text-3xl text-cyan-400 font-black">❚❚</div>
                  <div className="text-lg font-black italic tracking-widest uppercase">Combat Ready</div>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    Click resume or press ESC to lock aim and return to the firefight immediately.
                  </p>

                  <button
                    onClick={handleResumeGame}
                    className="w-full max-w-xs py-3.5 rounded-xl text-base font-black italic tracking-widest uppercase text-white bg-gradient-to-r from-[#00e5ff] via-[#0066ff] to-[#7a2dff] shadow-[0_8px_25px_rgba(0,212,255,0.4)] hover:scale-[1.02] cursor-pointer"
                  >
                    RESUME COMBAT
                  </button>

                  {/* Quick Server Bot Control & Graphics Card in Pause Menu */}
                  <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                    {/* Bot Controls */}
                    <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Server Bots</span>
                        </div>
                        <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40">
                          {serverBotCount}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleRemoveBot}
                          className="flex-1 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAddBot}
                          className="flex-1 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 hover:text-white text-xs font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Bot</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Graphics Changer */}
                    <div className="p-3 rounded-xl bg-black/60 border border-cyan-400/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                          <Monitor className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Graphics</span>
                        </div>
                        <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40">
                          {settings.graphicsPreset || 'high'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['low', 'medium', 'high', 'ultra'] as const).map((preset) => {
                          const isActive = (settings.graphicsPreset || 'high') === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSetGraphicsPreset(preset)}
                              className={`py-1 rounded text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_8px_#00d4ff]'
                                  : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                              }`}
                            >
                              {preset === 'medium' ? 'MED' : preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pauseTab === 'scoreboard' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <ScoreboardView
                    entries={scoreboardEntries}
                    gamemode={gameMode}
                    blueScore={blueScore}
                    redScore={redScore}
                  />
                </div>
              )}

              {pauseTab === 'shop' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <CosmeticsShopView
                    cscCoins={cscCoins}
                    ownedCosmetics={ownedCosmetics}
                    equippedCosmetics={equippedCosmetics}
                    onBuyOrEquip={handleBuyOrEquipCosmetic}
                  />
                </div>
              )}

              {pauseTab === 'loadout' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Switch Primary Weapon (Instant Refill)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSelectWeapon('ar')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        weaponClass === 'ar'
                          ? effectiveTeam === 'red'
                            ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                            : 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                          : 'bg-black/30 border-white/10 hover:border-cyan-400/30'
                      }`}
                    >
                      <div className="font-black text-sm">ASSAULT RIFLE</div>
                      <div className="text-[10px] text-slate-400">Rapid full-auto fire</div>
                    </button>
                    <button
                      onClick={() => handleSelectWeapon('smg')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        weaponClass === 'smg'
                          ? effectiveTeam === 'red'
                            ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                            : 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                          : 'bg-black/30 border-white/10 hover:border-cyan-400/30'
                      }`}
                    >
                      <div className="font-black text-sm">SUBMACHINE GUN</div>
                      <div className="text-[10px] text-slate-400">Extreme fire rate, mobility</div>
                    </button>
                    {currentUser.isGuest ? (
                      <button
                        onClick={() => {
                          setIsPaused(false);
                          setInGame(false);
                          setShowAuthModal(true);
                        }}
                        className="p-3 rounded-xl border border-white/10 bg-black/40 text-left opacity-60 hover:opacity-85 transition-all group cursor-pointer"
                        title="Combat Shotgun is locked for Guest accounts. Click to Sign In"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-black text-sm text-slate-400">COMBAT SHOTGUN</div>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="text-[10px] text-amber-300/80">Account Required (Guest Locked)</div>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectWeapon('shotgun')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          weaponClass === 'shotgun'
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                            : 'bg-black/30 border-white/10 hover:border-cyan-400/30'
                        }`}
                      >
                        <div className="font-black text-sm">COMBAT SHOTGUN</div>
                        <div className="text-[10px] text-slate-400">1-Shot close range, high falloff</div>
                      </button>
                    )}

                    {currentUser.isGuest ? (
                      <button
                        onClick={() => {
                          setIsPaused(false);
                          setInGame(false);
                          setShowAuthModal(true);
                        }}
                        className="p-3 rounded-xl border border-white/10 bg-black/40 text-left opacity-60 hover:opacity-85 transition-all group cursor-pointer"
                        title="Sniper Rifle is locked for Guest accounts. Click to Sign In"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-black text-sm text-slate-400">SNIPER RIFLE</div>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="text-[10px] text-amber-300/80">Account Required (Guest Locked)</div>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectWeapon('sniper')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          weaponClass === 'sniper'
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                            : 'bg-black/30 border-white/10 hover:border-cyan-400/30'
                        }`}
                      >
                        <div className="font-black text-sm text-purple-300">SNIPER RIFLE</div>
                        <div className="text-[10px] text-slate-400">Precision optic, massive damage</div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {pauseTab === 'settings' && (
                <div className="space-y-4">
                  {/* Top Navigation & Status */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftSettings({ ...settings });
                        setPauseTab('resume');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-black/60 border border-cyan-400/40 text-cyan-300 hover:text-white hover:border-cyan-400 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      title="Back to Resume (discards unsaved accidental changes)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {hasUnsavedChanges ? (
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded animate-pulse">
                          UNSAVED CHANGES
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                          ALL SAVED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sensitivity */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase text-slate-300">Sensitivity</span>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={draftSettings.sens}
                      onChange={(e) => setDraftSettings({ ...draftSettings, sens: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.sens.toFixed(2)}</span>
                  </div>

                  {/* Sniper Zoom */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase text-slate-300">Sniper Zoom</span>
                    <input
                      type="range"
                      min="12"
                      max="45"
                      step="1"
                      value={draftSettings.scopeZoom}
                      onChange={(e) => setDraftSettings({ ...draftSettings, scopeZoom: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.scopeZoom}×</span>
                  </div>

                  {/* FOV */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase text-slate-300">Field of View</span>
                    <input
                      type="range"
                      min="60"
                      max="120"
                      step="1"
                      value={draftSettings.fov}
                      onChange={(e) => setDraftSettings({ ...draftSettings, fov: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.fov}°</span>
                  </div>

                  {/* Weapon Sway */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase text-slate-300">Weapon Sway</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={draftSettings.swayIntensity}
                      onChange={(e) => setDraftSettings({ ...draftSettings, swayIntensity: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.swayIntensity.toFixed(2)}</span>
                  </div>

                  {/* Screen Shake */}
                  <div className="grid grid-cols-[130px_1fr_50px] items-center gap-3">
                    <span className="text-xs font-bold uppercase text-slate-300">Screen Shake</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={draftSettings.shakeIntensity}
                      onChange={(e) => setDraftSettings({ ...draftSettings, shakeIntensity: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-400 text-right">{draftSettings.shakeIntensity.toFixed(2)}</span>
                  </div>

                  {/* Graphics Quality Changer: Low, Medium, High, Ultra */}
                  <div className="bg-black/40 border border-cyan-400/25 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Graphics Preset</span>
                      </div>
                      <span className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/40">
                        {draftSettings.graphicsPreset || 'high'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDraftSettings({ ...draftSettings, graphicsPreset: preset })}
                          className={`py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            (draftSettings.graphicsPreset || 'high') === preset
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-300 text-white shadow-[0_0_12px_rgba(0,212,255,0.4)]'
                              : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Match Target Score Changer */}
                  <div className="bg-black/40 border border-cyan-400/25 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Match Target Score Limit</span>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/40">
                        {gameMode === 'tdm'
                          ? `${targetScoreTdm} PTS (${Math.round(targetScoreTdm / 10)} KILLS)`
                          : gameMode === 'dom'
                          ? `${targetScoreDom} PTS`
                          : `${targetScoreFfa} PTS (${Math.round(targetScoreFfa / 100)} KILLS)`}
                      </span>
                    </div>
                    {gameMode === 'tdm' ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {[500, 750, 1000, 1500].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => handleSetTargetScoreTdm(sc)}
                            className={`py-1 rounded-lg text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              targetScoreTdm === sc
                                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sc} PTS
                          </button>
                        ))}
                      </div>
                    ) : gameMode === 'dom' ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {[300, 500, 750, 1000].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => handleSetTargetScoreDom(sc)}
                            className={`py-1 rounded-lg text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              targetScoreDom === sc
                                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sc} PTS
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {[2000, 3500, 5000, 7500].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => handleSetTargetScoreFfa(sc)}
                            className={`py-1 rounded-lg text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              targetScoreFfa === sc
                                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notice Alert */}
                  {saveNotice && (
                    <div className="p-2 rounded-lg bg-emerald-950/90 border border-emerald-400/70 text-emerald-200 text-xs font-bold tracking-wider text-center animate-in fade-in duration-150">
                      {saveNotice}
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  <div className="pt-3 border-t border-white/10 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleApplySettings}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-black tracking-wider uppercase text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_4px_14px_rgba(0,212,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply & Save</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevertSettings}
                      disabled={!hasUnsavedChanges}
                      className={`py-2 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        hasUnsavedChanges
                          ? 'bg-amber-950/70 border-amber-400/60 text-amber-200 hover:bg-amber-900/80'
                          : 'bg-black/30 border-white/10 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                      title="Undo accidental changes and restore saved settings"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Revert</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="py-2 px-2.5 rounded-xl text-xs font-bold tracking-wider uppercase bg-black/40 border border-white/15 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Reset settings to defaults"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Default</span>
                    </button>
                  </div>
                </div>
              )}

              {pauseTab === 'map' && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Switch Active Battlefield (Restarts Round)
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.entries(MAP_CONFIGS).map(([key, map]) => (
                      <button
                        key={key}
                        onClick={() => handleSelectMap(key as MapKey)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          mapKey === key
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                            : 'bg-black/30 border-white/10 hover:border-cyan-400/30'
                        }`}
                      >
                        <div className="font-black text-sm">{map.name}</div>
                        <div className="text-[10px] text-slate-400">{map.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pauseTab === 'leave' && (
                <div className="flex flex-col items-center text-center py-4 space-y-4">
                  <div className="text-3xl text-red-500 font-black">⚠</div>
                  <div className="text-lg font-black italic tracking-widest uppercase text-red-400">Leave Match?</div>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    You will disconnect from this active simulation and return to the main deployment interface.
                  </p>
                  <button
                    onClick={handleLeaveMatch}
                    className="w-full max-w-xs py-3 rounded-xl text-base font-black italic tracking-widest uppercase text-white bg-gradient-to-r from-red-500 to-rose-700 shadow-[0_8px_25px_rgba(255,42,109,0.4)] hover:scale-[1.02] cursor-pointer"
                  >
                    RETURN TO MENU
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Key In-Game Scoreboard Modal Overlay */}
      {inGame && showScoreboard && !matchResult && (
        <div className="fixed inset-0 z-45 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#101826]/95 to-[#060914]/95 border border-cyan-400/40 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(0,212,255,0.2)] p-6 max-h-[85vh] overflow-y-auto flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-black tracking-widest uppercase text-white">
                  TACTICAL COMBAT SCOREBOARD
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowScoreboard(false)}
                className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/20 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close [TAB]
              </button>
            </div>

            <ScoreboardView
              entries={scoreboardEntries}
              gamemode={gameMode}
              blueScore={blueScore}
              redScore={redScore}
            />
          </div>
        </div>
      )}

      {/* Match End Modal with CSC Coins Rewards */}
      {matchResult && (
        <MatchEndModal
          result={matchResult}
          cscCoins={cscCoins}
          onPlayAgain={() => {
            setMatchResult(null);
            handleStartGame();
          }}
          onOpenShop={() => {
            setMatchResult(null);
            setInGame(false);
            setMenuTab('shop');
          }}
          onMainMenu={() => {
            setMatchResult(null);
            handleLeaveMatch();
          }}
        />
      )}

      {/* Operator Authentication & Cloud Save Modal (Login / Sign Up / Profile) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        currentCoins={cscCoins}
        currentCosmetics={ownedCosmetics}
      />
    </div>
  );
}
