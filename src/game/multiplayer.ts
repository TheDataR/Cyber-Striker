import * as THREE from 'three';
import { createArm, buildPrimaryModel, buildPistolModel, buildKnifeModel, buildThirdPersonWeapon } from './weapons';
import { WeaponClassKey } from './types';

export interface RemotePlayer {
  id: string;
  name: string;
  team: 'blue' | 'red';
  group: THREE.Group;
  parts: {
    legL: THREE.Group;
    legR: THREE.Group;
    armL: THREE.Group;
    armR: THREE.Group;
    head: THREE.Mesh;
    torso: THREE.Mesh;
  };
  nameTag: THREE.Sprite;
  targetPos: THREE.Vector3;
  targetRotY: number;
  hp: number;
  maxHp: number;
  wep: number;
  wepClass: WeaponClassKey;
  isShooting: boolean;
  walkPhase: number;
  lastUpdate: number;
}

export class MultiplayerClient {
  ws: WebSocket | null = null;
  localId: string = '';
  room: string = '';
  connected: boolean = false;
  ping: number = 0;
  pingInterval: number | null = null;

  remotePlayers: Map<string, RemotePlayer> = new Map();
  scene: THREE.Scene;

  onPlayerHit?: (targetId: string, dmg: number, crit: boolean) => void;
  onTakeDamage?: (dmg: number, fromName: string) => void;
  onKillFeed?: (killer: string, victim: string, color: string) => void;
  onPingUpdate?: (ping: number) => void;
  onPlayerCountChange?: (count: number) => void;
  onBotControl?: (action: 'add' | 'remove' | 'set', count?: number, team?: string, sender?: string) => void;
  onMatchDurationChange?: (minutes: number) => void;
  onBotSmartnessChange?: (ally: number, enemy: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  connect(
    room: string,
    name: string,
    team: 'blue' | 'red',
    wepClass: WeaponClassKey,
    botCount?: number,
    matchDuration?: number,
    allySmartness?: number,
    enemySmartness?: number,
    gameMode?: string,
    mapKey?: string
  ) {
    this.room = room;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.ws?.send(
          JSON.stringify({
            type: 'join',
            room,
            name,
            team,
            wepClass,
            hp: 150,
            botCount,
            matchDuration,
            allySmartness,
            enemySmartness,
            gameMode,
            mapKey
          })
        );

        // Ping loop
        this.pingInterval = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping', time: performance.now() }));
          }
        }, 2000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          // ignore
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.clearRemotePlayers();
        if (this.pingInterval) clearInterval(this.pingInterval);
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch (err) {
      console.warn('Multiplayer connection failed:', err);
    }
  }

  handleMessage(msg: any) {
    switch (msg.type) {
      case 'welcome':
        this.localId = msg.id;
        if (Array.isArray(msg.players)) {
          msg.players.forEach((p: any) => this.addOrUpdateRemotePlayer(p));
          this.onPlayerCountChange?.(this.remotePlayers.size + 1);
        }
        if (typeof msg.botCount === 'number') {
          this.onBotControl?.('set', msg.botCount);
        }
        if (typeof msg.matchDuration === 'number') {
          this.onMatchDurationChange?.(msg.matchDuration);
        }
        if (typeof msg.allySmartness === 'number' && typeof msg.enemySmartness === 'number') {
          this.onBotSmartnessChange?.(msg.allySmartness, msg.enemySmartness);
        }
        break;

      case 'player_joined':
        if (msg.player && msg.player.id !== this.localId) {
          this.addOrUpdateRemotePlayer(msg.player);
          this.onPlayerCountChange?.(this.remotePlayers.size + 1);
        }
        break;

      case 'player_state':
        if (msg.id !== this.localId) {
          const rp = this.remotePlayers.get(msg.id);
          if (rp) {
            rp.targetPos.set(msg.x, msg.y - 1.6, msg.z);
            rp.targetRotY = msg.rotY || 0;
            rp.wep = msg.wep || 1;
            rp.wepClass = msg.wepClass || 'ar';
            rp.hp = msg.hp || 150;
            rp.walkPhase = msg.walkPhase || 0;
            rp.lastUpdate = Date.now();
          } else {
            this.addOrUpdateRemotePlayer(msg);
          }
        }
        break;

      case 'player_shoot':
        if (msg.id !== this.localId) {
          this.handleRemoteShoot(msg);
        }
        break;

      case 'take_damage':
        this.onTakeDamage?.(msg.dmg, msg.fromName);
        break;

      case 'player_killed':
        this.onKillFeed?.(msg.killer, msg.victim, msg.color || '#00d4ff');
        break;

      case 'bot_control':
        this.onBotControl?.(msg.action, msg.count, msg.team, msg.sender);
        break;

      case 'player_left':
        this.removeRemotePlayer(msg.id);
        this.onPlayerCountChange?.(this.remotePlayers.size + 1);
        break;

      case 'pong':
        this.ping = Math.round(performance.now() - msg.time);
        this.onPingUpdate?.(this.ping);
        break;
    }
  }

  createNameTag(name: string, team: 'blue' | 'red'): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(6, 12, 22, 0.75)';
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();

    ctx.strokeStyle = team === 'blue' ? 'rgba(0, 212, 255, 0.8)' : 'rgba(255, 42, 109, 0.8)';
    ctx.lineWidth = 3;
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.stroke();

    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = team === 'blue' ? '#00d4ff' : '#ff2a6d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.45, 1);
    sprite.position.y = 2.9;
    return sprite;
  }

  createRemoteCharacter(team: 'blue' | 'red') {
    const color = team === 'blue' ? 0x00d4ff : 0xff2a6d;
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

    // Equip team-specific weapon: Red team carries AK-47 / Vector, Blue team carries M4 / UMP
    const heldWeapon = buildThirdPersonWeapon('ar', team);
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
    // Scaled to 1.15 to match the enlarged bots
    g.scale.setScalar(1.15);
    return { group: g, armL, armR, legL, legR, head, torso };
  }

  addOrUpdateRemotePlayer(data: any) {
    if (!data.id || data.id === this.localId) return;

    if (this.remotePlayers.has(data.id)) {
      const rp = this.remotePlayers.get(data.id)!;
      rp.targetPos.set(data.x, data.y - 1.6, data.z);
      rp.targetRotY = data.rotY || 0;
      rp.hp = data.hp || 150;
      rp.wep = data.wep || 1;
      rp.wepClass = data.wepClass || 'ar';
      rp.walkPhase = data.walkPhase || 0;
      rp.lastUpdate = Date.now();
      return;
    }

    const team = data.team === 'red' ? 'red' : 'blue';
    const model = this.createRemoteCharacter(team);
    const nameTag = this.createNameTag(data.name || 'Operative', team);
    model.group.add(nameTag);

    model.group.position.set(data.x || 0, (data.y || 1.6) - 1.6, data.z || 0);
    this.scene.add(model.group);

    const remotePlayer: RemotePlayer = {
      id: data.id,
      name: data.name || 'Operative',
      team,
      group: model.group,
      parts: model,
      nameTag,
      targetPos: new THREE.Vector3(data.x || 0, (data.y || 1.6) - 1.6, data.z || 0),
      targetRotY: data.rotY || 0,
      hp: data.hp || 150,
      maxHp: 150,
      wep: data.wep || 1,
      wepClass: data.wepClass || 'ar',
      isShooting: false,
      walkPhase: 0,
      lastUpdate: Date.now()
    };

    this.remotePlayers.set(data.id, remotePlayer);
  }

  removeRemotePlayer(id: string) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      this.scene.remove(rp.group);
      this.remotePlayers.delete(id);
    }
  }

  clearRemotePlayers() {
    this.remotePlayers.forEach((rp) => this.scene.remove(rp.group));
    this.remotePlayers.clear();
  }

  sendState(x: number, y: number, z: number, rotY: number, rotX: number, wep: number, wepClass: string, hp: number, isShooting: boolean, walkPhase: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'state',
          x,
          y,
          z,
          rotY,
          rotX,
          wep,
          wepClass,
          hp,
          isShooting,
          walkPhase
        })
      );
    }
  }

  sendShoot(from: THREE.Vector3, to: THREE.Vector3, slot: number, weaponClass: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'shoot',
          from: { x: from.x, y: from.y, z: from.z },
          to: { x: to.x, y: to.y, z: to.z },
          slot,
          weaponClass
        })
      );
    }
  }

  sendHit(targetId: string, dmg: number, crit: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'hit',
          targetId,
          dmg,
          crit
        })
      );
    }
  }

  sendKill(killer: string, victim: string, color: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'kill',
          killer,
          victim,
          color
        })
      );
    }
  }

  sendBotControl(action: 'add' | 'remove' | 'set', team?: string, count?: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'bot_control',
          action,
          team,
          count
        })
      );
    }
  }

  handleRemoteShoot(msg: any) {
    const rp = this.remotePlayers.get(msg.id);
    if (!rp) return;

    const from = new THREE.Vector3(msg.from.x, msg.from.y, msg.from.z);
    const to = new THREE.Vector3(msg.to.x, msg.to.y, msg.to.z);
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.2) return;

    // Spawn tracer
    const color = rp.team === 'blue' ? 0x9fe8ff : 0xff5577;
    const geo = new THREE.CylinderGeometry(0.02, 0.02, len, 5, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(mesh);

    setTimeout(() => {
      this.scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    }, 90);
  }

  update(delta: number) {
    this.remotePlayers.forEach((rp) => {
      // Smooth interpolation toward target position
      rp.group.position.lerp(rp.targetPos, Math.min(1, 14 * delta));
      rp.group.rotation.y = THREE.MathUtils.lerp(rp.group.rotation.y, rp.targetRotY, Math.min(1, 14 * delta));

      // Walk animation
      const swing = 0.55;
      rp.parts.legL.rotation.x = Math.sin(rp.walkPhase) * swing;
      rp.parts.legR.rotation.x = -Math.sin(rp.walkPhase) * swing;
      rp.parts.armL.rotation.x = -Math.sin(rp.walkPhase) * swing * 0.6;
      rp.parts.armR.rotation.x = Math.sin(rp.walkPhase) * swing * 0.6;
    });
  }

  destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.clearRemotePlayers();
  }
}
