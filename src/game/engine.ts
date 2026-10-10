import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import {
  DomPointState,
  GameSettings,
  KillFeedItem,
  MapConfig,
  StreakAnnouncement,
  WeaponClassKey,
  WeaponDef,
  ScoreboardEntry,
  MatchEndResult,
  EquippedCosmetics
} from './types';
import { MAP_CONFIGS, WEAPON_CLASSES, WEAPONS_FIXED, DEFAULT_EQUIPPED_COSMETICS } from './constants';
import { makeBuildingTextures, makeGroundTexture } from './textures';
import { buildKnifeModel, buildPistolModel, buildPrimaryModel, buildGrenadeModel, buildThirdPersonWeapon } from './weapons';
import { MultiplayerClient } from './multiplayer';
import { soundManager } from './sound';

interface BotInstance {
  id: string;
  name: string;
  group: THREE.Group;
  parts: {
    legL: THREE.Group;
    legR: THREE.Group;
    armL: THREE.Group;
    armR: THREE.Group;
    head: THREE.Mesh;
    torso: THREE.Mesh;
  };
  hp: number;
  maxHp: number;
  team: 'blue' | 'red' | 'hostile';
  lastAttack: number;
  walkPhase: number;
  speed: number;
  target: THREE.Vector3 | null;
  retargetTime: number;
  kills: number;
  deaths: number;
  score: number;
  captures: number;
  smartness?: number;
  targetBotId?: string;
  stunTimer?: number;
  _sideFlip?: boolean;
  _sideFlipTime?: number;
}

interface ThrownGrenadeInstance {
  mesh: THREE.Group;
  vel: THREE.Vector3;
  isNonLethal: boolean;
  fuse: number;
  timer: number;
  bounces: number;
  light?: THREE.PointLight;
}

interface ParticleInstance {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  scale: number;
}

interface TracerInstance {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface DomPointInstance {
  id: string;
  name: string;
  x: number;
  z: number;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  pillar: THREE.Mesh;
  beacon: THREE.Mesh;
  light: THREE.PointLight;
  owner: 'blue' | 'red' | null;
  progress: number;
  capturingTeam: 'blue' | 'red' | null;
  isContested: boolean;
}

export class GameEngine {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: PointerLockControls;
  composer: EffectComposer | null = null;
  bloomPass: UnrealBloomPass | null = null;
  fxaaPass: ShaderPass | null = null;

  settings: GameSettings;
  currentMapKey: string = 'neoncity';
  currentWeaponClass: WeaponClassKey = 'ar';
  currentWeaponSlot: number = 1;
  currentGameMode: 'ffa' | 'tdm' | 'dom' | 'ctf' = 'ffa';

  score: number = 0;
  teamScoreBlue: number = 0;
  teamScoreRed: number = 0;
  targetScoreTdm: number = 750;
  targetScoreDom: number = 500;
  targetScoreFfa: number = 3500;
  readonly maxHP: number = 150;
  playerHP: number = 150;
  playerTeam: 'blue' | 'red' = 'blue';

  mpClient: MultiplayerClient | null = null;
  isOnline: boolean = false;
  lastNetworkSend: number = 0;

  ammo: Record<number, number> = { 1: 30, 2: 12, 4: 2, 5: 2 };
  isReloading: boolean = false;
  reloadProgress: number = 0;
  reloadDuration: number = 1.9;

  playerName: string = 'OPERATIVE';
  playerKills: number = 0;
  playerDeaths: number = 0;
  playerCaptures: number = 0;
  matchEnded: boolean = false;
  thrownGrenades: ThrownGrenadeInstance[] = [];
  isThrowing: boolean = false;
  throwProgress: number = 0;
  equippedCosmetics: EquippedCosmetics = { ...DEFAULT_EQUIPPED_COSMETICS };

  isAiming: boolean = false;
  adsToggleActive: boolean = false;
  isInspecting: boolean = false;
  isSlashing: boolean = false;
  isShooting: boolean = false;
  isDead: boolean = false;
  isPaused: boolean = false;
  gameActive: boolean = false;

  lastFireTime: number = 0;
  inspectProgress: number = 0;
  slashProgress: number = 0;
  scopeAmount: number = 0;
  aimLineAmount: number = 0;
  scopeSensMod: number = 1;

  // Viewmodel
  gunGroup: THREE.Group = new THREE.Group();
  karambitPivot: THREE.Group | null = null;
  grenadePivot: THREE.Group | null = null;
  rightHandGroup: THREE.Group | null = null;
  muzzleLight: THREE.PointLight | null = null;
  muzzleFlashMesh: THREE.Mesh | null = null;

  hipPosAr = new THREE.Vector3(0.35, -0.25, -0.5);
  adsPosAr = new THREE.Vector3(0, -0.11, -0.28);
  hipPosPistol = new THREE.Vector3(0.3, -0.2, -0.4);
  adsPosPistol = new THREE.Vector3(0, -0.085, -0.3);
  hipPosKnife = new THREE.Vector3(0.3, -0.2, -0.4);
  adsPosSniper = new THREE.Vector3(0, -0.115, -0.25);
  adsPosShotgun = new THREE.Vector3(0, -0.07, -0.26);
  currentGunBase: THREE.Vector3 = new THREE.Vector3().copy(this.hipPosAr);

  recoilOffsetZ: number = 0;
  recoilRotX: number = 0;
  camShakeTime: number = 0;
  camShakeIntensity: number = 0;
  swayX: number = 0;
  swayY: number = 0;
  mouseDX: number = 0;
  mouseDY: number = 0;
  currentRoll: number = 0;
  crosshairSpread: number = 0;

  // Movement & Physics
  moveF: boolean = false;
  moveB: boolean = false;
  moveL: boolean = false;
  moveR: boolean = false;
  canJump: boolean = false;
  onGround: boolean = false;
  isSliding: boolean = false;
  isCrouching: boolean = false;
  slideBoost: boolean = false;
  shiftHeld: boolean = false;
  lastShiftPressTime: number = 0;
  lastSpacePressTime: number = 0;
  lastDamageTime: number = 0;
  lastDomScoreTick: number = 0;
  isRegenerating: boolean = false;
  timeInCover: number = 0;
  isCoverHealing: boolean = false;
  isInCover: boolean = false;
  lastCoverCheckTime: number = 0;
  playerVelocity: THREE.Vector3 = new THREE.Vector3();
  readonly STANDING_HEIGHT = 2.15;
  readonly CROUCHING_HEIGHT = 1.55;
  readonly SLIDING_HEIGHT = 1.25;
  readonly PLAYER_RADIUS = 0.32;
  currentHeight: number = 2.15;

  // Killstreaks & Multi-kills
  multiKillCount: number = 0;
  lastKillTime: number = 0;
  currentStreak: number = 0;
  tabletStrikeReady: boolean = false;
  nukeActive: boolean = false;
  nukeCountdown: number = 0;
  nukeTimer: number = 0;

  // Airplane Support
  airplaneActive: boolean = false;
  airplaneMesh: THREE.Group | null = null;
  airplaneStartPos: THREE.Vector3 = new THREE.Vector3();
  airplaneEndPos: THREE.Vector3 = new THREE.Vector3();
  airplaneProgress: number = 0;
  airplaneBombsDropped: number = 0;

  // World objects
  mapObjects: THREE.Object3D[] = [];
  collisionBoxes: THREE.Box3[] = [];
  floorObjects: THREE.Object3D[] = [];
  enemiesArray: BotInstance[] = [];
  particles: ParticleInstance[] = [];
  tracers: TracerInstance[] = [];
  domPoints: DomPointInstance[] = [];

  skyMesh: THREE.Mesh | null = null;
  starField: THREE.Points | null = null;
  hemiLight: THREE.HemisphereLight | null = null;
  sunLight: THREE.DirectionalLight | null = null;
  rimLight: THREE.DirectionalLight | null = null;
  ambientLight: THREE.AmbientLight | null = null;

  raycaster = new THREE.Raycaster();
  prevTime: number = performance.now();
  animFrameId: number = 0;
  damageCounter: number = 0;
  spawnShieldTime: number = 3.0;

  // UI callbacks
  onHealthChange?: (hp: number, maxHp: number) => void;
  onShieldChange?: (remaining: number) => void;
  onShieldHit?: () => void;
  onAmmoChange?: (cur: number, max: number | string) => void;
  onScoreChange?: (score: number, blue: number, red: number) => void;
  onKillFeed?: (item: KillFeedItem) => void;
  onHitmarker?: (isKill: boolean) => void;
  onFlash?: (type: 'flash' | 'damage-flash' | 'slash-flash' | 'emp-blind') => void;
  onPauseChange?: (paused: boolean) => void;
  onDeathChange?: (isDead: boolean) => void;
  onScopeChange?: (scopeAmount: number, aimLineAmount: number) => void;
  onFpsUpdate?: (fps: number) => void;
  onOnlinePlayerCount?: (count: number) => void;
  onOnlinePing?: (ping: number) => void;
  onDamageNumber?: (num: { id: number; amount: number; crit: boolean; x: number; y: number }) => void;
  onDomUpdate?: (points: DomPointState[], blueScore: number, redScore: number) => void;
  onHeal?: (amount: number, reason: string) => void;
  onCoverStatusChange?: (inCover: boolean, isHealingInCover: boolean) => void;
  onAchievement?: (announcement: StreakAnnouncement) => void;
  onTabletReadyChange?: (ready: boolean) => void;
  onNukeCountdown?: (sec: number | null) => void;
  onBotCountChange?: (count: number) => void;
  onWeaponSlotChange?: (slot: number) => void;
  onScoreboardUpdate?: (entries: ScoreboardEntry[]) => void;
  onMatchEnd?: (result: MatchEndResult) => void;
  onTimeRemainingUpdate?: (secondsLeft: number, totalSeconds: number) => void;
  onEdgeWarning?: (active: boolean, dist: number) => void;

  // Invisible Edge Barrier & "THIS IS THE EDGE!" system
  barrierMeshes: THREE.Mesh[] = [];
  edgeSigns: THREE.Group[] = [];
  dynamicEdgeHologram: THREE.Group | null = null;
  edgeSignTexture: THREE.CanvasTexture | null = null;
  barrierGridTexture: THREE.CanvasTexture | null = null;
  lastEdgeSoundTime: number = 0;

  matchDurationMinutes: number = 5;
  matchTimeRemaining: number = 300;
  matchTimerActive: boolean = true;
  lastReportedSec: number = -1;

  allyBotSmartness: number = 5;
  enemyBotSmartness: number = 5;
  onBotSmartnessUpdate?: (ally: number, enemy: number) => void;

  frameCount = 0;
  fpsLastTime = 0;

  constructor(container: HTMLElement, settings: GameSettings) {
    this.container = container;
    this.settings = { ...settings };
    if (this.settings.allyBotSmartness) {
      this.allyBotSmartness = Math.min(10, Math.max(1, this.settings.allyBotSmartness));
    }
    if (this.settings.enemyBotSmartness) {
      this.enemyBotSmartness = Math.min(10, Math.max(1, this.settings.enemyBotSmartness));
    }

    this.scene = new THREE.Scene();
    const cfg = MAP_CONFIGS[this.currentMapKey] || MAP_CONFIGS['neoncity'];
    this.scene.background = new THREE.Color(cfg.skyMid);
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);

    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      window.innerWidth / window.innerHeight,
      0.08,
      3000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Make canvas fill screen
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.controls.pointerSpeed = this.settings.sens;
    this.scene.add(this.camera);

    // Lights
    this.hemiLight = new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(cfg.sunColor, cfg.sunIntensity);
    this.sunLight.position.set(-140, 230, 110);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -180;
    this.sunLight.shadow.camera.right = 180;
    this.sunLight.shadow.camera.top = 180;
    this.sunLight.shadow.camera.bottom = -180;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 650;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.035;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(cfg.rimColor, cfg.rimIntensity);
    this.rimLight.position.set(150, 90, -150);
    this.scene.add(this.rimLight);

    // Guaranteed ambient light to prevent any black/gray unlit spots
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Viewmodel lighting attached to camera
    const viewLight = new THREE.PointLight(0x9fd8ff, 1.1, 7, 2);
    viewLight.position.set(0.35, 0.35, 0.3);
    this.camera.add(viewLight);

    const viewFill = new THREE.PointLight(0xff4d88, 0.45, 6, 2);
    viewFill.position.set(-0.45, -0.2, 0.25);
    this.camera.add(viewFill);

    this.camera.add(this.gunGroup);

    // Initialize Multiplayer Client
    this.mpClient = new MultiplayerClient(this.scene);
    this.mpClient.onTakeDamage = (dmg, fromName) => {
      this.takeDamage(dmg);
      this.addKillFeedEntry(fromName, 'YOU', '#ff2a6d');
    };
    this.mpClient.onKillFeed = (killer, victim, col) => {
      this.addKillFeedEntry(killer, victim, col);
    };
    this.mpClient.onPingUpdate = (p) => {
      this.onOnlinePing?.(p);
    };
    this.mpClient.onPlayerCountChange = (c) => {
      this.onOnlinePlayerCount?.(c);
    };
    this.mpClient.onBotControl = (action, count, team, sender) => {
      if (action === 'add') {
        const assignedTeam = (team as any) || (this.currentGameMode === 'ffa' ? 'hostile' : Math.random() < 0.5 ? 'blue' : 'red');
        this.spawnBot(assignedTeam);
        this.settings.botCount = this.enemiesArray.length;
        this.onBotCountChange?.(this.enemiesArray.length);
        this.addKillFeedEntry('SERVER', `${sender || 'OPERATIVE'} ADDED A BOT`, '#38bdf8');
      } else if (action === 'remove') {
        if (this.enemiesArray.length > 0) {
          const bot = this.enemiesArray.pop()!;
          this.scene.remove(bot.group);
          this.settings.botCount = this.enemiesArray.length;
          this.onBotCountChange?.(this.enemiesArray.length);
          this.addKillFeedEntry('SERVER', `${sender || 'OPERATIVE'} REMOVED A BOT`, '#f59e0b');
        }
      } else if (action === 'set' && typeof count === 'number') {
        this.setBotCount(count, false);
      }
    };
    this.mpClient.onMatchDurationChange = (minutes) => {
      this.setMatchDuration(minutes);
    };
    this.mpClient.onBotSmartnessChange = (ally, enemy) => {
      this.setBotSmartness(ally, enemy);
    };

    // Init post-processing
    this.initPostFX();
    this.applyGraphicsPreset(this.settings.graphicsPreset || 'high');

    // Setup models & map
    this.updateWeaponModel();
    this.rebuildMap();
    this.setupEventListeners();

    // Resize handling
    window.addEventListener('resize', this.onResize);

    // Start loop
    this.prevTime = performance.now();
    this.animate();
  }

  initPostFX() {
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.settings.bloom,
        0.5,
        0.75
      );
      this.composer.addPass(this.bloomPass);

