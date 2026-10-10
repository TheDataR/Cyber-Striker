import * as THREE from 'three';
import { MapConfig } from './types';

export function makeBuildingTextures(hue: number, cfg: MapConfig): { colorMap: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const W = 256, H = 512;
  const cCol = document.createElement('canvas');
  cCol.width = W;
  cCol.height = H;
  const cEmi = document.createElement('canvas');
  cEmi.width = W;
  cEmi.height = H;

  const gCol = cCol.getContext('2d')!;
  const gEmi = cEmi.getContext('2d')!;

  const base = '#' + cfg.buildingBase.toString(16).padStart(6, '0');
  gCol.fillStyle = base;
  gCol.fillRect(0, 0, W, H);
  gEmi.fillStyle = '#000000';
  gEmi.fillRect(0, 0, W, H);

  // Micro noise
  for (let i = 0; i < 1200; i++) {
    gCol.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    gCol.fillRect(Math.random() * W, Math.random() * H, Math.random() * 16 + 2, Math.random() * 4 + 1);
  }

  // Windows grid
  const cols = 8, rows = 20;
  const cw = W / cols, ch = H / rows;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cw + cw * 0.16;
      const py = y * ch + ch * 0.22;
      const pw = cw * 0.68;
      const ph = ch * 0.52;

      gCol.fillStyle = 'rgba(0,0,0,0.6)';
      gCol.fillRect(px - 1, py - 1, pw + 2, ph + 2);

      if (Math.random() < 0.45) {
        const a = 0.4 + Math.random() * 0.6;
        const col = `hsl(${hue + (Math.random() * 26 - 13)}, 95%, ${60 + Math.random() * 25}%)`;
        gCol.fillStyle = col;
        gCol.globalAlpha = a * 0.6;
        gCol.fillRect(px, py, pw, ph);

        gEmi.fillStyle = col;
        gEmi.globalAlpha = a * 1.2;
        gEmi.fillRect(px, py, pw, ph);

        gCol.globalAlpha = 1;
        gEmi.globalAlpha = 1;
      } else {
        gCol.fillStyle = 'rgba(25, 40, 60, 0.4)';
        gCol.fillRect(px, py, pw, ph);
      }
    }
  }

  // Subtle horizontal accent stripes
  const accentHex = '#' + cfg.accent.toString(16).padStart(6, '0');
  gCol.fillStyle = accentHex;
  gCol.globalAlpha = 0.12;
  for (let y = 0; y < H; y += ch * 2) {
    gCol.fillRect(0, y, W, 2);
  }
  gCol.globalAlpha = 1;

  const tCol = new THREE.CanvasTexture(cCol);
  const tEmi = new THREE.CanvasTexture(cEmi);
  [tCol, tEmi].forEach((t) => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  });

  return { colorMap: tCol, emissiveMap: tEmi };
}

export function makeGroundTexture(cfg: MapConfig): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = cfg.groundBase;
  ctx.fillRect(0, 0, S, S);

  const [nr, ng, nb] = cfg.groundNoise;
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(${nr + (Math.random() * 45 | 0)},${ng + (Math.random() * 60 | 0)},${nb + (Math.random() * 80 | 0)},${Math.random() * 0.09})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, Math.random() * 3, Math.random() * 3);
  }

  const [gr, gg, gb] = cfg.groundGrid;
  ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.6)`;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);

  ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.15)`;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((i * S) / 4, 0);
    ctx.lineTo((i * S) / 4, S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (i * S) / 4);
    ctx.lineTo(S, (i * S) / 4);
    ctx.stroke();
  }

  // Cross center
  ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.35)`;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([8, 18]);
  ctx.beginPath();
  ctx.moveTo(0, S / 2);
  ctx.lineTo(S, S / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(S / 2, 0);
  ctx.lineTo(S / 2, S);
  ctx.stroke();
  ctx.setLineDash([]);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(cfg.size / 12, cfg.size / 12);
  t.anisotropy = 8;
  return t;
}
