export type WeaponClassKey = 'ar' | 'smg' | 'shotgun' | 'sniper';

export interface WeaponDef {
  name: string;
  tag: string;
  mag: number;
  rpm: number;
  dmg: number;
  auto: boolean;
  reloadTime: number;
  spread: number;
  recoil: number;
  adsSpreadMult: number;
  moveSpeedMult: number;
  pellets?: number;
  hasScope: boolean;
  adsFov: number;
  adsSensMult: number;
  rocketJump?: boolean;
  scopeZoomable?: boolean;
  falloff?: { start: number; end: number; minMult: number };
  closeBonus?: { range: number; mult: number };
}

export type MapKey = 'neoncity' | 'industrial' | 'desert' | 'arctic' | 'volcanic';

export interface MapConfig {
  name: string;
  size: number;
  skyTop: number;
  skyMid: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  rimColor: number;
  rimIntensity: number;
  groundBase: string;
  groundNoise: [number, number, number];
  groundGrid: [number, number, number];
  groundColor: number;
  groundEmissive: number;
  groundEmissiveIntensity: number;
  buildingHues: number[];
  buildingBase: number;
  buildingColor: number;
  buildingStyle: 'tall' | 'wide' | 'low' | 'dome' | 'jagged';
  coverColor: number;
  accent: number;
  starColor: number;
  starOpacity: number;
  preview: string;
  desc: string;
}

export interface GameSettings {
  fov: number;
  sens: number;
  scopeZoom: number;
  uiScale: number;
  bloom: number;
  shakeIntensity: number;
  swayIntensity: number;
  adsMode: 'hold' | 'toggle';
  speedLines: boolean;
  showFps: boolean;
  botCount: number;
  graphicsPreset: 'low' | 'medium' | 'high' | 'ultra';
  uiColor: string;
  cxSize: number;
  cxGap: number;
  cxThick: number;
  cxColor: string;
  matchDuration?: number;
  allyBotSmartness?: number;
  enemyBotSmartness?: number;
}

export interface ServerListing {
  id: string;
  name: string;
  region: string;
  gameMode: 'ffa' | 'tdm' | 'dom';
  mapKey: MapKey;
  playerCount: number;
  maxPlayers: number;
  botCount: number;
  allyBotSmartness: number;
  enemyBotSmartness: number;
  matchDuration: number;
  ping: number;
  isOfficial?: boolean;
}

export type StreakType = 'double' | 'triple' | 'quad' | 'nuke';

export interface StreakAnnouncement {
  id: string;
  type: StreakType;
  title: string;
  subtitle: string;
  reward?: string;
  color: string;
  timestamp: number;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  color: string;
  timestamp: number;
}

export interface DamageNumberItem {
  id: number;
  amount: number;
  crit: boolean;
  x: number;
  y: number;
  opacity: number;
}

export interface DomPointState {
  id: string;
  name: string;
  owner: 'blue' | 'red' | null;
  progress: number;
  capturingTeam: 'blue' | 'red' | null;
  isContested: boolean;
  playerInside: boolean;
}

export interface ScoreboardEntry {
  id: string;
  name: string;
  team: 'blue' | 'red' | 'hostile';
  isLocalPlayer: boolean;
  kills: number;
  deaths: number;
  score: number;
  captures: number;
  ping?: number;
  rank?: number;
}

export interface MatchEndResult {
  winnerTeam?: 'blue' | 'red' | null;
  winnerName?: string;
  playerRank: number; // 1 = 1st, 2 = 2nd, 3 = 3rd, etc.
  coinsEarned: number; // 10 for 1st, 5 for 2nd, 2 for 3rd, 0 for rest
  scoreboard: ScoreboardEntry[];
  gamemode: 'ffa' | 'tdm' | 'dom' | 'ctf';
}

export interface CosmeticItem {
  id: string;
  name: string;
  category: 'weapon' | 'operative' | 'explosive' | 'gloves';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  price: number;
  previewColor: string;
  description: string;
  badge?: string;
}

export interface EquippedCosmetics {
  weaponSkin: string;
  operativeSkin: string;
  explosiveFx: string;
  gloves: string;
}