      this.fxaaPass = new ShaderPass(FXAAShader);
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / (window.innerWidth * pr),
        1 / (window.innerHeight * pr)
      );
      // CRITICAL: Must be renderToScreen = true on the final pass!
      this.fxaaPass.renderToScreen = true;
      this.composer.addPass(this.fxaaPass);
    } catch (e) {
      console.warn('EffectComposer initialization failed, using standard WebGLRenderer:', e);
      this.composer = null;
    }
  }

  onResize = () => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (this.fxaaPass) {
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / (window.innerWidth * pr),
        1 / (window.innerHeight * pr)
      );
    }
  };

  getWeapon(slot: number): WeaponDef {
    return slot === 1 ? WEAPON_CLASSES[this.currentWeaponClass] : (WEAPONS_FIXED[slot] || WEAPONS_FIXED[2]);
  }

  setEquippedCosmetics(cosmetics: EquippedCosmetics) {
    this.equippedCosmetics = { ...cosmetics };
    if (this.gunGroup) {
      this.updateWeaponModel();
    }
  }

  updateWeaponModel() {
    while (this.gunGroup.children.length > 0) {
      this.gunGroup.remove(this.gunGroup.children[0]);
    }
    this.karambitPivot = null;
    this.rightHandGroup = null;
    this.grenadePivot = null;

    const currentSkin = this.equippedCosmetics.weaponSkin;

    if (this.currentWeaponSlot === 3) {
      this.currentGunBase.copy(this.hipPosKnife);
      const knife = buildKnifeModel(currentSkin);
      this.karambitPivot = knife.karambitPivot;
      this.rightHandGroup = knife.rightArm;
      this.gunGroup.add(knife.karambitPivot, knife.rightArm, knife.leftArm);
    } else if (this.currentWeaponSlot === 1) {
      const parts = buildPrimaryModel(this.currentWeaponClass, currentSkin, this.playerTeam);
      parts.forEach((p) => this.gunGroup.add(p));
      this.currentGunBase.copy(this.hipPosAr);
    } else if (this.currentWeaponSlot === 2) {
      this.currentGunBase.copy(this.hipPosPistol);
      const parts = buildPistolModel(currentSkin);
      parts.forEach((p) => this.gunGroup.add(p));
    } else if (this.currentWeaponSlot === 4) {
      // Slot 4: Lethal Frag Grenade
      this.currentGunBase.set(0.28, -0.22, -0.4);
      const grenade = buildGrenadeModel(false, currentSkin);
      this.grenadePivot = grenade.grenadePivot;
      this.gunGroup.add(grenade.grenadePivot, grenade.rightArm, grenade.leftArm);
    } else if (this.currentWeaponSlot === 5) {
      // Slot 5: Non-Lethal EMP Flash Canister
      this.currentGunBase.set(0.28, -0.22, -0.4);
      const grenade = buildGrenadeModel(true, currentSkin);
      this.grenadePivot = grenade.grenadePivot;
      this.gunGroup.add(grenade.grenadePivot, grenade.rightArm, grenade.leftArm);
    }

    this.gunGroup.position.copy(this.currentGunBase);
    this.gunGroup.rotation.set(0, 0, 0);

    // Muzzle light & flash (for firearms)
    if (this.currentWeaponSlot === 1 || this.currentWeaponSlot === 2) {
      let muzzleZ = -0.95;
      let muzzleY = 0.01;
      let muzzleCol = this.playerTeam === 'red' ? 0xff4422 : 0x00d4ff;
      let flashCol = this.playerTeam === 'red' ? 0xffaa66 : 0xaaeeff;

      if (this.currentWeaponSlot === 1) {
        if (this.currentWeaponClass === 'ar') {
          // Red Team AK-47 muzzle vs Blue Team M4 birdcage
          muzzleZ = this.playerTeam === 'red' ? -1.05 : -0.96;
          muzzleY = this.playerTeam === 'red' ? 0.01 : 0.02;
        } else if (this.currentWeaponClass === 'smg') {
          // Red Team Kriss Vector low bore muzzle vs Blue Team UMP-45 muzzle
          muzzleZ = this.playerTeam === 'red' ? -0.66 : -0.58;
          muzzleY = this.playerTeam === 'red' ? -0.02 : 0.01;
        } else if (this.currentWeaponClass === 'sniper') {
          // Red Team AWP vs Blue Team M107 Barrett .50 cal
          muzzleZ = this.playerTeam === 'red' ? -1.28 : -1.48;
          muzzleY = this.playerTeam === 'red' ? 0.035 : 0.045;
          muzzleCol = this.playerTeam === 'red' ? 0xff2a6d : 0x00d4ff;
          flashCol = this.playerTeam === 'red' ? 0xff88aa : 0xaaeeff;
        } else if (this.currentWeaponClass === 'shotgun') {
          // Red Team S&T ST870 vs Blue Team DP-12 double barrel
          muzzleZ = this.playerTeam === 'red' ? -0.96 : -0.76;
          muzzleY = this.playerTeam === 'red' ? 0.038 : 0.05;
          muzzleCol = this.playerTeam === 'red' ? 0xff4422 : 0x00d4ff;
          flashCol = this.playerTeam === 'red' ? 0xffaa66 : 0xaaeeff;
        }
      } else if (this.currentWeaponSlot === 2) {
        muzzleZ = -0.52;
      }

      this.muzzleLight = new THREE.PointLight(muzzleCol, 0, 10, 2);
      this.muzzleLight.position.set(0, muzzleY, muzzleZ);
      this.gunGroup.add(this.muzzleLight);

      const flashMat = new THREE.MeshBasicMaterial({
        color: flashCol,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.muzzleFlashMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), flashMat);
      this.muzzleFlashMesh.position.set(0, muzzleY, muzzleZ + 0.04);
      this.gunGroup.add(this.muzzleFlashMesh);
    }

    this.notifyAmmo();
  }

  setMatchDuration(minutes: number) {
    this.matchDurationMinutes = Math.min(30, Math.max(1, Math.round(minutes)));
    this.matchTimeRemaining = this.matchDurationMinutes * 60;
    this.lastReportedSec = -1;
    this.onTimeRemainingUpdate?.(this.matchTimeRemaining, this.matchDurationMinutes * 60);
  }

  setPlayerCallsign(name: string) {
    this.playerName = name || 'OPERATIVE';
  }

  setTargetScores(tdm?: number, dom?: number, ffa?: number) {
    if (tdm) this.targetScoreTdm = Math.max(100, Math.round(tdm));
    if (dom) this.targetScoreDom = Math.max(100, Math.round(dom));
    if (ffa) this.targetScoreFfa = Math.max(500, Math.round(ffa));
  }

  setBotSmartness(allyLevel: number, enemyLevel: number) {
    this.allyBotSmartness = Math.min(10, Math.max(1, Math.round(allyLevel)));
    this.enemyBotSmartness = Math.min(10, Math.max(1, Math.round(enemyLevel)));
    for (const b of this.enemiesArray) {
      const isAlly = b.team === this.playerTeam && this.currentGameMode !== 'ffa';
      const lvl = isAlly ? this.allyBotSmartness : this.enemyBotSmartness;
      b.smartness = lvl;
      b.speed = 3.6 + lvl * 0.42;
      b.maxHp = Math.round(75 + lvl * 6.5);
    }
    this.onBotSmartnessUpdate?.(this.allyBotSmartness, this.enemyBotSmartness);
  }

  startNewMatch() {
    this.matchEnded = false;
    this.score = 0;
    this.teamScoreBlue = 0;
    this.teamScoreRed = 0;
    this.playerKills = 0;
    this.playerDeaths = 0;
    this.matchTimeRemaining = this.matchDurationMinutes * 60;
    this.lastReportedSec = -1;
    this.onTimeRemainingUpdate?.(this.matchTimeRemaining, this.matchDurationMinutes * 60);
    this.onScoreChange?.(0, 0, 0);
  }

  startMultiplayer(
    room: string,
    name: string,
    team: 'blue' | 'red',
    botCount?: number,
    matchDuration?: number,
    allySmartness?: number,
    enemySmartness?: number,
    gameMode?: string,
    mapKey?: string
  ) {
    this.isOnline = true;
    this.playerTeam = team;
    if (this.currentWeaponSlot === 1) {
      this.updateWeaponModel();
    }
    this.playerName = name || 'OPERATIVE';
    if (typeof matchDuration === 'number') {
      this.setMatchDuration(matchDuration);
    }
    if (typeof allySmartness === 'number' && typeof enemySmartness === 'number') {
      this.setBotSmartness(allySmartness, enemySmartness);
    }
    this.mpClient?.connect(
      room,
      name,
      team,
      this.currentWeaponClass,
      botCount,
      matchDuration,
      this.allyBotSmartness,
      this.enemyBotSmartness,
      gameMode || this.currentGameMode,
      mapKey || this.currentMapKey
    );
  }

  stopMultiplayer() {
    this.isOnline = false;
    this.mpClient?.destroy();
  }

  setPlayerTeam(team: 'blue' | 'red') {
    this.playerTeam = team;
    if (this.currentWeaponSlot === 1) {
      this.updateWeaponModel();
    }
  }

  getRemotePlayerFromObject(obj: THREE.Object3D | null) {
    if (!this.isOnline || !this.mpClient) return null;
    let o: THREE.Object3D | null = obj;
    while (o) {
      for (const rp of this.mpClient.remotePlayers.values()) {
        if (rp.group === o) return rp;
      }
      o = o.parent;
    }
    return null;
  }

  notifyAmmo() {
    const w = this.getWeapon(this.currentWeaponSlot);
    if (this.currentWeaponSlot === 3) {
      this.onAmmoChange?.(Infinity, '');
    } else {
      const cur = this.ammo[this.currentWeaponSlot] !== undefined ? this.ammo[this.currentWeaponSlot] : w.mag;
      this.onAmmoChange?.(cur, w.mag);
    }
  }

  setWeapon(slot: number) {
    if (slot < 1 || slot > 5) return;
    if (this.currentWeaponSlot === slot) return;
    this.currentWeaponSlot = slot;
    this.isAiming = false;
    this.adsToggleActive = false;
    this.isShooting = false;
    this.isInspecting = false;
    this.isSlashing = false;
    this.isThrowing = false;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.scopeAmount = 0;
    this.aimLineAmount = 0;
    this.updateWeaponModel();
    this.onWeaponSlotChange?.(slot);
  }

  selectWeaponClass(classKey: WeaponClassKey) {
    this.currentWeaponClass = classKey;
    this.ammo[1] = WEAPON_CLASSES[classKey].mag;
    if (this.currentWeaponSlot === 1) {
      this.updateWeaponModel();
    }
  }

  selectMap(mapKey: string) {
    this.currentMapKey = mapKey;
    this.rebuildMap();
  }

  clearWorld() {
    this.mapObjects.forEach((o) => this.scene.remove(o));
    this.enemiesArray.forEach((e) => this.scene.remove(e.group));
    this.domPoints.forEach((p) => {
      this.scene.remove(p.mesh);
      if (p.ring) this.scene.remove(p.ring);
      if (p.pillar) this.scene.remove(p.pillar);
      if (p.beacon) this.scene.remove(p.beacon);
      if (p.light) this.scene.remove(p.light);
    });
    if (this.airplaneMesh) {
      this.scene.remove(this.airplaneMesh);
      this.airplaneMesh = null;
      this.airplaneActive = false;
    }
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.tracers.forEach((t) => this.scene.remove(t.mesh));
    this.thrownGrenades.forEach((g) => this.scene.remove(g.mesh));
    this.thrownGrenades = [];
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh = null;
    }
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField = null;
    }
    this.barrierMeshes.forEach((b) => this.scene.remove(b));
    this.barrierMeshes = [];
    this.edgeSigns.forEach((s) => this.scene.remove(s));
    this.edgeSigns = [];
    if (this.dynamicEdgeHologram) {
      this.scene.remove(this.dynamicEdgeHologram);
      this.dynamicEdgeHologram = null;
    }
    this.mapObjects = [];
    this.collisionBoxes = [];
    this.floorObjects = [];
    this.enemiesArray = [];
    this.particles = [];
    this.tracers = [];
    this.domPoints = [];
  }

  createSky(cfg: MapConfig) {
    const skyGeo = new THREE.SphereGeometry(1500, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topCol: { value: new THREE.Color(cfg.skyTop) },
        midCol: { value: new THREE.Color(cfg.skyMid) },
        horCol: { value: new THREE.Color(cfg.skyHorizon) }
      },
      vertexShader: `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topCol;
        uniform vec3 midCol;
        uniform vec3 horCol;
        varying vec3 vPos;
        void main(){
          float h = normalize(vPos).y;
          vec3 c = mix(horCol, midCol, smoothstep(-0.05, 0.38, h));
          c = mix(c, topCol, smoothstep(0.28, 0.88, h));
          c = mix(c, horCol * 0.6, smoothstep(0.0, -0.25, h));
          gl_FragColor = vec4(c, 1.0);
        }
      `
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.frustumCulled = false;
    this.scene.add(this.skyMesh);

    // Stars
    const starCount = 1200;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3().setFromSphericalCoords(
        1400,
        Math.acos(THREE.MathUtils.randFloat(0.05, 0.95)),
        Math.random() * Math.PI * 2
      );
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starField = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: cfg.starColor,
        size: 2.8,
        sizeAttenuation: false,
        transparent: true,
        opacity: cfg.starOpacity,
        fog: false
      })
    );
    this.starField.frustumCulled = false;
    this.scene.add(this.starField);
  }

  createGround(cfg: MapConfig) {
    const tex = makeGroundTexture(cfg);
    const floorMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: cfg.groundEmissive,
      emissiveIntensity: cfg.groundEmissiveIntensity,
      color: cfg.groundColor,
      roughness: 0.75,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(cfg.size + 160, cfg.size + 160), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.mapObjects.push(floor);
    this.floorObjects.push(floor);
  }

  rectFree(x: number, z: number, w: number, d: number, h: number, pad: number): boolean {
    const box = new THREE.Box3(
      new THREE.Vector3(x - w / 2, 0, z - d / 2),
      new THREE.Vector3(x + w / 2, h, z + d / 2)
    );
    box.expandByScalar(pad);
    for (let i = 0; i < this.collisionBoxes.length; i++) {
      if (this.collisionBoxes[i].intersectsBox(box)) return false;
    }
    return true;
  }

  createCity(cfg: MapConfig) {
    const buildingTextures: { colorMap: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture }[] = [];
    for (let i = 0; i < cfg.buildingHues.length; i++) {
      buildingTextures.push(makeBuildingTextures(cfg.buildingHues[i], cfg));
    }

    const step = 78;
    const n = Math.floor(cfg.size / step);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, metalness: 0.72, roughness: 0.42 });

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = (i - (n - 1) / 2) * step;
        const cz = (j - (n - 1) / 2) * step;

        // Keep central plaza wide open so player spawns and sees the full city panorama
        if (Math.abs(cx) < 45 && Math.abs(cz) < 45) continue;

        const cells = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1]
        ].sort(() => Math.random() - 0.5);

        const count = 1 + Math.floor(Math.random() * 3);
        const cellSize = 34;

        let wMin = 18,
          wMax = 32,
          hMin = 18,
          hMax = 55;
        let towerChance = 0.16;
        let towerHMin = 70;
        let towerHMax = 115;

        for (let k = 0; k < count; k++) {
          const gx = cells[k][0],
            gz = cells[k][1];
          const px = cx + (gx - 0.5) * cellSize + (Math.random() - 0.5) * 4;
          const pz = cz + (gz - 0.5) * cellSize + (Math.random() - 0.5) * 4;
          const w = wMin + Math.random() * (wMax - wMin);
          const d = wMin + Math.random() * (wMax - wMin);
          let h = hMin + Math.random() * (hMax - hMin);
          const isTower = Math.random() < towerChance;
          if (isTower) h = towerHMin + Math.random() * (towerHMax - towerHMin);

          if (!this.rectFree(px, pz, w, d, h, 3)) continue;

          const texSet = buildingTextures[(i * 7 + j * 3 + k) % buildingTextures.length];
          const map = texSet.colorMap.clone();
          map.needsUpdate = true;
          const emi = texSet.emissiveMap.clone();
          emi.needsUpdate = true;

          const rx = Math.max(1, Math.round(w / 8));
          const ry = Math.max(1, Math.round(h / 12));
          map.repeat.set(rx, ry);
          emi.repeat.set(rx, ry);

          const mat = baseMat.clone();
          mat.map = map;
          mat.emissiveMap = emi;
          mat.emissive = new THREE.Color(0xffffff);
          mat.emissiveIntensity = 0.95;
          mat.color = new THREE.Color(cfg.buildingColor);

          const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          building.position.set(px, h / 2, pz);
          building.castShadow = true;
          building.receiveShadow = true;
          this.scene.add(building);
          this.mapObjects.push(building);

          building.updateMatrixWorld();
          const box = new THREE.Box3().setFromObject(building);
          box.expandByScalar(-0.03);
          this.collisionBoxes.push(box);

          // Neon edge trim on top
          const trimMat = new THREE.MeshStandardMaterial({
            color: cfg.accent,
            emissive: cfg.accent,
            emissiveIntensity: 1.8,
            metalness: 0.6,
            roughness: 0.3
          });
          const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4), trimMat);
          trim.position.set(px, h + 0.2, pz);
          this.scene.add(trim);
          this.mapObjects.push(trim);

          // Rooftop beacon for tall towers
          if (isTower) {
            const beacon = new THREE.Mesh(
              new THREE.SphereGeometry(0.7, 10, 8),
              new THREE.MeshStandardMaterial({
                color: cfg.accent,
                emissive: cfg.accent,
                emissiveIntensity: 2.6
              })
            );
            beacon.position.set(px, h + 2.5, pz);
            this.scene.add(beacon);
            this.mapObjects.push(beacon);
          }
        }
      }
    }
  }

  createCover(cfg: MapConfig) {
    const crateMat = new THREE.MeshStandardMaterial({ color: cfg.coverColor, metalness: 0.75, roughness: 0.4 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: cfg.accent,
      emissive: cfg.accent,
      emissiveIntensity: 1.5,
      metalness: 0.5,
      roughness: 0.35
    });
    const barrierMat = new THREE.MeshStandardMaterial({ color: cfg.coverColor, metalness: 0.8, roughness: 0.45 });

    let placed = 0,
      attempts = 0;
    while (placed < 75 && attempts < 600) {
      attempts++;
      const x = (Math.random() - 0.5) * (cfg.size - 60);
      const z = (Math.random() - 0.5) * (cfg.size - 60);
      if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;

      const isCrate = Math.random() < 0.55;
      const w = isCrate ? 2.4 : 7;
      const h = isCrate ? 1.8 : 1.5;
      const d = isCrate ? 2.4 : 1.2;

      if (!this.rectFree(x, z, w + 3, d + 3, h, 2)) continue;

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), isCrate ? crateMat : barrierMat);
      mesh.position.set(x, h / 2, z);
      if (!isCrate && Math.random() < 0.5) mesh.rotation.y = Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.mapObjects.push(mesh);

      mesh.updateMatrixWorld();
      const box = new THREE.Box3().setFromObject(mesh);
      box.expandByScalar(-0.04);
      this.collisionBoxes.push(box);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.08, d * 0.96), trimMat);
      trim.position.set(x, h + 0.04, z);
      trim.rotation.y = mesh.rotation.y;
      this.scene.add(trim);
      this.mapObjects.push(trim);

      placed++;
    }
  }

  createDomPoints(cfg: MapConfig) {
    const pts = [
      { id: 'A', name: 'ALPHA', x: -65, z: -65 },
      { id: 'B', name: 'BRAVO', x: 0, z: 0 },
      { id: 'C', name: 'CHARLIE', x: 65, z: 65 }
    ];
    pts.forEach((p) => {
      // 1. Base platform
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x0a1420,
        emissive: 0x223344,
        emissiveIntensity: 0.8,
        metalness: 0.8,
        roughness: 0.3
      });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.0, 0.22, 48), baseMat);
      base.position.set(p.x, 0.11, p.z);
      base.receiveShadow = true;
      this.scene.add(base);
      this.mapObjects.push(base);

      // 2. Torus capture ring
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88bbdd,
        emissiveIntensity: 1.8,
        roughness: 0.2
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.16, 12, 48), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(p.x, 0.26, p.z);
      this.scene.add(ring);
      this.mapObjects.push(ring);

      // 3. Vertical holographic beacon light beam
      const beamGeo = new THREE.CylinderGeometry(0.3, 6.8, 38, 24, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x88bbdd,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const pillar = new THREE.Mesh(beamGeo, beamMat);
      pillar.position.set(p.x, 19, p.z);
      this.scene.add(pillar);

      // 4. Floating holographic crystal beacon at y = 3.6
      const beaconGeo = new THREE.OctahedronGeometry(1.2, 0);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88bbdd,
        emissiveIntensity: 2.2,
        metalness: 0.2,
        roughness: 0.2
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(p.x, 3.6, p.z);
      this.scene.add(beacon);

      // 5. Point light
      const light = new THREE.PointLight(0x88bbdd, 2.5, 24, 2);
      light.position.set(p.x, 3.6, p.z);
      this.scene.add(light);

      this.domPoints.push({
        id: p.id,
        name: p.name,
        x: p.x,
        z: p.z,
        mesh: base,
        ring,
        pillar,
        beacon,
        light,
        owner: null,
        progress: 0,
        capturingTeam: null,
        isContested: false
      });
    });
  }

  updateDomPointVisuals(p: DomPointInstance) {
    let emissiveHex = 0x88bbdd;
    let lightHex = 0x88bbdd;

    if (p.owner === 'blue') {
      emissiveHex = 0x00d4ff;
      lightHex = 0x00d4ff;
    } else if (p.owner === 'red') {
      emissiveHex = 0xff2a6d;
      lightHex = 0xff2a6d;
    } else if (p.capturingTeam === 'blue') {
      emissiveHex = 0x00d4ff;
      lightHex = 0x00d4ff;
    } else if (p.capturingTeam === 'red') {
      emissiveHex = 0xff2a6d;
      lightHex = 0xff2a6d;
    }

    if (p.isContested) {
      emissiveHex = 0xffaa00;
      lightHex = 0xffaa00;
    }

    (p.ring.material as THREE.MeshStandardMaterial).emissive.setHex(emissiveHex);
    (p.beacon.material as THREE.MeshStandardMaterial).emissive.setHex(emissiveHex);
    (p.pillar.material as THREE.MeshBasicMaterial).color.setHex(emissiveHex);
    p.light.color.setHex(lightHex);
  }

  updateDomination(delta: number, time: number) {
    if (this.currentGameMode !== 'dom' || this.domPoints.length === 0) return;

    const pObj = this.camera;
    const states: DomPointState[] = [];

    for (let i = 0; i < this.domPoints.length; i++) {
      const p = this.domPoints[i];

      // Rotate and bob beacon
      p.beacon.rotation.y += delta * 1.6;
      p.beacon.rotation.z = Math.sin(time / 500 + i) * 0.25;
      p.beacon.position.y = 3.6 + Math.sin(time / 450 + i * 2) * 0.35;
      p.light.position.y = p.beacon.position.y;

      // Pulse pillar
      (p.pillar.material as THREE.MeshBasicMaterial).opacity =
        0.2 + (p.isContested ? 0.3 * Math.abs(Math.sin(time / 150)) : 0.12 * Math.sin(time / 300));

      // Calculate distance to player
      const distToPlayer = Math.hypot(pObj.position.x - p.x, pObj.position.z - p.z);
      const playerInside = !this.isDead && distToPlayer <= 7.5;

      // Count Blue and Red units inside capture radius (7.5 meters)
      let blueCount = playerInside && this.playerTeam === 'blue' ? 1 : 0;
      let redCount = playerInside && this.playerTeam === 'red' ? 1 : 0;

      for (let b = 0; b < this.enemiesArray.length; b++) {
        const bot = this.enemiesArray[b];
        if (bot.hp <= 0) continue;
        const d = Math.hypot(bot.group.position.x - p.x, bot.group.position.z - p.z);
        if (d <= 7.5) {
          if (bot.team === 'blue') blueCount++;
          else if (bot.team === 'red') redCount++;
        }
      }

      const contested = blueCount > 0 && redCount > 0;
      p.isContested = contested;

      if (!contested) {
        if (blueCount > 0) {
          p.capturingTeam = 'blue';
          if (p.owner === 'red') {
            p.progress -= delta * 36 * Math.min(3, blueCount);
            if (p.progress <= 0) {
              p.owner = null;
              p.progress = 0;
              this.addKillFeedEntry('SYSTEM', `${p.name} NEUTRALIZED`, '#ffffff');
            }
          } else if (p.owner !== 'blue') {
            p.progress += delta * 36 * Math.min(3, blueCount);
            if (p.progress >= 100) {
              p.progress = 100;
              p.owner = 'blue';
              this.addKillFeedEntry('BLUE TEAM', `CAPTURED ${p.name}`, '#00d4ff');
              if (playerInside && this.playerTeam === 'blue') {
                this.score += 150;
                this.healPlayer(35, 'OBJECTIVE SECURED');
                this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);
              }
            }
          }
        } else if (redCount > 0) {
          p.capturingTeam = 'red';
          if (p.owner === 'blue') {
            p.progress -= delta * 36 * Math.min(3, redCount);
            if (p.progress <= 0) {
              p.owner = null;
              p.progress = 0;
              this.addKillFeedEntry('SYSTEM', `${p.name} NEUTRALIZED`, '#ffffff');
            }
          } else if (p.owner !== 'red') {
            p.progress += delta * 36 * Math.min(3, redCount);
            if (p.progress >= 100) {
              p.progress = 100;
              p.owner = 'red';
              this.addKillFeedEntry('RED TEAM', `CAPTURED ${p.name}`, '#ff2a6d');
              if (playerInside && this.playerTeam === 'red') {
                this.score += 150;
                this.healPlayer(35, 'OBJECTIVE SECURED');
                this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);
              }
            }
          }
        } else {
          p.capturingTeam = null;
          // Slowly decay if halfway captured but unowned
          if (p.owner === null && p.progress > 0) {
            p.progress = Math.max(0, p.progress - delta * 12);
          }
        }
      }

      this.updateDomPointVisuals(p);

      states.push({
        id: p.id,
        name: p.name,
        owner: p.owner,
        progress: Math.round(p.progress),
        capturingTeam: p.capturingTeam,
        isContested: p.isContested,
        playerInside
      });
    }

    // Domination score ticking: every 1.8s grant +1 score per held point
    if (time - this.lastDomScoreTick > 1800) {
      this.lastDomScoreTick = time;
      let blueAdd = 0;
      let redAdd = 0;
      for (const p of this.domPoints) {
        if (p.owner === 'blue') blueAdd++;
        if (p.owner === 'red') redAdd++;
      }
      if (blueAdd > 0 || redAdd > 0) {
        this.teamScoreBlue = Math.min(this.targetScoreDom, this.teamScoreBlue + blueAdd);
        this.teamScoreRed = Math.min(this.targetScoreDom, this.teamScoreRed + redAdd);
        this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);

        if (this.teamScoreBlue >= this.targetScoreDom) {
          this.addKillFeedEntry('MATCH', 'BLUE TEAM VICTORY!', '#00d4ff');
          this.checkMatchEnd();
        } else if (this.teamScoreRed >= this.targetScoreDom) {
          this.addKillFeedEntry('MATCH', 'RED TEAM VICTORY!', '#ff2a6d');
          this.checkMatchEnd();
        }
      }
    }

    this.onDomUpdate?.(states, this.teamScoreBlue, this.teamScoreRed);
  }

  createEdgeSignTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 340;
    const ctx = canvas.getContext('2d')!;

    // Dark high-tech carbon metallic background
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, 1024, 340);

    // Cyber hazard border
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 1008, 324);

    ctx.strokeStyle = '#ff2a6d';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 984, 300);

    // Hazard chevron stripes on top and bottom
    const stripeW = 36;
    ctx.fillStyle = '#ff2a6d';
    for (let x = 16; x < 1008; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x + stripeW, 14);
      ctx.lineTo(x + stripeW - 14, 48);
      ctx.lineTo(x - 14, 48);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, 292);
      ctx.lineTo(x + stripeW, 292);
      ctx.lineTo(x + stripeW - 14, 326);
      ctx.lineTo(x - 14, 326);
      ctx.fill();
    }

    // Glow effect
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 28;

    // Main Title: "THIS IS THE EDGE!"
    ctx.font = '900 italic 82px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ THIS IS THE EDGE! ⚠️', 512, 126);

    // Subtitle: INVISIBLE CONTAINMENT BARRIER
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 18;
    ctx.font = '800 32px monospace';
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('// INVISIBLE CONTAINMENT BARRIER ACTIVE //', 512, 212);

    // Caution details
    ctx.shadowBlur = 0;
    ctx.font = '700 20px monospace';
    ctx.fillStyle = '#ff88aa';
    ctx.fillText('MAP PERIMETER REACHED • ACCESS RESTRICTED BEYOND FIELD', 512, 258);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  createBarrierGridTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(2, 6, 16, 0.25)';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.85)';
    ctx.lineWidth = 3;

    // Neon laser grid
    const step = 64;
    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Intersecting hazard nodes
    ctx.fillStyle = 'rgba(255, 42, 109, 0.95)';
    for (let x = 0; x <= 512; x += step) {
      for (let y = 0; y <= 512; y += step) {
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 3);
    return tex;
  }

  createEdgeBarriers(cfg: MapConfig) {
    if (!this.barrierGridTexture) {
      this.barrierGridTexture = this.createBarrierGridTexture();
    }

    const half = cfg.size / 2;
    const wallHeight = 44;
    const wallGeo = new THREE.PlaneGeometry(cfg.size, wallHeight);

    const wallMat = new THREE.MeshBasicMaterial({
      map: this.barrierGridTexture,
      transparent: true,
      opacity: 0.10,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const borderConfigs = [
      { x: 0, z: -half, rotY: 0, name: 'North' },
      { x: 0, z: half, rotY: Math.PI, name: 'South' },
      { x: half, z: 0, rotY: -Math.PI / 2, name: 'East' },
      { x: -half, z: 0, rotY: Math.PI / 2, name: 'West' }
    ];

    borderConfigs.forEach((bc) => {
      // Semi-transparent laser grid barrier wall
      const wallMesh = new THREE.Mesh(wallGeo, wallMat.clone());
      wallMesh.position.set(bc.x, wallHeight / 2, bc.z);
      wallMesh.rotation.y = bc.rotY;
      this.scene.add(wallMesh);
      this.barrierMeshes.push(wallMesh);
    });
  }

  rebuildMap() {
    const cfg = MAP_CONFIGS[this.currentMapKey] || MAP_CONFIGS['neoncity'];
    this.clearWorld();

    this.scene.background = new THREE.Color(cfg.skyMid);
    this.scene.fog = new THREE.FogExp2(cfg.fogColor, cfg.fogDensity);

    if (this.hemiLight) {
      this.hemiLight.color.setHex(cfg.hemiSky);
      this.hemiLight.groundColor.setHex(cfg.hemiGround);
      this.hemiLight.intensity = cfg.hemiIntensity;
    }
    if (this.sunLight) {
      this.sunLight.color.setHex(cfg.sunColor);
      this.sunLight.intensity = cfg.sunIntensity;
    }
    if (this.rimLight) {
      this.rimLight.color.setHex(cfg.rimColor);
      this.rimLight.intensity = cfg.rimIntensity;
    }

    this.createSky(cfg);
    this.createGround(cfg);
    this.createCity(cfg);
    this.createCover(cfg);
    this.createEdgeBarriers(cfg);

    if (this.currentGameMode === 'dom') {
      this.createDomPoints(cfg);
    }

    // Spawn AI bots
    for (let i = 0; i < this.settings.botCount; i++) {
      const team = this.currentGameMode === 'ffa' ? 'hostile' : i % 2 === 0 ? 'blue' : 'red';
      this.spawnBot(team);
    }
  }

  createCharacterModel(team: 'blue' | 'red' | 'hostile') {
    const color = team === 'blue' ? 0x00d4ff : team === 'red' ? 0xff2a6d : 0xffaa00;
    const armor = new THREE.MeshStandardMaterial({ color: 0x0d121c, metalness: 0.9, roughness: 0.32 });
    const armor2 = new THREE.MeshStandardMaterial({ color: 0x1a2333, metalness: 0.72, roughness: 0.48 });
    const glow = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.2,
      metalness: 0.3,
      roughness: 0.3
    });
    const darkGlow = new THREE.MeshStandardMaterial({ color: 0x05070c, metalness: 0.6, roughness: 0.6 });

    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.0, 0.52), armor);
    torso.position.y = 1.78;
    const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.44), armor2);
    abdomen.position.y = 1.2;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.06), glow);
    chest.position.set(0, 2.0, -0.28);
    const backCore = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.08), glow);
    backCore.position.set(0, 1.9, 0.29);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), armor);
    head.position.y = 2.5;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.06), glow);
    visor.position.set(0, 2.53, -0.22);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.3), darkGlow);
    crest.position.set(0, 2.74, 0);

    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.42), armor2);
    shoulderL.position.set(-0.56, 2.14, 0);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.56;

    const makeArm = (side: number) => {
      const arm = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.24), armor2);
      upper.position.y = -0.28;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.5, 0.2), armor);
      lower.position.y = -0.78;
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.18, 0.22), darkGlow);
      hand.position.y = -1.1;
      arm.add(upper, lower, hand);
      arm.position.set(side * 0.58, 2.16, 0);
      return arm;
    };

    const makeLeg = (side: number) => {
      const leg = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.6, 0.3), armor2);
      upper.position.y = -0.3;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.55, 0.25), armor);
      lower.position.y = -0.86;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.16, 0.42), darkGlow);
      foot.position.set(0, -1.16, -0.07);
      leg.add(upper, lower, foot);
      leg.position.set(side * 0.23, 1.12, 0);
      return leg;
    };

    const armL = makeArm(-1);
    const armR = makeArm(1);

    // Equip team-specific weapon: Red team carries AK-47 or Vector, Blue team carries M4 or UMP
    const weaponTeam = team === 'red' ? 'red' : 'blue';
    const wepClass: WeaponClassKey = Math.random() > 0.4 ? 'ar' : 'smg';
    const heldWeapon = buildThirdPersonWeapon(wepClass, weaponTeam);
    heldWeapon.position.set(0, -1.05, -0.22);
    heldWeapon.rotation.x = -Math.PI / 10;
    armR.add(heldWeapon);

    const legL = makeLeg(-1);
    const legR = makeLeg(1);

    g.add(torso, abdomen, chest, backCore, head, visor, crest, shoulderL, shoulderR, armL, armR, legL, legR);
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Increased bot scale from 0.78 to 1.15 ("more bigger but not too big")
    g.scale.setScalar(1.15);
    return { group: g, armL, armR, legL, legR, head, torso };
  }

  spawnBot(team: 'blue' | 'red' | 'hostile') {
    const model = this.createCharacterModel(team);
    const g = model.group;
    const cfg = MAP_CONFIGS[this.currentMapKey] || MAP_CONFIGS['neoncity'];

    let px = 0,
      pz = 0,
      ok = false;
    for (let t = 0; t < 40; t++) {
      px = (Math.random() - 0.5) * (cfg.size - 90);
      pz = (Math.random() - 0.5) * (cfg.size - 90);
      if (this.rectFree(px, pz, 2, 2, 2, 2) && Math.hypot(px, pz) > 15) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      px = (Math.random() - 0.5) * 80;
      pz = (Math.random() - 0.5) * 80;
    }

    const BOT_NAMES = ['Vortex', 'Phantom', 'Ghost_9', 'Neon_Wolf', 'Cipher', 'Apex', 'Razor', 'Zero_Cool', 'Onyx', 'Specter', 'Viper', 'Kage'];
    const botName = `${BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]}_${Math.floor(Math.random() * 89 + 10)}`;

    const isAlly = team === this.playerTeam && this.currentGameMode !== 'ffa';
    const smartness = Math.min(10, Math.max(1, isAlly ? this.allyBotSmartness : this.enemyBotSmartness));
    const baseHp = Math.round(75 + smartness * 6.5);
    const baseSpeed = 3.6 + smartness * 0.42;

    g.position.set(px, 0, pz);
    this.scene.add(g);
    this.enemiesArray.push({
      id: `bot_${Math.random().toString(36).substring(2, 9)}`,
      name: botName,
      group: g,
      parts: model,
      hp: baseHp,
      maxHp: baseHp,
      team,
      smartness,
      lastAttack: 0,
      walkPhase: Math.random() * 10,
      speed: baseSpeed + (Math.random() - 0.5) * 0.3,
      target: null,
      retargetTime: 0,
      kills: 0,
      deaths: 0,
      score: 0,
      captures: 0,
      stunTimer: 0
    });
  }

  resetPlayer() {
    this.playerHP = this.maxHP;
    this.onHealthChange?.(this.maxHP, this.maxHP);
    this.isDead = false;
    this.onDeathChange?.(false);
    this.playerVelocity.set(0, 0, 0);

    this.matchEnded = false;
    this.playerKills = 0;
    this.playerDeaths = 0;
    this.playerCaptures = 0;
    this.score = 0;
    this.teamScoreBlue = 0;
    this.teamScoreRed = 0;
    this.onScoreChange?.(0, 0, 0);

    this.shiftHeld = false;
    this.isSliding = false;
    this.isCrouching = false;
    this.slideBoost = false;
    this.lastShiftPressTime = 0;
    this.lastSpacePressTime = 0;
    this.lastDamageTime = 0;
    this.isRegenerating = false;
    this.timeInCover = 0;
    this.isCoverHealing = false;
    this.isInCover = false;
    this.lastCoverCheckTime = 0;
    this.multiKillCount = 0;
    this.currentStreak = 0;
    this.tabletStrikeReady = false;
    this.onTabletReadyChange?.(false);
    this.isAiming = false;
    this.adsToggleActive = false;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.isInspecting = false;
    this.isSlashing = false;
    this.isThrowing = false;
    this.isShooting = false;
    this.scopeAmount = 0;
    this.aimLineAmount = 0;

    this.ammo[1] = WEAPON_CLASSES[this.currentWeaponClass].mag;
    this.ammo[2] = WEAPONS_FIXED[2].mag;
    this.ammo[4] = 2;
    this.ammo[5] = 2;
    this.notifyAmmo();

    // CRITICAL FIX FOR GRAY SCREEN & SPAWNING:
    // Spawn player safely on the ground at STANDING_HEIGHT (1.6) in the central plaza!
    // No spawning at y=45 falling into the abyss or into a building roof!
    const pObj = this.camera;
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 5 + Math.random() * 12;
    const spawnX = Math.cos(spawnAngle) * spawnDist;
    const spawnZ = Math.sin(spawnAngle) * spawnDist;

    pObj.position.set(spawnX, this.STANDING_HEIGHT, spawnZ);
    this.currentHeight = this.STANDING_HEIGHT;
    this.onGround = true;
    this.canJump = true;

    // 3-second invulnerable spawn shield
    this.spawnShieldTime = 3.0;
    this.onShieldChange?.(this.spawnShieldTime);
  }

  healPlayer(amount: number, reason: string = 'SIPHON') {
    if (this.isDead || this.playerHP >= this.maxHP) return;
    this.playerHP = Math.min(this.maxHP, this.playerHP + amount);
    this.onHealthChange?.(this.playerHP, this.maxHP);
    this.onHeal?.(amount, reason);
  }

  takeDamage(amount: number) {
    if (this.isDead || this.isPaused) return;

    // 3-second spawn shield deflects all incoming damage!
    if (this.spawnShieldTime > 0) {
      this.onShieldHit?.();
      const camPos = this.camera.position.clone();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.spawnImpact(camPos.addScaledVector(forward, 0.8), null, 0x00d4ff, 7);
      return;
    }

    this.playerHP -= amount;
    this.lastDamageTime = performance.now();
    this.isRegenerating = false;
    this.timeInCover = 0;
    this.isCoverHealing = false;
    this.camShakeTime = 0.22;
    this.camShakeIntensity = Math.min(amount * 0.006, 0.06) * this.settings.shakeIntensity;
    this.onFlash?.('damage-flash');
    this.onHealthChange?.(Math.max(0, this.playerHP), this.maxHP);

    if (this.playerHP <= 0) {
      this.playerHP = 0;
      this.onPlayerDeath();
    }
  }

  onPlayerDeath() {
    this.isDead = true;
    this.playerDeaths++;
    this.onDeathChange?.(true);
    this.onFlash?.('damage-flash');
    this.addKillFeedEntry('HOSTILE', 'YOU', '#ff2a6d');

    setTimeout(() => {
      this.resetPlayer();
    }, 2200);
  }

  addKillFeedEntry(killer: string, victim: string, color: string) {
    this.onKillFeed?.({
      id: Math.random().toString(),
      killer,
      victim,
      color,
      timestamp: Date.now()
    });
  }

  spawnImpact(pos: THREE.Vector3, normal: THREE.Vector3 | null, color: number, count: number = 8) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      const dir = normal
        ? normal
            .clone()
            .multiplyScalar(0.6)
            .add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5))
            .normalize()
        : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: dir.multiplyScalar(6 + Math.random() * 12),
        life: 0.8,
        maxLife: 0.8,
        gravity: 20,
        drag: 2.0,
        scale: 1
      });
    }
  }

  spawnTracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.3) return;

    const geo = new THREE.CylinderGeometry(0.022, 0.022, len, 5, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.09, maxLife: 0.09 });
  }

  muzzleFlash() {
    if (this.muzzleLight) this.muzzleLight.intensity = 3.6;
    if (this.muzzleFlashMesh) {
      (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
      this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
      this.muzzleFlashMesh.scale.setScalar(0.8 + Math.random() * 0.6);
    }
  }

  throwGrenade(isNonLethal: boolean) {
    const camPos = this.camera.getWorldPosition(new THREE.Vector3());
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const spawnPos = camPos
      .clone()
      .addScaledVector(camDir, 0.6)
      .add(new THREE.Vector3(0.15, -0.12, 0).applyQuaternion(this.camera.quaternion));

    const gMesh = new THREE.Group();
    if (!isNonLethal) {
      // Lethal Plasma Frag Grenade
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.85, roughness: 0.25 })
      );
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff4400, emissiveIntensity: 3.2 })
      );
      gMesh.add(sphere, core);
    } else {
      // Non-Lethal EMP Flash Canister
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x0d121c, metalness: 0.8, roughness: 0.3 })
      );
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.045, 12),
        new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00d4ff, emissiveIntensity: 3.2 })
      );
      gMesh.add(can, ring);
    }

    const light = new THREE.PointLight(isNonLethal ? 0x00ffff : 0xff4400, 2.5, 7, 2);
    gMesh.add(light);
    gMesh.position.copy(spawnPos);
    this.scene.add(gMesh);

    const forwardSpeed = 25;
    const upSpeed = 4.2;
    const vel = camDir
      .clone()
      .multiplyScalar(forwardSpeed)
      .add(new THREE.Vector3(0, upSpeed, 0))
      .addScaledVector(this.playerVelocity, 0.35);

    this.thrownGrenades.push({
      mesh: gMesh,
      vel,
      isNonLethal,
      fuse: isNonLethal ? 1.4 : 1.85,
      timer: 0,
      bounces: 0,
      light
    });
  }

  updateGrenades(delta: number) {
    for (let i = this.thrownGrenades.length - 1; i >= 0; i--) {
      const g = this.thrownGrenades[i];
      g.timer += delta;

      if (g.light) {
        const pulseRate = g.timer / g.fuse > 0.6 ? 25 : 12;
        g.light.intensity = 1.0 + Math.sin(g.timer * pulseRate) * 1.8;
      }

      if (g.timer >= g.fuse) {
        const detPos = g.mesh.position.clone();
        this.scene.remove(g.mesh);
        this.thrownGrenades.splice(i, 1);
        if (!g.isNonLethal) {
          this.detonateFrag(detPos);
        } else {
          this.detonateEmp(detPos);
        }
        continue;
      }

      g.vel.y -= 25.0 * delta;
      g.mesh.position.addScaledVector(g.vel, delta);
      g.mesh.rotation.x += 7.0 * delta;
      g.mesh.rotation.z += 5.0 * delta;

      if (g.mesh.position.y <= 0.16) {
        g.mesh.position.y = 0.16;
        g.vel.y = -g.vel.y * 0.42;
        g.vel.x *= 0.72;
        g.vel.z *= 0.72;
        g.bounces++;
      }

      const gBox = new THREE.Box3().setFromCenterAndSize(g.mesh.position, new THREE.Vector3(0.35, 0.35, 0.35));
      for (let c = 0; c < this.collisionBoxes.length; c++) {
        if (this.collisionBoxes[c].intersectsBox(gBox)) {
          g.vel.x = -g.vel.x * 0.55;
          g.vel.z = -g.vel.z * 0.55;
          break;
        }
      }
    }
  }

  detonateFrag(pos: THREE.Vector3) {
    this.spawnImpact(pos, null, 0xff4400, 40);
    this.camShakeTime = 0.55;
    this.camShakeIntensity = 0.08 * this.settings.shakeIntensity;

    for (let i = this.enemiesArray.length - 1; i >= 0; i--) {
      const bot = this.enemiesArray[i];
      const dist = bot.group.position.distanceTo(pos);
      if (dist <= 13) {
        const dmg = Math.round(180 * (1 - dist / 13));
        bot.hp -= dmg;
        this.onDamageNumber?.({
          id: ++this.damageCounter,
          amount: dmg,
          crit: dist < 4,
          x: THREE.MathUtils.randFloat(-15, 15),
          y: THREE.MathUtils.randFloat(-15, 15)
        });
        if (bot.hp <= 0) {
          this.score += 20;
          this.playerKills++;
          bot.deaths++;
          this.healPlayer(30, 'FRAG KILL');
          this.spawnImpact(bot.group.position.clone().setY(1.2), null, 0xff4400, 25);
          this.scene.remove(bot.group);
          this.enemiesArray.splice(i, 1);
          this.addKillFeedEntry('LETHAL FRAG', bot.name, '#ff5500');
          this.handlePlayerKill(bot.name);
          setTimeout(() => this.spawnBot(bot.team), 3500);
        }
      }
    }

    const pDist = this.camera.position.distanceTo(pos);
    if (pDist <= 8.5) {
      const selfDmg = Math.round(85 * (1 - pDist / 8.5));
      this.takeDamage(selfDmg);
      this.onFlash?.('damage-flash');
    }

    this.checkMatchEnd();
  }

  detonateEmp(pos: THREE.Vector3) {
    this.spawnImpact(pos, null, 0x00ffff, 35);

    const pDist = this.camera.position.distanceTo(pos);
    if (pDist <= 24) {
      const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const toEmp = new THREE.Vector3().subVectors(pos, this.camera.position).normalize();
      const dot = camDir.dot(toEmp);
      if (dot > 0.1 || pDist < 7.5) {
        this.onFlash?.('emp-blind');
        this.camShakeTime = 0.45;
        this.camShakeIntensity = 0.05 * this.settings.shakeIntensity;
      }
    }

    let stunnedCount = 0;
    for (let i = 0; i < this.enemiesArray.length; i++) {
      const bot = this.enemiesArray[i];
      const dist = bot.group.position.distanceTo(pos);
      if (dist <= 22) {
        bot.stunTimer = 4.0;
        bot.target = null;
        bot.hp = Math.max(1, bot.hp - 15);
        stunnedCount++;
        this.spawnImpact(bot.group.position.clone().setY(2.2), null, 0x00ffff, 14);
      }
    }
    if (stunnedCount > 0) {
      this.addKillFeedEntry('EMP CONCUSSION', `STUNNED ${stunnedCount} ENEMY UNITS`, '#00ffff');
    }
  }

  getScoreboard(): ScoreboardEntry[] {
    const entries: ScoreboardEntry[] = [];

    entries.push({
      id: 'local_player',
      name: this.playerName || 'OPERATIVE',
      team: this.playerTeam,
      isLocalPlayer: true,
      kills: this.playerKills,
      deaths: this.playerDeaths,
      score: this.score,
      captures: this.playerCaptures,
      ping: this.isOnline ? 18 : 0
    });

    if (this.isOnline && this.mpClient) {
      for (const [id, rp] of this.mpClient.remotePlayers.entries()) {
        entries.push({
          id,
          name: rp.name || 'Remote Operative',
          team: rp.team,
          isLocalPlayer: false,
          kills: 0,
          deaths: 0,
          score: 0,
          captures: 0,
          ping: 32
        });
      }
    }

    for (const b of this.enemiesArray) {
      entries.push({
        id: b.id,
        name: b.name,
        team: b.team,
        isLocalPlayer: false,
        kills: b.kills,
        deaths: b.deaths,
        score: b.score,
        captures: b.captures
      });
    }

    entries.sort((a, b) => b.score - a.score || b.kills - a.kills);
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return entries;
  }

  checkMatchEnd() {
    if (this.matchEnded) return;
    if (this.matchTimeRemaining <= 0) {
      this.finishMatch();
      return;
    }
    if (this.currentGameMode === 'ffa') {
      const ffaKillsTarget = Math.max(15, Math.round(this.targetScoreFfa / 100));
      if (this.score >= this.targetScoreFfa || this.playerKills >= ffaKillsTarget) {
        this.finishMatch();
      }
    } else if (this.currentGameMode === 'tdm') {
      if (this.teamScoreBlue >= this.targetScoreTdm || this.teamScoreRed >= this.targetScoreTdm) {
        this.finishMatch();
      }
    } else if (this.currentGameMode === 'dom') {
      if (this.teamScoreBlue >= this.targetScoreDom || this.teamScoreRed >= this.targetScoreDom) {
        this.finishMatch();
      }
    }
  }

  finishMatch() {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.isShooting = false;
    const scoreboard = this.getScoreboard();

    const playerIndex = scoreboard.findIndex((e) => e.isLocalPlayer);
    const playerRank = playerIndex >= 0 ? playerIndex + 1 : scoreboard.length;

    // Coins: 1st place: 25, 2nd place: 15, 3rd place: 8, others: 3
    let coinsEarned = 0;
    if (playerRank === 1) coinsEarned = 25;
    else if (playerRank === 2) coinsEarned = 15;
    else if (playerRank === 3) coinsEarned = 8;
    else coinsEarned = 3;

    let winnerTeam: 'blue' | 'red' | null = null;
    if (this.currentGameMode === 'tdm' || this.currentGameMode === 'dom') {
      winnerTeam = this.teamScoreBlue >= this.teamScoreRed ? 'blue' : 'red';
    }

    const result: MatchEndResult = {
      winnerTeam,
      winnerName: scoreboard[0]?.name || 'CHAMPION',
      playerRank,
      coinsEarned,
      scoreboard,
      gamemode: this.currentGameMode
    };

    if (this.controls.isLocked) {
      this.controls.unlock();
    }
    this.isPaused = true;
    this.onPauseChange?.(true);
    this.onMatchEnd?.(result);
  }

  startReload() {
    if (this.currentWeaponSlot === 3 || this.isReloading) return;
    const w = this.getWeapon(this.currentWeaponSlot);
    if ((this.ammo[this.currentWeaponSlot] || 0) >= w.mag) return;
    this.isReloading = true;
    this.reloadProgress = 0;
    this.reloadDuration = w.reloadTime;
  }

  finishReload() {
    const w = this.getWeapon(this.currentWeaponSlot);
    this.ammo[this.currentWeaponSlot] = w.mag;
    this.isReloading = false;
    this.reloadProgress = 0;
    this.notifyAmmo();
  }

  performAttack() {
    if (this.isDead || this.isReloading || this.isPaused) return;
    const now = performance.now();
    const w = this.getWeapon(this.currentWeaponSlot);
    const fireDelay = 60000 / w.rpm;
    if (now - this.lastFireTime < fireDelay) return;

    if (this.currentWeaponSlot === 4 || this.currentWeaponSlot === 5) {
      const isNonLethal = this.currentWeaponSlot === 5;
      if (this.ammo[this.currentWeaponSlot] <= 0) {
        this.startReload();
        return;
      }
      this.ammo[this.currentWeaponSlot]--;
      this.notifyAmmo();
      this.lastFireTime = now;
      this.isThrowing = true;
      this.throwProgress = 0;
      this.onFlash?.('slash-flash');
      this.throwGrenade(isNonLethal);
      if (this.ammo[this.currentWeaponSlot] === 0) {
        setTimeout(() => this.startReload(), 500);
      }
      return;
    }

    if (this.currentWeaponSlot <= 2) {
      if (this.ammo[this.currentWeaponSlot] <= 0) {
        this.startReload();
        return;
      }
      this.ammo[this.currentWeaponSlot]--;
      this.notifyAmmo();
      if (this.ammo[this.currentWeaponSlot] === 0) {
        setTimeout(() => this.startReload(), 180);
      }
    }
    this.lastFireTime = now;

    // Satisfying CS-style shooting audio
    if (this.currentWeaponSlot === 3) {
      soundManager.playShoot('knife');
    } else if (this.currentWeaponSlot === 2) {
      soundManager.playShoot('pistol');
    } else if (this.currentWeaponSlot === 1) {
      soundManager.playShoot(this.currentWeaponClass);
    }

    const scopedSniper = this.isAiming && w.hasScope;
    const adsActive = this.isAiming && !w.hasScope;
    const scopeReduction = scopedSniper ? 0.35 : adsActive ? 0.7 : 1;

    this.recoilOffsetZ = 0.14 * scopeReduction;
    this.recoilRotX = w.recoil * scopeReduction;
    this.camShakeTime = 0.07;
    this.camShakeIntensity =
      (this.currentWeaponSlot === 3 ? 0.012 : 0.018) * scopeReduction * this.settings.shakeIntensity;

    if (this.currentWeaponSlot === 3) {
      this.onFlash?.('slash-flash');
      if (!this.isSlashing) {
        this.isSlashing = true;
        this.slashProgress = 0;
      }
    } else {
      this.onFlash?.('flash');
      this.muzzleFlash();
    }

    const curSpeed = Math.sqrt(this.playerVelocity.x ** 2 + this.playerVelocity.z ** 2);
    let baseSpread = w.spread;
    if (this.isAiming) baseSpread *= w.adsSpreadMult !== undefined ? w.adsSpreadMult : 1;
    let spread = baseSpread * (1 + curSpeed * 0.045);
    if (!this.onGround) spread *= this.isAiming ? 1.5 : 2.0;

    const camPos = this.camera.getWorldPosition(new THREE.Vector3());
    const gunPos = camPos
      .clone()
      .add(new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).multiplyScalar(0.6))
      .add(new THREE.Vector3(0.2, -0.14, 0).applyQuaternion(this.camera.quaternion));

    if (this.currentWeaponSlot === 3) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const targets = this.mapObjects.concat(this.enemiesArray.map((e) => e.group));
      const hits = this.raycaster.intersectObjects(targets, true);
      if (hits.length && hits[0].distance < 5.2) {
        this.spawnImpact(hits[0].point, hits[0].face ? hits[0].face.normal : null, 0xff2a6d, 14);
        this.processDamage(hits[0].object, w.dmg, hits[0].point, true);
      }
      return;
    }

    const pelletCount = w.pellets || 1;
    const remotePlayerGroups =
      this.isOnline && this.mpClient
        ? Array.from(this.mpClient.remotePlayers.values()).map((rp) => rp.group)
        : [];
    const targets = this.mapObjects
      .concat(this.enemiesArray.map((e) => e.group))
      .concat(remotePlayerGroups);
    let selfDamageApplied = false;

    for (let p = 0; p < pelletCount; p++) {
      const ox = (Math.random() - 0.5) * spread * 2;
      const oy = (Math.random() - 0.5) * spread * 2;
      this.raycaster.setFromCamera(new THREE.Vector2(ox, oy), this.camera);
      const hits = this.raycaster.intersectObjects(targets, true);

      if (hits.length) {
        const hit = hits[0];
        const remotePlayerHit = this.getRemotePlayerFromObject(hit.object);
        const isEnemy = this.isEnemyObject(hit.object) || !!remotePlayerHit;
        const color = isEnemy ? 0xff2a6d : this.currentWeaponSlot === 1 ? 0x66ddff : 0xffcc55;

        if (p === 0) {
          this.spawnTracer(gunPos, hit.point, this.currentWeaponSlot === 1 ? 0x9fe8ff : 0xffd070);
        }
        this.spawnImpact(hit.point, hit.face ? hit.face.normal : null, color, isEnemy ? 10 : 5);

        if (remotePlayerHit) {
          if (remotePlayerHit.team !== this.playerTeam || this.currentGameMode === 'ffa') {
            let dmg = w.dmg;
            if (w.closeBonus && hit.distance <= w.closeBonus.range) {
              dmg = Math.round(dmg * w.closeBonus.mult);
            } else if (w.falloff && hit.distance > w.falloff.start) {
              const { start, end, minMult } = w.falloff;
              const t = Math.min(1, (hit.distance - start) / (end - start));
              dmg = Math.max(1, Math.round(dmg * (1 - t * (1 - minMult))));
            }
            const crit = Math.random() < 0.2 || w.hasScope;
            dmg = Math.round(dmg * (crit ? 1.6 : 1));

            this.onHitmarker?.(false);
            soundManager.playHitmarker(crit);
            this.damageCounter++;
            this.onDamageNumber?.({
              id: this.damageCounter,
              amount: dmg,
              crit,
              x: THREE.MathUtils.randFloat(-15, 15),
              y: THREE.MathUtils.randFloat(-15, 15)
            });

            this.mpClient?.sendHit(remotePlayerHit.id, dmg, crit);
            remotePlayerHit.hp -= dmg;
            if (remotePlayerHit.hp <= 0) {
              this.onHitmarker?.(true);
              soundManager.playKillConfirm();
              this.healPlayer(25, 'COMBAT SIPHON');
              this.handlePlayerKill(remotePlayerHit.name);
              this.mpClient?.sendKill('YOU', remotePlayerHit.name, '#00d4ff');
              this.score += 20;
              this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);
            }
          }
        } else if (isEnemy) {
          let dmg = w.dmg;
          if (w.closeBonus && hit.distance <= w.closeBonus.range) {
            // Close range: high damage multiplier to guarantee a devastating one-shot
            dmg = Math.round(dmg * w.closeBonus.mult);
          } else if (w.falloff && hit.distance > w.falloff.start) {
            // Distant range: steep falloff so far away shots do very little damage (1 dmg per pellet)
            const { start, end, minMult } = w.falloff;
            const t = Math.min(1, (hit.distance - start) / (end - start));
            dmg = Math.max(1, Math.round(dmg * (1 - t * (1 - minMult))));
          }
          const crit = Math.random() < 0.2 || w.hasScope;
          dmg = Math.round(dmg * (crit ? 1.6 : 1));
          this.processDamage(hit.object, dmg, hit.point, crit);
        } else if (this.currentWeaponSlot === 1 && w.rocketJump && !selfDamageApplied) {
          // Rocket jump on shooting walls/ground near feet
          const pObj = this.camera;
          const playerMid = new THREE.Vector3(
            pObj.position.x,
            pObj.position.y - this.currentHeight * 0.5,
            pObj.position.z
          );
          const dist = hit.point.distanceTo(playerMid);
          const JUMP_RADIUS = 10.5;

          if (dist < JUMP_RADIUS) {
            const pushDir = playerMid.clone().sub(hit.point);
            if (pushDir.lengthSq() < 0.001) pushDir.set(0, 1, 0);
            pushDir.normalize();
            const force = (1 - dist / JUMP_RADIUS) * 38;
            this.playerVelocity.addScaledVector(pushDir, force);
            if (hit.point.y < pObj.position.y - this.currentHeight + 0.6) {
              this.playerVelocity.y = Math.max(this.playerVelocity.y, force * 0.7);
            }
            if (this.playerVelocity.y > 0) this.onGround = false;
            selfDamageApplied = true;
          }
        }
      } else if (p === 0) {
        const far = camPos
          .clone()
          .add(new THREE.Vector3(ox, oy, -1).applyQuaternion(this.camera.quaternion).multiplyScalar(300));
        this.spawnTracer(gunPos, far, this.currentWeaponSlot === 1 ? 0x9fe8ff : 0xffd070);
      }
    }

    if (this.isOnline && this.mpClient) {
      const farPoint = camPos
        .clone()
        .add(new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).multiplyScalar(150));
      this.mpClient.sendShoot(gunPos, farPoint, this.currentWeaponSlot, this.currentWeaponClass);
    }
  }

  isEnemyObject(obj: THREE.Object3D | null): boolean {
    let o: THREE.Object3D | null = obj;
    while (o) {
      for (let i = 0; i < this.enemiesArray.length; i++) {
        if (this.enemiesArray[i].group === o) return true;
      }
      o = o.parent;
    }
    return false;
  }

  processDamage(obj: THREE.Object3D, dmg: number, hitPoint: THREE.Vector3, crit: boolean) {
    for (let idx = 0; idx < this.enemiesArray.length; idx++) {
      const e = this.enemiesArray[idx];
      let o: THREE.Object3D | null = obj;
      let found = false;
      while (o) {
        if (o === e.group) {
          found = true;
          break;
        }
        o = o.parent;
      }
      if (!found) continue;
      if (e.team === this.playerTeam && this.currentGameMode !== 'ffa') continue;

      this.onHitmarker?.(false);
      soundManager.playHitmarker(crit);
      this.damageCounter++;
      this.onDamageNumber?.({
        id: this.damageCounter,
        amount: dmg,
        crit,
        x: THREE.MathUtils.randFloat(-15, 15),
        y: THREE.MathUtils.randFloat(-15, 15)
      });

      e.hp -= dmg;
      if (e.hp <= 0) {
        this.onHitmarker?.(true);
        soundManager.playKillConfirm();
        this.healPlayer(25, 'COMBAT SIPHON');
        this.spawnImpact(e.group.position.clone().setY(1.2), null, 0xff2a6d, 22);
        this.scene.remove(e.group);
        this.enemiesArray.splice(idx, 1);
        this.playerKills++;
        e.deaths++;

        const enemyName = e.name || (e.team === 'blue' ? 'BLUE-BOT' : e.team === 'red' ? 'RED-BOT' : 'HOSTILE');
        this.addKillFeedEntry('YOU', enemyName, '#00d4ff');
        this.handlePlayerKill(enemyName);

        if (this.currentGameMode === 'ffa') {
          this.score += 20;
        } else if (this.currentGameMode === 'tdm') {
          if (this.playerTeam === 'blue') this.teamScoreBlue += 10;
          else this.teamScoreRed += 10;
        }
        this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);

        // Respawn bot after delay
        setTimeout(() => this.spawnBot(e.team), 3000);
      } else {
        e.group.position.y += 0.03;
      }
      return;
    }
  }

  checkCollision(pos: THREE.Vector3): boolean {
    const cfg = MAP_CONFIGS[this.currentMapKey] || MAP_CONFIGS['neoncity'];
    const half = cfg.size / 2 - 1.2;
    if (Math.abs(pos.x) >= half || Math.abs(pos.z) >= half) {
      soundManager.playEdgeBarrier();
      return true;
    }

    const box = new THREE.Box3(
      new THREE.Vector3(pos.x - this.PLAYER_RADIUS, pos.y - this.currentHeight + 0.03, pos.z - this.PLAYER_RADIUS),
      new THREE.Vector3(pos.x + this.PLAYER_RADIUS, pos.y + 0.03, pos.z + this.PLAYER_RADIUS)
    );
    for (let i = 0; i < this.collisionBoxes.length; i++) {
      if (box.intersectsBox(this.collisionBoxes[i])) return true;
    }
    return false;
  }

  isPlayerHiddenFromEnemies(): boolean {
    const pPos = this.camera.position;
    const testRay = new THREE.Ray();
    const enemyEye = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const hitVec = new THREE.Vector3();

    // Check against all active hostile enemies within sight range (75m)
    for (let i = 0; i < this.enemiesArray.length; i++) {
      const bot = this.enemiesArray[i];
      if (bot.hp <= 0) continue;
      if (bot.team === this.playerTeam && this.currentGameMode !== 'ffa') continue;

      const bp = bot.group.position;
      const dx = bp.x - pPos.x;
      const dz = bp.z - pPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > 75 * 75) continue;

      enemyEye.set(bp.x, bp.y + 1.8, bp.z);
      dir.subVectors(pPos, enemyEye);
      const targetDist = dir.length();
      if (targetDist < 1.2) {
        return false;
      }
      dir.normalize();
      testRay.set(enemyEye, dir);

      let blocked = false;
      for (let c = 0; c < this.collisionBoxes.length; c++) {
        const box = this.collisionBoxes[c];
        const hit = testRay.intersectBox(box, hitVec);
        if (hit) {
          const hitDist = enemyEye.distanceTo(hit);
          if (hitDist < targetDist - 0.4) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked) {
        return false;
      }
    }

    if (this.isOnline && this.mpClient) {
      for (const rp of this.mpClient.remotePlayers.values()) {
        if (rp.team === this.playerTeam && this.currentGameMode !== 'ffa') continue;
        const rPos = rp.group.position;
        const dx = rPos.x - pPos.x;
        const dz = rPos.z - pPos.z;
        if (dx * dx + dz * dz > 75 * 75) continue;

        enemyEye.set(rPos.x, rPos.y + 1.8, rPos.z);
        dir.subVectors(pPos, enemyEye);
        const targetDist = dir.length();
        if (targetDist < 1.2) return false;
        dir.normalize();
        testRay.set(enemyEye, dir);

        let blocked = false;
        for (let c = 0; c < this.collisionBoxes.length; c++) {
          const hit = testRay.intersectBox(this.collisionBoxes[c], hitVec);
          if (hit && enemyEye.distanceTo(hit) < targetDist - 0.4) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          return false;
        }
      }
    }

    return true;
  }

  setupEventListeners() {
    this.controls.addEventListener('lock', () => {
      this.isPaused = false;
      this.onPauseChange?.(false);
    });

    this.controls.addEventListener('unlock', () => {
      if (this.gameActive && !this.isPaused) {
        this.isPaused = true;
        this.onPauseChange?.(true);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!this.controls.isLocked || this.isPaused) return;
      const k = e.code || e.key;

      if (['Space', 'ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) {
        e.preventDefault();
      }

      switch (k) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveF = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveB = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveL = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveR = true;
          break;
        case 'Space':
          if (!this.isDead) {
            const now = performance.now();
            this.lastSpacePressTime = now;

            // Condition B: Clicked shift and within 1 second hit space
            if (this.shiftHeld && (now - this.lastShiftPressTime <= 1000) && !this.isSliding) {
              this.isSliding = true;
              this.isCrouching = false;
              if (this.onGround) this.slideBoost = true;
            } else if (this.canJump && this.onGround) {
              this.playerVelocity.y = 15.5;
              this.canJump = false;
              this.onGround = false;
            }
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          if (!this.isDead) {
            const now = performance.now();
            this.shiftHeld = true;
            this.lastShiftPressTime = now;

            // Condition A: Hitting space before shift (airborne or hit space within 1.2s)
            const spaceHitBeforeShift = (!this.onGround || (now - this.lastSpacePressTime <= 1200));

            if (spaceHitBeforeShift && !this.isSliding) {
              this.isSliding = true;
              this.isCrouching = false;
              if (this.onGround) this.slideBoost = true;
            } else {
              // Spamming shift or pressing shift alone: CROUCH ONLY!
              this.isSliding = false;
              this.isCrouching = true;
            }
          }
          break;
        case 'KeyR':
          this.startReload();
          break;
        case 'Digit1':
          this.setWeapon(1);
          break;
        case 'Digit2':
          this.setWeapon(2);
          break;
        case 'Digit3':
          this.setWeapon(3);
          break;
        case 'Digit4':
          this.setWeapon(4);
          break;
        case 'Digit5':
          this.setWeapon(5);
          break;
        case 'KeyG':
          if (this.tabletStrikeReady) {
            this.launchTabletStrike();
          } else {
            this.setWeapon(4);
          }
          break;
        case 'KeyF':
          if (!this.isInspecting && !this.isAiming && !this.isSlashing) {
            this.isInspecting = true;
            this.inspectProgress = 0;
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.code || e.key;
      switch (k) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveF = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveB = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveL = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveR = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          this.shiftHeld = false;
          this.isSliding = false;
          this.isCrouching = false;
          break;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.controls.isLocked || this.isPaused) return;
      const totalSlots = 5;
      const next =
        e.deltaY > 0
          ? this.currentWeaponSlot < totalSlots
            ? this.currentWeaponSlot + 1
            : 1
          : this.currentWeaponSlot > 1
          ? this.currentWeaponSlot - 1
          : totalSlots;
      this.setWeapon(next);
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.controls.isLocked || this.isPaused) return;

      if (this.isInspecting) {
        this.isInspecting = false;
        if (this.currentWeaponSlot === 3 && this.karambitPivot) {
          this.karambitPivot.rotation.set(0, 0, 0);
        } else {
          this.gunGroup.rotation.set(0, 0, 0);
        }
      }

      if (e.button === 0) {
        const w = this.getWeapon(this.currentWeaponSlot);
        if (w.auto && this.currentWeaponSlot !== 3) {
          this.isShooting = true;
        } else {
          this.performAttack();
        }
      } else if (e.button === 2 && this.currentWeaponSlot !== 3) {
        if (this.settings.adsMode === 'toggle') {
          this.adsToggleActive = !this.adsToggleActive;
          this.isAiming = this.adsToggleActive;
        } else {
          this.isAiming = true;
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        if (this.settings.adsMode === 'hold') this.isAiming = false;
      }
      if (e.button === 0) this.isShooting = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.controls.isLocked && !this.isPaused) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  updateBots(time: number, delta: number, ignorePlayer: boolean) {
    const pObj = this.camera;

    for (let i = this.enemiesArray.length - 1; i >= 0; i--) {
      const bot = this.enemiesArray[i];
      if (!bot) continue;
      const bp = bot.group.position;

      const isAlly = bot.team === this.playerTeam && this.currentGameMode !== 'ffa';
      const level = Math.min(10, Math.max(1, bot.smartness || (isAlly ? this.allyBotSmartness : this.enemyBotSmartness)));
      bot.speed = 3.6 + level * 0.42;

      // Retargeting with delay scaled by smartness (Level 1: slow reaction, Level 10: instant target lock)
      if (time > bot.retargetTime) {
        const retargetDelay = Math.max(220, Math.round(2500 - (level - 1) * 230)) + Math.random() * 250;
        bot.retargetTime = time + retargetDelay;
        let best: THREE.Vector3 | null = null;
        let bestD = Infinity;
        let bestBotId: string | undefined = undefined;

        if (this.currentGameMode === 'dom' && this.domPoints.length > 0) {
          // In Domination, bots prioritize capture points or nearby opposing players
          if (!ignorePlayer && pObj && this.playerTeam !== bot.team) {
            const d = bp.distanceTo(pObj.position);
            if (d < 30) {
              best = pObj.position;
              bestD = d;
            }
          }
          for (let j = 0; j < this.enemiesArray.length; j++) {
            const other = this.enemiesArray[j];
            if (other === bot || other.team === bot.team) continue;
            const d = bp.distanceTo(other.group.position);
            if (d < 28 && d < bestD) {
              bestD = d;
              best = other.group.position;
              bestBotId = other.id;
            }
          }
          if (!best) {
            let ptsToTake = this.domPoints.filter((pt) => pt.owner !== bot.team);
            if (ptsToTake.length === 0) ptsToTake = this.domPoints;
            const chosen = ptsToTake[Math.floor(Math.random() * ptsToTake.length)];
            best = new THREE.Vector3(chosen.x + (Math.random() - 0.5) * 6, 0, chosen.z + (Math.random() - 0.5) * 6);
          }
        } else if (this.currentGameMode === 'ffa' || bot.team === 'hostile') {
          // FFA / Hostile bots target player or nearest other bot
          if (!ignorePlayer && pObj) {
            const d = bp.distanceTo(pObj.position);
            if (d < 140) {
              best = pObj.position;
              bestD = d;
            }
          }
          for (let j = 0; j < this.enemiesArray.length; j++) {
            const other = this.enemiesArray[j];
            if (other === bot) continue;
            const d = bp.distanceTo(other.group.position);
            if (d < bestD) {
              bestD = d;
              best = other.group.position;
              bestBotId = other.id;
            }
          }
        } else {
          // Team mode (TDM / DOM): target opposing team bots or player
          for (let j = 0; j < this.enemiesArray.length; j++) {
            const other = this.enemiesArray[j];
            if (other === bot || other.team === bot.team) continue;
            const d = bp.distanceTo(other.group.position);
            if (d < bestD) {
              bestD = d;
              best = other.group.position;
              bestBotId = other.id;
            }
          }
          if (!ignorePlayer && pObj && this.playerTeam !== bot.team) {
            const d = bp.distanceTo(pObj.position);
            if (d < bestD) {
              best = pObj.position;
              bestBotId = undefined;
            }
          }
        }
        bot.target = best;
        bot.targetBotId = bestBotId;
      }

      const target = bot.target;
      if (!target) continue;

      const dir = new THREE.Vector3().subVectors(target, bp);
      dir.y = 0;
      const dist = dir.length();
      let moving = false;

      // Higher smartness bots tactically strafe sideways when close to targets to dodge fire
      if (dist > 3.5 && dist < 140) {
        dir.normalize();
        if (dist < 40 && level >= 3) {
          const perpX = -dir.z;
          const perpZ = dir.x;
          const strafeAmt = Math.sin((time / 200) + bot.walkPhase) * (level >= 7 ? 0.6 : 0.35);
          dir.x += perpX * strafeAmt;
          dir.z += perpZ * strafeAmt;
          dir.normalize();
        }

        const step = bot.speed * delta;
        const nextX = bp.x + dir.x * step;
        const nextZ = bp.z + dir.z * step;

        const testBox = new THREE.Box3(
          new THREE.Vector3(nextX - 0.6, 0.1, nextZ - 0.6),
          new THREE.Vector3(nextX + 0.6, 2.0, nextZ + 0.6)
        );
        let blocked = false;
        for (let c = 0; c < this.collisionBoxes.length; c++) {
          if (this.collisionBoxes[c].intersectsBox(testBox)) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          bp.x = nextX;
          bp.z = nextZ;
          moving = true;
        }
      }

      bot.group.lookAt(new THREE.Vector3(target.x, bp.y, target.z));
      if (moving) bot.walkPhase += delta * (7.5 + level * 0.4);
      else bot.walkPhase += delta * 1.6;

      const swing = moving ? 0.7 : 0.06;
      bot.parts.legL.rotation.x = Math.sin(bot.walkPhase) * swing;
      bot.parts.legR.rotation.x = -Math.sin(bot.walkPhase) * swing;
      bot.parts.armL.rotation.x = -Math.sin(bot.walkPhase) * swing * 0.6;
      bot.parts.armR.rotation.x = Math.sin(bot.walkPhase) * swing * 0.6;
      bot.group.position.y = moving ? Math.abs(Math.sin(bot.walkPhase)) * 0.05 : 0;

      // Attack: range, fire cooldown, accuracy, and damage all scale with bot smartness (1-10)
      const maxAttackRange = 22 + level * 3.2; // 25m up to 54m
      const attackCooldown = Math.max(380, Math.round(2200 - (level - 1) * 190)) + Math.random() * 240;

      if (dist < maxAttackRange && time - bot.lastAttack > attackCooldown) {
        const isPlayer = pObj && target === pObj.position;
        bot.lastAttack = time;
        const muzzle = bp.clone().add(new THREE.Vector3(0, 1.6, 0));

        // Accuracy: level 1 has 32% hit chance; level 10 has 98% hit chance
        const hitChance = Math.min(0.98, 0.32 + (level - 1) * 0.07);
        const rollHit = Math.random() < hitChance;
        const aimOffset = rollHit
          ? new THREE.Vector3(0, isPlayer ? 1.2 : 1.5, 0)
          : new THREE.Vector3((Math.random() - 0.5) * 4.2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4.2);
        const aim = target.clone().add(aimOffset);

        const bulletColor = bot.team === 'blue' ? 0x66ddff : 0xff5577;
        this.spawnTracer(muzzle, aim, bulletColor);
        this.spawnImpact(aim, null, bulletColor, rollHit ? 4 : 2);

        // Damage scales with level (5-8 HP at level 1 up to 25-30 HP at level 10)
        const dmg = Math.round(5 + level * 2.2 + Math.random() * 3);

        if (isPlayer && rollHit && !this.isPaused) {
          this.takeDamage(dmg);
        } else if (!isPlayer && rollHit && bot.targetBotId) {
          // Bot vs Bot damage: find target bot and apply damage!
          const targetBotIdx = this.enemiesArray.findIndex((e) => e.id === bot.targetBotId);
          if (targetBotIdx >= 0) {
            const targetBot = this.enemiesArray[targetBotIdx];
            targetBot.hp -= dmg;
            if (targetBot.hp <= 0) {
              bot.kills++;
              bot.score += 100;
              targetBot.deaths++;
              this.spawnImpact(targetBot.group.position.clone().setY(1.2), null, targetBot.team === 'blue' ? 0x00d4ff : 0xff2a6d, 18);
              this.scene.remove(targetBot.group);
              this.enemiesArray.splice(targetBotIdx, 1);
              this.addKillFeedEntry(bot.name, targetBot.name, bot.team === 'blue' ? '#00d4ff' : '#ff2a6d');

              if (this.currentGameMode === 'tdm') {
                if (bot.team === 'blue') this.teamScoreBlue += 10;
                else if (bot.team === 'red') this.teamScoreRed += 10;
                this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);
                this.checkMatchEnd();
              }
              const respawnTeam = targetBot.team;
              setTimeout(() => this.spawnBot(respawnTeam), 3500);
            }
          }
        }
      }
    }
  }

  updateEffects(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.vel.y -= (p.gravity || 0) * delta;
      p.vel.multiplyScalar(Math.max(0, 1 - (p.drag || 0) * delta));
      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.scale.setScalar((p.scale || 1) * (0.35 + t * 0.75));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t * t;
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= delta;
      if (tr.life <= 0) {
        this.scene.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        (tr.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
        continue;
      }
      (tr.mesh.material as THREE.MeshBasicMaterial).opacity = (tr.life / tr.maxLife) * 0.85;
      tr.mesh.scale.x = tr.mesh.scale.z = 0.4 + (tr.life / tr.maxLife) * 0.9;
    }

    // Animate edge barrier grid texture
    if (this.barrierGridTexture) {
      this.barrierGridTexture.offset.y += delta * 0.12;
    }

    // Check player distance to map boundary & update dynamic edge warning
    const cfg = MAP_CONFIGS[this.currentMapKey] || MAP_CONFIGS['neoncity'];
    const half = cfg.size / 2 - 1.5;
    const pPos = this.camera.position;

    const distToNorth = Math.abs(-half - pPos.z);
    const distToSouth = Math.abs(half - pPos.z);
    const distToEast = Math.abs(half - pPos.x);
    const distToWest = Math.abs(-half - pPos.x);

    const distToEdge = Math.min(distToNorth, distToSouth, distToEast, distToWest);
    const isNearEdge = distToEdge < 16;
    this.onEdgeWarning?.(isNearEdge, Math.max(0, distToEdge));

    // Dynamic barrier glow brightness based on proximity
    const targetAlpha = isNearEdge ? Math.min(0.85, 0.14 + (16 - distToEdge) * 0.055) : 0.08;
    for (const b of this.barrierMeshes) {
      const mat = b.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetAlpha - mat.opacity) * Math.min(1, 10 * delta);
    }

    // Place dynamic hologram sign facing the player at the nearest boundary
    if (this.dynamicEdgeHologram) {
      if (isNearEdge) {
        this.dynamicEdgeHologram.visible = true;
        let closestX = pPos.x;
        let closestZ = pPos.z;
        let targetRotY = 0;

        if (distToNorth === distToEdge) {
          closestZ = -half + 2.2;
          closestX = THREE.MathUtils.clamp(pPos.x, -half + 25, half - 25);
          targetRotY = 0;
        } else if (distToSouth === distToEdge) {
          closestZ = half - 2.2;
          closestX = THREE.MathUtils.clamp(pPos.x, -half + 25, half - 25);
          targetRotY = Math.PI;
        } else if (distToEast === distToEdge) {
          closestX = half - 2.2;
          closestZ = THREE.MathUtils.clamp(pPos.z, -half + 25, half - 25);
          targetRotY = -Math.PI / 2;
        } else {
          closestX = -half + 2.2;
          closestZ = THREE.MathUtils.clamp(pPos.z, -half + 25, half - 25);
          targetRotY = Math.PI / 2;
        }

        this.dynamicEdgeHologram.position.set(closestX, 4.2 + Math.sin(performance.now() * 0.003) * 0.35, closestZ);
        this.dynamicEdgeHologram.rotation.y = targetRotY;

        if (distToEdge < 4.5) {
          soundManager.playEdgeBarrier();
        }
      } else {
        this.dynamicEdgeHologram.visible = false;
      }
    }
  }

  animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const time = performance.now();
    const delta = Math.min((time - this.prevTime) / 1000, 0.1);
    this.prevTime = time;

    // FPS Counter
    this.frameCount++;
    if (time - this.fpsLastTime > 500) {
      const fps = Math.round((this.frameCount * 1000) / (time - this.fpsLastTime));
      this.frameCount = 0;
      this.fpsLastTime = time;
      this.onFpsUpdate?.(fps);
    }

    // Keep skybox & stars centered around camera
    if (this.skyMesh) this.skyMesh.position.copy(this.camera.position);
    if (this.starField) this.starField.position.copy(this.camera.position);

    // If Paused: keep world slightly active (bots fight each other), render frame
    if (this.isPaused) {
      this.updateBots(time, delta, true);
      this.updateGrenades(delta);
      this.updateEffects(delta);
      this.renderFrame();
      return;
    }

    if (this.controls && this.controls.isLocked && this.gameActive) {
      // Match Timer Countdown Tick
      if (this.matchTimerActive && !this.matchEnded) {
        this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - delta);
        const curSec = Math.ceil(this.matchTimeRemaining);
        if (curSec !== this.lastReportedSec) {
          this.lastReportedSec = curSec;
          this.onTimeRemainingUpdate?.(curSec, this.matchDurationMinutes * 60);
        }
        if (this.matchTimeRemaining <= 0) {
          this.finishMatch();
        }
      }

      const pObj = this.camera;
      const curSpeed = Math.sqrt(this.playerVelocity.x ** 2 + this.playerVelocity.z ** 2);
      const curWeapon = this.getWeapon(this.currentWeaponSlot);

      if (this.spawnShieldTime > 0) {
        this.spawnShieldTime = Math.max(0, this.spawnShieldTime - delta);
        this.onShieldChange?.(this.spawnShieldTime);
      }

      if (this.isShooting && curWeapon.auto && this.currentWeaponSlot !== 3 && !this.isDead) {
        this.performAttack();
      }

      if (this.isReloading) {
        this.reloadProgress += delta;
        if (this.reloadProgress >= this.reloadDuration) {
          this.finishReload();
        }
      }

      if (!this.isDead) {
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        const camDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, euler.y, 0)).normalize();
        const camRight = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, euler.y, 0)).normalize();
        const moveDir = new THREE.Vector3();

        if (this.moveF) moveDir.add(camDir);
        if (this.moveB) moveDir.sub(camDir);
        if (this.moveR) moveDir.add(camRight);
        if (this.moveL) moveDir.sub(camRight);
        if (moveDir.lengthSq() > 0) moveDir.normalize();

        // Drag & Friction
        if (this.onGround) {
          const drop = curSpeed * (this.isSliding ? 1.0 : 8.0) * delta;
          const mult = Math.max(curSpeed - drop, 0) / (curSpeed || 1);
          this.playerVelocity.x *= mult;
          this.playerVelocity.z *= mult;
        }
        this.playerVelocity.y -= 35.0 * delta;

        const crouchMult = this.isCrouching && !this.isSliding ? 0.55 : 1.0;
        const speedMult = (curWeapon.moveSpeedMult || 1) * crouchMult;

        if (moveDir.lengthSq() > 0) {
          if (curSpeed > 0.1) {
            const curDir = new THREE.Vector3(this.playerVelocity.x, 0, this.playerVelocity.z).normalize();
            const steer = this.onGround ? (this.isSliding ? 10.0 : 22.0) : 7.5;
            curDir.lerp(moveDir, Math.min(1, steer * delta));
            if (curDir.lengthSq() < 0.001) curDir.copy(moveDir);
            curDir.normalize();
            this.playerVelocity.x = curDir.x * curSpeed;
            this.playerVelocity.z = curDir.z * curSpeed;
          }
          const accel = this.onGround ? (this.isSliding ? 32.0 : 118.0) : 55.0;
          const maxS = (this.onGround ? (this.isSliding ? 31.0 : 19.0) : 21.0) * speedMult;
          const spInInp = this.playerVelocity.x * moveDir.x + this.playerVelocity.z * moveDir.z;
          let add = accel * delta;
          if (spInInp + add > maxS) add = Math.max(0, maxS - spInInp);
          this.playerVelocity.x += moveDir.x * add;
          this.playerVelocity.z += moveDir.z * add;
        }

        if (this.slideBoost && this.onGround) {
          const slideDir =
            moveDir.lengthSq() > 0
              ? moveDir.clone()
              : new THREE.Vector3(this.playerVelocity.x, 0, this.playerVelocity.z).normalize();
          if (slideDir.lengthSq() > 0) this.playerVelocity.addScaledVector(slideDir, 21);
          this.slideBoost = false;
        }
        if (this.isSliding && this.onGround && curSpeed < 4.0) {
          this.isSliding = false;
          if (this.shiftHeld) {
            this.isCrouching = true;
          }
        }

        // Stepped collision resolution for smooth sliding along walls
        const moveDist = Math.max(Math.abs(this.playerVelocity.x), Math.abs(this.playerVelocity.z)) * delta;
        const steps = Math.max(1, Math.ceil(moveDist / 0.32));
        const stepDelta = delta / steps;

        for (let s = 0; s < steps; s++) {
          const oldX = pObj.position.x;
          pObj.position.x += this.playerVelocity.x * stepDelta;
          if (this.checkCollision(pObj.position)) {
            pObj.position.x = oldX;
            this.playerVelocity.x = 0;
          }

          const oldZ = pObj.position.z;
          pObj.position.z += this.playerVelocity.z * stepDelta;
          if (this.checkCollision(pObj.position)) {
            pObj.position.z = oldZ;
            this.playerVelocity.z = 0;
          }
        }

        const mapCfg = MAP_CONFIGS[this.currentMapKey] || MAP_CONFIGS['neoncity'];
        const halfBounds = mapCfg.size / 2 - 1.2;
        if (Math.abs(pObj.position.x) > halfBounds) {
          pObj.position.x = Math.sign(pObj.position.x) * halfBounds;
          this.playerVelocity.x = 0;
        }
        if (Math.abs(pObj.position.z) > halfBounds) {
          pObj.position.z = Math.sign(pObj.position.z) * halfBounds;
          this.playerVelocity.z = 0;
        }

        const oldY = pObj.position.y;
        pObj.position.y += this.playerVelocity.y * delta;
        const targetHeight = this.isSliding
          ? this.SLIDING_HEIGHT
          : this.isCrouching
          ? this.CROUCHING_HEIGHT
          : this.STANDING_HEIGHT;
        this.currentHeight += (targetHeight - this.currentHeight) * Math.min(1, 18 * delta);

        // Ground raycast
        this.raycaster.set(
          new THREE.Vector3(pObj.position.x, Math.max(oldY, pObj.position.y), pObj.position.z),
          new THREE.Vector3(0, -1, 0)
        );
        this.raycaster.far = 40;
        const floorHits = this.raycaster.intersectObjects(this.mapObjects, false);
        if (
          floorHits.length > 0 &&
          floorHits[0].distance <= this.currentHeight + Math.max(0, oldY - pObj.position.y) + 0.15 &&
          this.playerVelocity.y <= 0
        ) {
          this.onGround = true;
          this.canJump = true;
          this.playerVelocity.y = 0;
          pObj.position.y = floorHits[0].point.y + this.currentHeight;
        } else {
          this.onGround = false;
        }
        this.raycaster.far = Infinity;

        // Fallen out of world safety check
        if (pObj.position.y < -30) {
          this.resetPlayer();
          this.takeDamage(100);
        }
      }

      this.updateBots(time, delta, false);

      // Multiplayer sync & remote player animation
      if (this.isOnline && this.mpClient) {
        this.mpClient.update(delta);
        if (time - this.lastNetworkSend > 50) {
          this.lastNetworkSend = time;
          const rot = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
          this.mpClient.sendState(
            pObj.position.x,
            pObj.position.y,
            pObj.position.z,
            rot.y,
            rot.x,
            this.currentWeaponSlot,
            this.currentWeaponClass,
            this.playerHP,
            this.isShooting,
            curSpeed > 0.5 ? time / 150 : 0
          );
        }
      }

      // Weapon viewmodel & ADS animation
      const lerp15 = Math.min(1, 15 * delta);
      const lerp10 = Math.min(1, 10 * delta);
      const w = curWeapon;
      const scopedSniper = this.isAiming && w.hasScope && !this.isReloading;
      const aimLineActive = this.isAiming && !w.hasScope && this.currentWeaponSlot !== 3 && !this.isReloading;

      this.scopeAmount += ((scopedSniper ? 1 : 0) - this.scopeAmount) * Math.min(1, 12 * delta);
      this.aimLineAmount += ((aimLineActive ? 1 : 0) - this.aimLineAmount) * Math.min(1, 14 * delta);

      this.onScopeChange?.(this.scopeAmount, this.aimLineAmount);
      this.gunGroup.visible = this.scopeAmount < 0.75;

      const targetSensMod = scopedSniper ? w.adsSensMult : aimLineActive ? w.adsSensMult : 1;
      this.scopeSensMod += (targetSensMod - this.scopeSensMod) * Math.min(1, 10 * delta);
      this.controls.pointerSpeed = this.settings.sens * this.scopeSensMod;

      let targetFov: number;
      if (scopedSniper) targetFov = this.settings.scopeZoom;
      else if (aimLineActive) targetFov = w.adsFov;
      else targetFov = this.settings.fov;

      this.camera.fov += (targetFov - this.camera.fov) * lerp15;
      this.camera.updateProjectionMatrix();

      let targetBasePos: THREE.Vector3;
      if (this.isAiming && this.currentWeaponSlot !== 3) {
        if (w.hasScope) targetBasePos = this.adsPosSniper;
        else if (this.currentWeaponSlot === 1) {
          if (this.currentWeaponClass === 'shotgun') targetBasePos = this.adsPosShotgun;
          else targetBasePos = this.adsPosAr;
        }
        else targetBasePos = this.adsPosPistol;
      } else if (this.currentWeaponSlot === 3) targetBasePos = this.hipPosKnife;
      else if (this.currentWeaponSlot === 1) targetBasePos = this.hipPosAr;
      else targetBasePos = this.hipPosPistol;

      this.currentGunBase.lerp(targetBasePos, lerp15);
      this.recoilOffsetZ += (0 - this.recoilOffsetZ) * lerp15;
      this.recoilRotX += (0 - this.recoilRotX) * lerp10;

      // Mouse sway
      const swayScale = this.settings.swayIntensity;
      const swayMod = (scopedSniper ? 0.12 : aimLineActive ? 0.5 : 1) * swayScale;
      const targetSwayX = THREE.MathUtils.clamp(-this.mouseDX * 0.0007, -0.035, 0.035) * swayMod;
      const targetSwayY = THREE.MathUtils.clamp(-this.mouseDY * 0.0007, -0.035, 0.035) * swayMod;
      this.swayX += (targetSwayX - this.swayX) * Math.min(1, 12 * delta);
      this.swayY += (targetSwayY - this.swayY) * Math.min(1, 12 * delta);
      this.mouseDX *= Math.pow(0.001, delta);
      this.mouseDY *= Math.pow(0.001, delta);

      let bobX = 0,
        bobY = 0,
        bobRoll = 0;
      const bobIntensity = (this.isAiming ? 0.0035 : 0.014) * swayScale;
      if (this.onGround && curSpeed > 2.0 && !this.isSliding) {
        bobY = Math.sin((time / 105) * 1.45) * bobIntensity;
        bobX = Math.cos((time / 105) * 0.72) * bobIntensity;
        bobRoll = Math.cos((time / 105) * 0.72) * 0.007 * swayScale;
      }

      this.gunGroup.position.copy(this.currentGunBase);
      this.gunGroup.position.x += bobX + this.swayX;
      this.gunGroup.position.y += bobY + this.swayY;
      this.gunGroup.position.z += this.recoilOffsetZ;

      // Floor anti-clip: when looking downward or crouching, tuck weapon model so guns never pass through the floor
      const camEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      if (camEuler.x > 0.15) {
        const tuck = Math.sin(camEuler.x - 0.15) * 0.25;
        this.gunGroup.position.z += tuck;
        this.gunGroup.position.y += tuck * 1.2;
      }
      if (this.isCrouching || this.isSliding) {
        this.gunGroup.position.y += 0.05;
      }

      if (this.isReloading) {
        const t = this.reloadProgress / this.reloadDuration;
        const curve = Math.sin(Math.PI * t);
        this.gunGroup.position.y -= curve * 0.22;
        this.gunGroup.rotation.x = -curve * 0.7;
        this.gunGroup.rotation.z = curve * 0.35;
      }

      if (this.currentWeaponSlot === 3 && this.karambitPivot) {
        if (this.isSlashing) {
          this.slashProgress += delta * 6;
          if (this.slashProgress > 1) {
            this.isSlashing = false;
            this.karambitPivot.rotation.set(0, 0, 0);
            if (this.rightHandGroup) this.rightHandGroup.position.z = 0.02;
          } else {
            const swp = Math.sin(this.slashProgress * Math.PI);
            this.karambitPivot.rotation.y = swp * (Math.PI / 1.5);
            this.karambitPivot.rotation.z = -swp * (Math.PI / 4);
            if (this.rightHandGroup) this.rightHandGroup.position.z = 0.02 - swp * 0.1;
            this.gunGroup.position.z -= swp * 0.15;
          }
        } else if (this.isInspecting) {
          this.inspectProgress += delta * 14;
          if (this.inspectProgress < Math.PI * 6) {
            this.karambitPivot.rotation.z = -this.inspectProgress;
            if (this.rightHandGroup) this.rightHandGroup.position.y = -0.07 + Math.sin(this.inspectProgress) * 0.01;
          } else {
            this.isInspecting = false;
            this.karambitPivot.rotation.set(0, 0, 0);
            if (this.rightHandGroup) this.rightHandGroup.position.y = -0.07;
          }
        } else if (!this.isReloading) {
          this.karambitPivot.rotation.y += (0 - this.karambitPivot.rotation.y) * lerp10;
          this.karambitPivot.rotation.x += (this.recoilRotX - this.karambitPivot.rotation.x) * lerp10;
          this.gunGroup.rotation.set(0, 0, bobRoll);
        }
      } else if (this.isThrowing && this.grenadePivot) {
        this.throwProgress += delta * 4.5;
        if (this.throwProgress > 1) {
          this.isThrowing = false;
          this.grenadePivot.rotation.set(0, 0, 0);
        } else {
          const swp = Math.sin(this.throwProgress * Math.PI);
          this.grenadePivot.rotation.x = -swp * 1.3;
          this.gunGroup.position.z -= swp * 0.18;
        }
      } else if (!this.isSlashing) {
        if (this.isInspecting && !this.isReloading && !this.isAiming) {
          this.inspectProgress += delta * 3;
          if (this.inspectProgress < Math.PI * 2) {
            this.gunGroup.rotation.y = Math.sin(this.inspectProgress) * 0.8;
            this.gunGroup.rotation.z = Math.sin(this.inspectProgress * 2) * 0.3;
          } else {
            this.isInspecting = false;
            this.gunGroup.rotation.set(0, 0, 0);
          }
        } else if (!this.isReloading) {
          const idleRotZ = this.isSliding && !this.isAiming ? 0.22 : bobRoll;
          this.gunGroup.rotation.x += (this.recoilRotX - this.gunGroup.rotation.x) * lerp10;
          this.gunGroup.rotation.y += (0 - this.gunGroup.rotation.y) * lerp10;
          this.gunGroup.rotation.z += (idleRotZ - this.gunGroup.rotation.z) * lerp10;
        }
      }

      if (this.muzzleLight && this.muzzleLight.intensity > 0) {
        this.muzzleLight.intensity *= Math.pow(0.0001, delta);
      }
      if (this.muzzleFlashMesh && (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity > 0) {
        (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity *= Math.pow(0.00005, delta);
      }

      // Camera lean & roll
      let targetRoll = 0;
      if (this.onGround && curSpeed > 8) {
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, euler.y, 0));
        const sideDot =
          (this.playerVelocity.x * right.x + this.playerVelocity.z * right.z) / Math.max(curSpeed, 1);
        targetRoll = -sideDot * Math.min(curSpeed / 22, 1) * 0.028;
      }
      if (this.isSliding) targetRoll -= 0.04;
      if (this.camShakeTime > 0) {
        this.camShakeTime -= delta;
        targetRoll += (Math.random() - 0.5) * this.camShakeIntensity * 3;
      }
      if (this.scopeAmount > 0.3) targetRoll *= 1 - this.scopeAmount * 0.7;
      this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1, 8 * delta);

      // Cover / Line-of-sight detection (updates every 100ms for high performance)
      if (time - this.lastCoverCheckTime > 100) {
        this.lastCoverCheckTime = time;
        this.isInCover = !this.isDead && this.isPlayerHiddenFromEnemies();
      }

      if (this.isInCover) {
        this.timeInCover += delta;
      } else {
        this.timeInCover = 0;
      }

      // Hiding from enemy:
      // If the player took damage but ducks behind cover/hides from enemies, cover heal triggers!
      // When crouching in cover, it starts in just 0.3s, otherwise after 0.5s of hiding!
      const minCoverTimeToHeal = this.isCrouching ? 0.3 : 0.5;
      const isHidingFromEnemies = this.isInCover && this.timeInCover >= minCoverTimeToHeal;

      if (!this.isDead && this.playerHP < this.maxHP) {
        if (isHidingFromEnemies && time - this.lastDamageTime > 400) {
          // Hiding from enemies in cover: RAPID COVER HEAL (+38 HP/s)
          this.isCoverHealing = true;
          this.isRegenerating = true;
          this.playerHP = Math.min(this.maxHP, this.playerHP + 38 * delta);
          this.onHealthChange?.(this.playerHP, this.maxHP);
        } else if (time - this.lastDamageTime > 2500) {
          // Normal passive out-of-combat heal (+20 HP/s)
          this.isCoverHealing = false;
          this.isRegenerating = true;
          this.playerHP = Math.min(this.maxHP, this.playerHP + 20 * delta);
          this.onHealthChange?.(this.playerHP, this.maxHP);
        } else {
          this.isCoverHealing = false;
          this.isRegenerating = false;
        }
      } else if (this.playerHP >= this.maxHP) {
        this.isCoverHealing = false;
        this.isRegenerating = false;
      }

      this.onCoverStatusChange?.(this.isInCover, this.isCoverHealing);

      this.updateDomination(delta, time);
      this.updateAirplaneSupport(delta);
      this.updateGrenades(delta);
      this.updateEffects(delta);

      this.camera.rotateZ(this.currentRoll);
      try {
        this.renderFrame();
      } finally {
        this.camera.rotateZ(-this.currentRoll);
      }
    } else {
      this.renderFrame();
    }
  };

  buildAirplaneModel(): THREE.Group {
    const jet = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      metalness: 0.9,
      roughness: 0.25
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x111c30,
      metalness: 0.85,
      roughness: 0.35
    });
    const neonMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff
    });

    // Sleek fighter fuselage
    const body = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 5), bodyMat);
    body.rotation.x = Math.PI / 2;
    jet.add(body);

    // Delta wings
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 4.5), wingMat);
    wingL.position.set(-3.6, 0, 1.2);
    wingL.rotation.y = -0.28;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 4.5), wingMat);
    wingR.position.set(3.6, 0, 1.2);
    wingR.rotation.y = 0.28;
    jet.add(wingL, wingR);

    // Twin vertical stabilizers
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 2.0), wingMat);
    finL.position.set(-1.2, 0.9, 4.2);
    finL.rotation.z = -0.2;
    const finR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 2.0), wingMat);
    finR.position.set(1.2, 0.9, 4.2);
    finR.rotation.z = 0.2;
    jet.add(finL, finR);

    // Glowing cockpit canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 3.2), neonMat);
    canopy.position.set(0, 0.45, -1.8);
    jet.add(canopy);

    // Neon wingtip lights
    const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), neonMat);
    tipL.position.set(-7.0, 0, 2.5);
    const tipR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), neonMat);
    tipR.position.set(7.0, 0, 2.5);
    jet.add(tipL, tipR);

    // Twin cyan afterburner thruster lights
    const thrusterL = new THREE.PointLight(0x00d4ff, 5, 25, 2);
    thrusterL.position.set(-0.7, 0, 6.5);
    const thrusterR = new THREE.PointLight(0x00d4ff, 5, 25, 2);
    thrusterR.position.set(0.7, 0, 6.5);
    jet.add(thrusterL, thrusterR);

    return jet;
  }

  callAirplaneSupport() {
    if (this.airplaneActive && this.airplaneMesh) {
      this.scene.remove(this.airplaneMesh);
    }
    this.airplaneActive = true;
    this.airplaneProgress = 0;
    this.airplaneBombsDropped = 0;

    const jet = this.buildAirplaneModel();
    this.airplaneMesh = jet;

    const pPos = this.camera.position;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    camDir.y = 0;
    if (camDir.lengthSq() < 0.01) camDir.set(0, 0, -1);
    camDir.normalize();

    this.airplaneStartPos.set(pPos.x - camDir.x * 240, 52, pPos.z - camDir.z * 240);
    this.airplaneEndPos.set(pPos.x + camDir.x * 240, 56, pPos.z + camDir.z * 240);

    jet.position.copy(this.airplaneStartPos);
    jet.lookAt(this.airplaneEndPos);
    this.scene.add(jet);

    this.camShakeTime = 0.55;
    this.camShakeIntensity = 0.045;
  }

  updateAirplaneSupport(delta: number) {
    if (!this.airplaneActive || !this.airplaneMesh) return;
    this.airplaneProgress += delta * 0.32;
    const t = Math.min(1, this.airplaneProgress);
    this.airplaneMesh.position.lerpVectors(this.airplaneStartPos, this.airplaneEndPos, t);

    const thresholds = [0.28, 0.44, 0.60, 0.76];
    if (this.airplaneBombsDropped < thresholds.length && t >= thresholds[this.airplaneBombsDropped]) {
      this.airplaneBombsDropped++;
      this.dropAirstrikeBomb(this.airplaneMesh.position.clone());
    }

    if (t >= 1) {
      this.scene.remove(this.airplaneMesh);
      this.airplaneMesh = null;
      this.airplaneActive = false;
    }
  }

  dropAirstrikeBomb(pos: THREE.Vector3) {
    const groundTarget = new THREE.Vector3(
      pos.x + (Math.random() - 0.5) * 16,
      0,
      pos.z + (Math.random() - 0.5) * 16
    );

    this.spawnTracer(pos, groundTarget, 0x38bdf8);

    setTimeout(() => {
      this.spawnImpact(groundTarget, null, 0x00d4ff, 32);
      this.camShakeTime = 0.45;
      this.camShakeIntensity = 0.055;

      const BLAST_RADIUS = 18;
      for (let i = this.enemiesArray.length - 1; i >= 0; i--) {
        const bot = this.enemiesArray[i];
        if (bot.hp <= 0) continue;
        if (bot.team === this.playerTeam && this.currentGameMode !== 'ffa') continue;

        const dist = bot.group.position.distanceTo(groundTarget);
        if (dist <= BLAST_RADIUS) {
          const dmg = Math.round((1 - dist / BLAST_RADIUS) * 150 + 50);
          bot.hp -= dmg;
          this.onHitmarker?.(bot.hp <= 0);
          this.damageCounter++;
          this.onDamageNumber?.({
            id: this.damageCounter,
            amount: dmg,
            crit: true,
            x: THREE.MathUtils.randFloat(-20, 20),
            y: THREE.MathUtils.randFloat(-20, 20)
          });

          if (bot.hp <= 0) {
            this.healPlayer(25, 'AIRSTRIKE');
            this.spawnImpact(bot.group.position.clone().setY(1.2), null, 0xff2a6d, 22);
            this.scene.remove(bot.group);
            this.enemiesArray.splice(i, 1);
            this.score += 100;
            this.addKillFeedEntry('AIRSTRIKE JET', bot.team === 'blue' ? 'BLUE-BOT' : 'RED-BOT', '#38bdf8');
            setTimeout(() => this.spawnBot(bot.team), 3500);
          }
        }
      }
    }, 180);
  }

  launchTabletStrike() {
    if (!this.tabletStrikeReady) return;
    this.tabletStrikeReady = false;
    this.onTabletReadyChange?.(false);

    let target = new THREE.Vector3();
    let bestHostile: THREE.Vector3 | null = null;
    let bestD = Infinity;
    const pPos = this.camera.position;

    for (const b of this.enemiesArray) {
      if (b.hp <= 0 || (b.team === this.playerTeam && this.currentGameMode !== 'ffa')) continue;
      const d = b.group.position.distanceTo(pPos);
      if (d < bestD) {
        bestD = d;
        bestHostile = b.group.position;
      }
    }

    if (bestHostile) {
      target.copy(bestHostile);
    } else {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      target.set(pPos.x + forward.x * 40, 0, pPos.z + forward.z * 40);
    }

    this.addKillFeedEntry('TABLET STRIKE', 'KINETIC MISSILE INBOUND!', '#f59e0b');
    this.camShakeTime = 0.35;
    this.camShakeIntensity = 0.05;

    const skyOrigin = new THREE.Vector3(target.x, 140, target.z);
    this.spawnTracer(skyOrigin, target, 0xffaa00);

    setTimeout(() => {
      this.spawnImpact(target, null, 0xffaa00, 48);
      this.camShakeTime = 0.85;
      this.camShakeIntensity = 0.09;
      this.onFlash?.('flash');

      const STRIKE_RADIUS = 26;
      for (let i = this.enemiesArray.length - 1; i >= 0; i--) {
        const bot = this.enemiesArray[i];
        if (bot.hp <= 0) continue;
        if (bot.team === this.playerTeam && this.currentGameMode !== 'ffa') continue;

        const dist = bot.group.position.distanceTo(target);
        if (dist <= STRIKE_RADIUS) {
          const dmg = Math.round((1 - dist / STRIKE_RADIUS) * 240 + 80);
          bot.hp -= dmg;
          this.onHitmarker?.(bot.hp <= 0);
          this.damageCounter++;
          this.onDamageNumber?.({
            id: this.damageCounter,
            amount: dmg,
            crit: true,
            x: THREE.MathUtils.randFloat(-20, 20),
            y: THREE.MathUtils.randFloat(-20, 20)
          });

          if (bot.hp <= 0) {
            this.healPlayer(35, 'TABLET STRIKE');
            this.spawnImpact(bot.group.position.clone().setY(1.2), null, 0xffaa00, 25);
            this.scene.remove(bot.group);
            this.enemiesArray.splice(i, 1);
            this.score += 150;
            this.addKillFeedEntry('TABLET STRIKE', bot.team === 'blue' ? 'BLUE-BOT' : 'RED-BOT', '#f59e0b');
            setTimeout(() => this.spawnBot(bot.team), 3500);
          }
        }
      }
    }, 320);
  }

  launchTacticalNuke() {
    if (this.nukeActive) return;
    this.nukeActive = true;
    this.nukeCountdown = 5;
    this.onNukeCountdown?.(5);

    this.addKillFeedEntry('TACTICAL NUKE', 'COUNTDOWN INITIATED!', '#ff2a6d');

    const interval = window.setInterval(() => {
      this.nukeCountdown--;
      if (this.nukeCountdown > 0) {
        this.onNukeCountdown?.(this.nukeCountdown);
        this.camShakeTime = 0.3;
        this.camShakeIntensity = 0.045;
      } else {
        clearInterval(interval);
        this.detonateNuke();
      }
    }, 1000);
  }

  detonateNuke() {
    this.onNukeCountdown?.(0);
    this.onFlash?.('flash');
    this.camShakeTime = 2.4;
    this.camShakeIntensity = 0.14;

    for (let i = this.enemiesArray.length - 1; i >= 0; i--) {
      const bot = this.enemiesArray[i];
      if (bot.team === this.playerTeam && this.currentGameMode !== 'ffa') continue;
      this.spawnImpact(bot.group.position.clone().setY(1.2), null, 0xff2a6d, 35);
      this.scene.remove(bot.group);
      this.enemiesArray.splice(i, 1);
      setTimeout(() => this.spawnBot(bot.team), 4000);
    }

    this.playerHP = this.maxHP;
    this.onHealthChange?.(this.maxHP, this.maxHP);
    this.score += 1000;
    this.onScoreChange?.(this.score, this.teamScoreBlue, this.teamScoreRed);
    this.addKillFeedEntry('TACTICAL NUKE', 'MAP OBLITERATED - VICTORY!', '#ff2a6d');

    setTimeout(() => {
      this.nukeActive = false;
      this.onNukeCountdown?.(null);
    }, 2200);
  }

  handlePlayerKill(victimName: string) {
    const now = performance.now();
    this.currentStreak++;

    // Multi-kill window: 4.5s
    if (now - this.lastKillTime < 4500) {
      this.multiKillCount++;
    } else {
      this.multiKillCount = 1;
    }
    this.lastKillTime = now;

    // Check Multi-kill achievements
    if (this.multiKillCount === 2) {
      this.score += 200;
      this.onAchievement?.({
        id: Math.random().toString(),
        type: 'double',
        title: 'DOUBLE KILL!',
        subtitle: '+200 BONUS XP',
        color: '#00d4ff',
        timestamp: Date.now()
      });
      this.addKillFeedEntry('SYSTEM', 'YOU SCORED A DOUBLE KILL!', '#00d4ff');
    } else if (this.multiKillCount === 3) {
      this.score += 350;
      this.onAchievement?.({
        id: Math.random().toString(),
        type: 'triple',
        title: 'TRIPLE KILL!',
        subtitle: 'AIRPLANE SUPPORT INBOUND',
        reward: 'SUPERSONIC JET AIRSTRIKE',
        color: '#38bdf8',
        timestamp: Date.now()
      });
      this.addKillFeedEntry('AIR COMMAND', 'AIRPLANE SUPPORT INBOUND!', '#38bdf8');
      this.callAirplaneSupport();
    } else if (this.multiKillCount === 4) {
      this.score += 500;
      this.tabletStrikeReady = true;
      this.onTabletReadyChange?.(true);
      this.onAchievement?.({
        id: Math.random().toString(),
        type: 'quad',
        title: 'QUAD KILL!',
        subtitle: 'TACTICAL TABLET STRIKE READY',
        reward: 'PRESS 4 OR CLICK TO LAUNCH',
        color: '#f59e0b',
        timestamp: Date.now()
      });
      this.addKillFeedEntry('ORBITAL DEFENSE', 'TACTICAL TABLET STRIKE READY!', '#f59e0b');
    }

    // 10 Back-to-Back Kills -> Tactical Nuke
    if (this.currentStreak === 10) {
      this.score += 1000;
      this.onAchievement?.({
        id: Math.random().toString(),
        type: 'nuke',
        title: '10 KILLSTREAK!',
        subtitle: 'TACTICAL NUKE UNLOCKED',
        reward: 'T-MINUS 5 SECONDS',
        color: '#ff2a6d',
        timestamp: Date.now()
      });
      this.launchTacticalNuke();
    }

    this.checkMatchEnd();
  }

  applyGraphicsPreset(preset: 'low' | 'medium' | 'high' | 'ultra') {
    this.settings.graphicsPreset = preset;
    const dpr = window.devicePixelRatio || 1;

    switch (preset) {
      case 'low':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = false;
        if (this.bloomPass) this.bloomPass.strength = 0;
        if (this.sunLight) this.sunLight.castShadow = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(Math.min(dpr, 1.15));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        if (this.bloomPass) this.bloomPass.strength = 0.35;
        if (this.sunLight) {
          this.sunLight.castShadow = true;
          this.sunLight.shadow.mapSize.set(512, 512);
        }
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(dpr, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.bloomPass) this.bloomPass.strength = 0.75;
        if (this.sunLight) {
          this.sunLight.castShadow = true;
          this.sunLight.shadow.mapSize.set(1024, 1024);
        }
        break;
      case 'ultra':
        this.renderer.setPixelRatio(Math.min(dpr, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.bloomPass) this.bloomPass.strength = 1.1;
        if (this.sunLight) {
          this.sunLight.castShadow = true;
          this.sunLight.shadow.mapSize.set(2048, 2048);
        }
        break;
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (this.fxaaPass) {
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / (window.innerWidth * pr),
        1 / (window.innerHeight * pr)
      );
    }
  }

  addBot(team?: 'blue' | 'red' | 'hostile', broadcast: boolean = true) {
    const assignedTeam = team || (this.currentGameMode === 'ffa' ? 'hostile' : Math.random() < 0.5 ? 'blue' : 'red');
    this.spawnBot(assignedTeam);
    this.settings.botCount = this.enemiesArray.length;
    this.onBotCountChange?.(this.enemiesArray.length);
    if (broadcast && this.isOnline && this.mpClient) {
      this.mpClient.sendBotControl('add', assignedTeam);
    }
  }

  removeBot(broadcast: boolean = true) {
    if (this.enemiesArray.length === 0) return;
    const bot = this.enemiesArray.pop()!;
    this.scene.remove(bot.group);
    this.settings.botCount = this.enemiesArray.length;
    this.onBotCountChange?.(this.enemiesArray.length);
    if (broadcast && this.isOnline && this.mpClient) {
      this.mpClient.sendBotControl('remove');
    }
  }

  clearBots(broadcast: boolean = true) {
    for (const bot of this.enemiesArray) {
      this.scene.remove(bot.group);
    }
    this.enemiesArray = [];
    this.settings.botCount = 0;
    this.onBotCountChange?.(0);
    if (broadcast && this.isOnline && this.mpClient) {
      this.mpClient.sendBotControl('set', undefined, 0);
    }
  }

  setBotCount(count: number, broadcast: boolean = true) {
    const target = Math.max(0, Math.min(24, Math.round(count)));
    while (this.enemiesArray.length < target) {
      this.addBot(undefined, false);
    }
    while (this.enemiesArray.length > target) {
      this.removeBot(false);
    }
    this.settings.botCount = target;
    this.onBotCountChange?.(target);
    if (broadcast && this.isOnline && this.mpClient) {
      this.mpClient.sendBotControl('set', undefined, target);
    }
  }

  renderFrame() {
    if (this.composer) {
      try {
        this.composer.render();
      } catch (err) {
        console.warn('Composer rendering encountered an issue, falling back to direct renderer:', err);
        this.composer = null;
        this.renderer.render(this.scene, this.camera);
      }
    } else if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  applySettings(newSettings: GameSettings) {
    const prevPreset = this.settings.graphicsPreset;
    this.settings = { ...newSettings };
    if (this.camera && !this.isAiming) {
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.controls) {
      this.controls.pointerSpeed = this.settings.sens;
    }
    if (this.bloomPass) {
      this.bloomPass.strength = this.settings.bloom;
    }
    if (this.settings.graphicsPreset && this.settings.graphicsPreset !== prevPreset) {
      this.applyGraphicsPreset(this.settings.graphicsPreset);
    }
    if (this.settings.allyBotSmartness !== undefined || this.settings.enemyBotSmartness !== undefined) {
      this.setBotSmartness(
        this.settings.allyBotSmartness ?? this.allyBotSmartness,
        this.settings.enemyBotSmartness ?? this.enemyBotSmartness
      );
    }
    WEAPON_CLASSES.sniper.adsFov = this.settings.scopeZoom;
  }

  destroy() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.stopMultiplayer();
    this.clearWorld();
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
