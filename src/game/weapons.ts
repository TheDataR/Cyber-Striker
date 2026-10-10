import * as THREE from 'three';
import { WeaponClassKey } from './types';

export function createArm(isLeft: boolean): THREE.Group {
  const arm = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x12161f, roughness: 0.85, metalness: 0.25 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.7, metalness: 0.3 });
  
  const slv = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.032, 0.4, 12), mat);
  slv.rotation.x = Math.PI / 2;
  slv.position.set(isLeft ? -0.05 : 0.05, 0, 0.15);

  const hnd = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.065), skin);
  hnd.position.set(isLeft ? -0.05 : 0.05, 0, -0.07);

  arm.add(slv, hnd);
  arm.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  return arm;
}

export function getSkinMaterials(skinId?: string, team: 'blue' | 'red' = 'blue') {
  let darkCol = 0x161c28;
  let midCol = 0x0d1119;
  let accentCol = team === 'red' ? 0xff2a6d : 0x00d4ff;
  let emissiveCol = team === 'red' ? 0xff1144 : 0x00a5cc;
  let emissiveInt = 0.95;
  let metalness = 0.88;
  let roughness = 0.28;

  if (skinId === 'weapon_hyperion_gold') {
    darkCol = 0x3d2b07;
    midCol = 0x1f1604;
    accentCol = 0xffd700;
    emissiveCol = 0xff9900;
    emissiveInt = 1.4;
    metalness = 0.98;
    roughness = 0.15;
  } else if (skinId === 'weapon_void_crimson') {
    darkCol = 0x150508;
    midCol = 0x24080e;
    accentCol = 0xff1144;
    emissiveCol = 0xff0033;
    emissiveInt = 1.6;
    metalness = 0.85;
    roughness = 0.25;
  } else if (skinId === 'weapon_plasma_emerald') {
    darkCol = 0x06140b;
    midCol = 0x0c2415;
    accentCol = 0x00ff88;
    emissiveCol = 0x00cc66;
    emissiveInt = 1.6;
    metalness = 0.85;
    roughness = 0.22;
  } else if (skinId === 'weapon_glitch_holo') {
    darkCol = 0x160a22;
    midCol = 0x250e3b;
    accentCol = 0xe056fd;
    emissiveCol = 0x00d4ff;
    emissiveInt = 1.5;
    metalness = 0.92;
    roughness = 0.18;
  } else if (skinId === 'weapon_glacial_ice') {
    darkCol = 0x0a1626;
    midCol = 0x13273e;
    accentCol = 0x70a1ff;
    emissiveCol = 0x90c2ff;
    emissiveInt = 1.4;
    metalness = 0.9;
    roughness = 0.15;
  } else if (skinId === 'weapon_dark_matter') {
    darkCol = 0x070310;
    midCol = 0x130825;
    accentCol = 0x8c52ff;
    emissiveCol = 0x6c25ff;
    emissiveInt = 2.0;
    metalness = 0.96;
    roughness = 0.12;
  }

  const dark = new THREE.MeshStandardMaterial({ color: darkCol, metalness, roughness });
  const mid = new THREE.MeshStandardMaterial({ color: midCol, metalness: metalness * 0.85, roughness: roughness * 1.5 });
  const accent = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: emissiveCol,
    emissiveIntensity: emissiveInt,
    metalness: 0.92,
    roughness: 0.18
  });

  return { dark, mid, accent, accentCol };
}

// ==========================================
// BLUE TEAM AR: M4 / M4A1 CARBINE
// ==========================================
function buildM4Model(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  // Upper & Lower Receiver
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.092, 0.38), dark);
  upper.position.set(0, 0.02, -0.16);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.098, 0.28), mid);
  lower.position.set(0, -0.045, -0.12);

  const magwell = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.088, 0.13), dark);
  magwell.position.set(0, -0.08, -0.21);

  // Ejection Port & Forward Assist Knob
  const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.032, 0.095), mid);
  ejectPort.position.set(0.044, 0.035, -0.16);

  const forwardAssist = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.038, 10), dark);
  forwardAssist.rotation.z = Math.PI / 4;
  forwardAssist.position.set(0.046, 0.035, -0.07);

  const chargingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.045), dark);
  chargingHandle.position.set(0, 0.072, 0.02);

  // Buffer Tube & Crane Stock
  const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 12), dark);
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.02, 0.13);

  const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.135, 0.19), mid);
  stockBody.position.set(0, -0.01, 0.22);

  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.145, 0.025), dark);
  stockPad.position.set(0, -0.01, 0.315);

  const stockLatch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.032, 0.09), accent);
  stockLatch.position.set(0, -0.075, 0.2);

  // A2 Pistol Grip & Trigger
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.16, 0.075), dark);
  grip.rotation.x = -0.32;
  grip.position.set(0, -0.12, 0.01);

  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.07), mid);
  triggerGuard.position.set(0, -0.08, -0.07);

  // STANAG 30-Round 5.56mm Magazine (curved aluminum)
  const magUpper = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.14, 0.09), mid);
  magUpper.rotation.x = 0.12;
  magUpper.position.set(0, -0.16, -0.2);

  const magLower = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.088), mid);
  magLower.rotation.x = 0.26;
  magLower.position.set(0, -0.26, -0.18);

  const magFloor = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.016, 0.092), dark);
  magFloor.rotation.x = 0.26;
  magFloor.position.set(0, -0.32, -0.165);

  // Quad-Rail Handguard & Picatinny Rail
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.082, 0.36), mid);
  handguard.position.set(0, 0.02, -0.48);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.016, 0.62), dark);
  topRail.position.set(0, 0.072, -0.28);

  const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.34), accent);
  railGlow.position.set(0, 0.055, -0.48);

  // Barrel, A2 Triangle Front Sight Post & Birdcage Muzzle
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.64, 12), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.64);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.055), dark);
  frontSight.position.set(0, 0.082, -0.68);

  const sightPin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 8), accent);
  sightPin.position.set(0, 0.125, -0.68);

  const birdcage = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.065, 12), dark);
  birdcage.rotation.x = Math.PI / 2;
  birdcage.position.set(0, 0.02, -0.96);

  // EOTech Holographic Optic
  const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.035, 0.12), dark);
  opticBase.position.set(0, 0.098, -0.16);

  const opticHood = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.055, 0.09), mid);
  opticHood.position.set(0, 0.13, -0.16);

  const reticleGlass = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.042, 0.008), accent);
  reticleGlass.position.set(0, 0.13, -0.16);

  // Arms
  rightArm.position.set(-0.02, -0.11, 0.11);
  leftArm.position.set(0.075, -0.12, -0.16);
  leftArm.rotation.z = 0.35;
  leftArm.rotation.y = 0.32;

  parts.push(
    upper, lower, magwell, ejectPort, forwardAssist, chargingHandle,
    bufferTube, stockBody, stockPad, stockLatch,
    grip, triggerGuard,
    magUpper, magLower, magFloor,
    handguard, topRail, railGlow,
    barrel, frontSight, sightPin, birdcage,
    opticBase, opticHood, reticleGlass,
    rightArm, leftArm
  );

  return parts;
}

// ==========================================
// RED TEAM AR: AK-47 KALASHNIKOV
// ==========================================
function buildAK47Model(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group,
  skinId?: string
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  const woodMat = skinId
    ? mid
    : new THREE.MeshStandardMaterial({
        color: 0x5a2715,
        roughness: 0.52,
        metalness: 0.08
      });
  const steelMat = dark;

  // Stamped Steel Receiver & Dust Cover
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.115, 0.44), steelMat);
  receiver.position.set(0, 0.01, -0.18);

  const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.38), steelMat);
  dustCover.position.set(0, 0.078, -0.18);

  const chargingHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.055, 10), steelMat);
  chargingHandle.rotation.z = Math.PI / 2;
  chargingHandle.position.set(0.054, 0.05, -0.17);

  const selectorSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.14), steelMat);
  selectorSwitch.position.set(0.047, 0.01, -0.12);

  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.038, 0.075), steelMat);
  triggerGuard.position.set(0, -0.07, -0.06);

  // Curved 30-Round "Banana" Magazine (7.62x39mm)
  const magTop = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.13, 0.096), steelMat);
  magTop.rotation.x = 0.22;
  magTop.position.set(0, -0.14, -0.16);

  const magMid = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.14, 0.092), steelMat);
  magMid.rotation.x = 0.46;
  magMid.position.set(0, -0.24, -0.21);

  const magTip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.088), steelMat);
  magTip.rotation.x = 0.72;
  magTip.position.set(0, -0.33, -0.29);

  const magFloor = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.018, 0.09), steelMat);
  magFloor.rotation.x = 0.72;
  magFloor.position.set(0, -0.38, -0.33);

  const magAccent = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.28, 0.02), accent);
  magAccent.rotation.x = 0.46;
  magAccent.position.set(0, -0.24, -0.17);

  // Laminated Wooden Handguards
  const lowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.08, 0.32), woodMat);
  lowerHandguard.position.set(0, -0.01, -0.48);

  const upperHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.055, 0.24), woodMat);
  upperHandguard.position.set(0, 0.065, -0.46);

  // Fixed Wooden Buttstock & Bakelite Grip
  const stockNeck = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.085, 0.1), woodMat);
  stockNeck.position.set(0, 0.0, 0.09);

  const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.145, 0.24), woodMat);
  buttstock.rotation.x = -0.16;
  buttstock.position.set(0, -0.05, 0.22);

  const buttplate = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.155, 0.02), steelMat);
  buttplate.rotation.x = -0.16;
  buttplate.position.set(0, -0.07, 0.34);

  const bakeliteGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.074), woodMat);
  bakeliteGrip.rotation.x = -0.34;
  bakeliteGrip.position.set(0, -0.12, 0.03);

  // Gas Tube, Barrel & Slant Muzzle Brake
  const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 12), steelMat);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.065, -0.52);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.76, 12), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.68);

  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.085, 0.065), steelMat);
  gasBlock.position.set(0, 0.04, -0.7);

  const frontSightTower = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.115, 0.05), steelMat);
  frontSightTower.position.set(0, 0.075, -0.96);

  const frontSightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.028, 8), accent);
  frontSightPost.position.set(0, 0.12, -0.96);

  const slantMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.065, 12), steelMat);
  slantMuzzle.rotation.x = Math.PI / 2;
  slantMuzzle.position.set(0, 0.01, -1.04);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.026, 0.095), steelMat);
  rearSight.position.set(0, 0.078, -0.34);

  const cyberConduit = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.012, 0.36), accent);
  cyberConduit.position.set(0, 0.045, -0.22);

  // Arms
  rightArm.position.set(-0.02, -0.11, 0.11);
  leftArm.position.set(0.08, -0.13, -0.14);
  leftArm.rotation.z = 0.36;
  leftArm.rotation.y = 0.34;

  parts.push(
    receiver, dustCover, chargingHandle, selectorSwitch, triggerGuard,
    magTop, magMid, magTip, magFloor, magAccent,
    lowerHandguard, upperHandguard,
    stockNeck, buttstock, buttplate, bakeliteGrip,
    gasTube, barrel, gasBlock, frontSightTower, frontSightPost, slantMuzzle, rearSight, cyberConduit,
    rightArm, leftArm
  );

  return parts;
}

// ==========================================
// BLUE TEAM SMG: UMP-45
// ==========================================
function buildUMPModel(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  // Boxy HK Polymer Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.14, 0.46), dark);
  receiver.position.set(0, 0.02, -0.14);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.52), mid);
  topRail.position.set(0, 0.098, -0.16);

  const rearSight = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.028, 10), mid);
  rearSight.position.set(0, 0.118, 0.02);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.055, 0.035), mid);
  frontSight.position.set(0, 0.125, -0.4);

  const frontSightGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.02, 8), accent);
  frontSightGlow.position.set(0, 0.13, -0.4);

  // Straight Vertical .45 ACP Stick Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.32, 0.072), mid);
  mag.position.set(0, -0.18, -0.13);

  const magSlot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.042), accent);
  magSlot.position.set(0, -0.16, -0.13);

  const magFloor = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, 0.076), dark);
  magFloor.position.set(0, -0.34, -0.13);

  // Side-Folding Skeleton Stock
  const stockUpperStrut = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.022, 0.24), mid);
  stockUpperStrut.position.set(0, 0.045, 0.18);

  const stockLowerStrut = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.022, 0.22), mid);
  stockLowerStrut.rotation.x = -0.22;
  stockLowerStrut.position.set(0, -0.04, 0.18);

  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.135, 0.03), dark);
  stockPad.position.set(0, 0.01, 0.3);

  // Squared Forend & Cocking Handle Tube
  const forend = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.09, 0.24), mid);
  forend.position.set(0, 0.0, -0.36);

  const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 10), dark);
  cockingTube.rotation.x = Math.PI / 2;
  cockingTube.position.set(-0.044, 0.055, -0.34);

  const cockingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.02), dark);
  cockingHandle.position.set(-0.065, 0.065, -0.28);

  // Vertical Tactical Foregrip Underneath
  const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.15, 12), dark);
  foregrip.position.set(0, -0.115, -0.38);

  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.28, 12), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.54);

  // Ergonomic HK Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.16, 0.075), dark);
  grip.rotation.x = -0.28;
  grip.position.set(0, -0.11, 0.02);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.012, 0.28), accent);
  strip.position.set(0, 0.05, -0.2);

  // Arms
  rightArm.position.set(-0.02, -0.1, 0.1);
  leftArm.position.set(0.065, -0.13, -0.36);
  leftArm.rotation.z = 0.38;
  leftArm.rotation.y = 0.22;

  parts.push(
    receiver, topRail, rearSight, frontSight, frontSightGlow,
    mag, magSlot, magFloor,
    stockUpperStrut, stockLowerStrut, stockPad,
    forend, cockingTube, cockingHandle, foregrip,
    barrel, grip, strip,
    rightArm, leftArm
  );

  return parts;
}

// ==========================================
// RED TEAM SMG: KRISS VECTOR
// ==========================================
function buildVectorModel(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  // Super V Recoil Mitigation Assembly Lower Block
  const superVBlock = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.19, 0.22), dark);
  superVBlock.rotation.x = -0.42;
  superVBlock.position.set(0, -0.06, -0.14);

  const superVSlider = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.04, 0.18), accent);
  superVSlider.rotation.x = -0.42;
  superVSlider.position.set(0, -0.06, -0.14);

  // Upper Receiver & Top Rail
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.085, 0.42), mid);
  upper.position.set(0, 0.045, -0.18);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.46), dark);
  topRail.position.set(0, 0.095, -0.18);

  const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.038, 0.08), dark);
  sightBase.position.set(0, 0.115, -0.14);

  const sightLens = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.036, 0.008), accent);
  sightLens.position.set(0, 0.12, -0.14);

  // Forward Magwell & Extended Stick Magazine
  const magwell = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.13, 0.095), dark);
  magwell.position.set(0, -0.12, -0.27);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.32, 0.068), mid);
  mag.rotation.x = -0.12;
  mag.position.set(0, -0.24, -0.26);

  const magFloor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.072), dark);
  magFloor.rotation.x = -0.12;
  magFloor.position.set(0, -0.39, -0.24);

  // Low Bore Axis Barrel & Front Shroud
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.36, 12), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, -0.02, -0.48);

  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.072, 0.22), mid);
  shroud.position.set(0, -0.02, -0.46);

  const muzzleComp = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.055, 12), dark);
  muzzleComp.rotation.x = Math.PI / 2;
  muzzleComp.position.set(0, -0.02, -0.66);

  // Integrated Front Handstop
  const handstop = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.045, 0.09), dark);
  handstop.position.set(0, -0.085, -0.42);

  // High-Tang Ergonomic Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.078), dark);
  grip.rotation.x = -0.28;
  grip.position.set(0, -0.1, 0.04);

  // Skeleton Folding Stock
  const stockBar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.22), mid);
  stockBar.position.set(0, 0.03, 0.14);

  const stockCheek = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), dark);
  stockCheek.position.set(0, 0.065, 0.14);

  const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.12, 0.025), dark);
  buttpad.position.set(0, 0.02, 0.25);

  const sideAccentL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.22), accent);
  sideAccentL.position.set(-0.044, 0.02, -0.26);

  const sideAccentR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.22), accent);
  sideAccentR.position.set(0.044, 0.02, -0.26);

  // Arms
  rightArm.position.set(-0.02, -0.1, 0.09);
  leftArm.position.set(0.07, -0.12, -0.24);
  leftArm.rotation.z = 0.42;
  leftArm.rotation.y = 0.38;

  parts.push(
    superVBlock, superVSlider,
    upper, topRail, sightBase, sightLens,
    magwell, mag, magFloor,
    barrel, shroud, muzzleComp, handstop,
    grip, stockBar, stockCheek, buttpad,
    sideAccentL, sideAccentR,
    rightArm, leftArm
  );

  return parts;
}

// ==========================================
// BLUE TEAM SHOTGUN: DP-12 DOUBLE-BARREL PUMP (FUTURISTIC)
// ==========================================
function buildDP12Model(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  // Main Bullpup Receiver Block & Action
  const bullpupStock = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.175, 0.42), dark);
  bullpupStock.position.set(0, 0.02, 0.14);

  const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.185, 0.04), mid);
  buttPad.position.set(0, 0.02, 0.36);

  // Twin Side-by-Side 12-Gauge Barrels (Parallel)
  const barrelSpacing = 0.034;
  const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.68, 12), dark);
  barrelL.rotation.x = Math.PI / 2;
  barrelL.position.set(-barrelSpacing, 0.05, -0.42);

  const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.68, 12), dark);
  barrelR.rotation.x = Math.PI / 2;
  barrelR.position.set(barrelSpacing, 0.05, -0.42);

  // Dual Breaching Chokes / Standoff Muzzle Crowns
  const chokeL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.065, 12), mid);
  chokeL.rotation.x = Math.PI / 2;
  chokeL.position.set(-barrelSpacing, 0.05, -0.76);

  const chokeR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.065, 12), mid);
  chokeR.rotation.x = Math.PI / 2;
  chokeR.position.set(barrelSpacing, 0.05, -0.76);

  // Dual Magazine Tubes (beneath barrels)
  const magTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.52, 12), mid);
  magTubeL.rotation.x = Math.PI / 2;
  magTubeL.position.set(-barrelSpacing, -0.015, -0.34);

  const magTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.52, 12), mid);
  magTubeR.rotation.x = Math.PI / 2;
  magTubeR.position.set(barrelSpacing, -0.015, -0.34);

  // Wide Dual-Tube Grooved Pump Forend Slide
  const pumpSlide = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.095, 0.24), dark);
  pumpSlide.position.set(0, -0.02, -0.36);

  // Integrated Angled Handstop / Foregrip under Pump
  const pumpGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.07), mid);
  pumpGrip.rotation.x = -0.25;
  pumpGrip.position.set(0, -0.11, -0.34);

  // Forward Pistol Grip & Trigger Assembly (Bullpup layout)
  const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.17, 0.08), dark);
  pistolGrip.rotation.x = -0.28;
  pistolGrip.position.set(0, -0.12, 0.02);

  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.038, 0.08), mid);
  triggerGuard.position.set(0, -0.07, -0.06);

  // Top Full-Length Picatinny Optics Rail
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.65), dark);
  topRail.position.set(0, 0.095, -0.24);

  // Futuristic Holographic Reflex Sight
  const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.12), dark);
  opticBase.position.set(0, 0.12, -0.22);
  const opticHood = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.058, 0.09), mid);
  opticHood.position.set(0, 0.155, -0.22);
  const reticleGlass = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.044, 0.008), accent);
  reticleGlass.position.set(0, 0.155, -0.22);

  // Futuristic Cyan Energy Conduits & Ammo Counter Bar
  const centralPlasmaCore = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.48), accent);
  centralPlasmaCore.position.set(0, 0.05, -0.42);

  const ammoDisplayL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.12), accent);
  ammoDisplayL.position.set(-0.064, 0.05, 0.1);

  const ammoDisplayR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.12), accent);
  ammoDisplayR.position.set(0.064, 0.05, 0.1);

  // Arms placement
  rightArm.position.set(-0.02, -0.11, 0.11);
  leftArm.position.set(0.07, -0.13, -0.22);
  leftArm.rotation.z = 0.34;
  leftArm.rotation.y = 0.32;

  parts.push(
    bullpupStock, buttPad,
    barrelL, barrelR, chokeL, chokeR,
    magTubeL, magTubeR, pumpSlide, pumpGrip,
    pistolGrip, triggerGuard,
    topRail, opticBase, opticHood, reticleGlass,
    centralPlasmaCore, ammoDisplayL, ammoDisplayR,
    rightArm, leftArm
  );
  return parts;
}

// ==========================================
// RED TEAM SHOTGUN: S&T ST870 WOODEN SHOTGUN (FUTURISTIC CYBER)
// ==========================================
function buildST870Model(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group,
  skinId?: string
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  const woodMat = skinId
    ? mid
    : new THREE.MeshStandardMaterial({
        color: 0x542312,
        roughness: 0.48,
        metalness: 0.1
      });
  const steelMat = dark;

  // Stamped Steel Shotgun Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.44), steelMat);
  receiver.position.set(0, 0.02, -0.14);

  // Ejection Port with glowing chamber feed
  const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.038, 0.1), mid);
  ejectPort.position.set(0.048, 0.035, -0.14);

  const chamberGlow = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.08), accent);
  chamberGlow.position.set(0.049, 0.035, -0.14);

  // Classic Contoured Wooden Stock & Buttpad
  const stockWrist = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.095, 0.14), woodMat);
  stockWrist.rotation.x = -0.22;
  stockWrist.position.set(0, -0.04, 0.12);

  const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.17, 0.32), woodMat);
  stockBody.rotation.x = -0.12;
  stockBody.position.set(0, -0.07, 0.3);

  const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.03), steelMat);
  buttpad.rotation.x = -0.12;
  buttpad.position.set(0, -0.085, 0.46);

  // Trigger & Guard
  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.038, 0.075), steelMat);
  triggerGuard.position.set(0, -0.07, -0.03);

  // Long Steel Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.88, 12), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.038, -0.56);

  // Full-Length Tubular Under-Barrel Magazine with knurled end cap
  const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.72, 12), steelMat);
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.022, -0.48);

  const magCap = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.04, 12), mid);
  magCap.rotation.x = Math.PI / 2;
  magCap.position.set(0, -0.022, -0.85);

  const barrelClamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.035), mid);
  barrelClamp.position.set(0, 0.01, -0.8);

  // Wooden Ribbed Pump Forend
  const pumpForend = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.095, 0.28), woodMat);
  pumpForend.position.set(0, -0.022, -0.42);

  // Ventilated Cyber Heat Shield over Barrel with Red Energy Conduits
  const heatShield = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.045, 0.48), steelMat);
  heatShield.position.set(0, 0.068, -0.44);

  const cyberConduit = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.52), accent);
  cyberConduit.position.set(0, 0.075, -0.44);

  // Front Tactical Bead Sight & Base
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.03), steelMat);
  frontSight.position.set(0, 0.072, -0.96);

  const sightBead = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), accent);
  sightBead.position.set(0, 0.095, -0.96);

  // Arms placement
  rightArm.position.set(-0.02, -0.11, 0.1);
  leftArm.position.set(0.075, -0.12, -0.28);
  leftArm.rotation.z = 0.35;
  leftArm.rotation.y = 0.34;

  parts.push(
    receiver, ejectPort, chamberGlow,
    stockWrist, stockBody, buttpad, triggerGuard,
    barrel, magTube, magCap, barrelClamp,
    pumpForend, heatShield, cyberConduit,
    frontSight, sightBead,
    rightArm, leftArm
  );
  return parts;
}

// ==========================================
// RED TEAM SNIPER: AWP SNIPER RIFLE (FUTURISTIC CYBER)
// ==========================================
function buildAWPModel(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group,
  skinId?: string
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  // Iconic Arctic Warfare Thumbhole Chassis (Deep tactical olive/crimson or skin)
  const chassisMat = skinId
    ? mid
    : new THREE.MeshStandardMaterial({
        color: 0x222a22,
        roughness: 0.5,
        metalness: 0.2
      });
  const steelMat = dark;

  // Stamped Steel Cylindrical Bolt-Action Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.11, 0.48), steelMat);
  receiver.position.set(0, 0.035, -0.2);

  // Bolt Handle & Sphere Knob (Turned Down on the right)
  const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.065, 8), steelMat);
  boltStem.rotation.z = Math.PI / 3;
  boltStem.position.set(0.062, 0.035, -0.06);

  const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), steelMat);
  boltKnob.position.set(0.088, 0.015, -0.06);

  // Thumbhole Chassis Stock Body
  const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.165, 0.35), chassisMat);
  buttstock.position.set(0, -0.03, 0.22);

  const thumbholeCutout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.085, 0.09), dark);
  thumbholeCutout.position.set(0, -0.04, 0.08);

  const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.045, 0.16), chassisMat);
  cheekRiser.position.set(0, 0.07, 0.22);

  const recoilPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.175, 0.035), steelMat);
  recoilPad.position.set(0, -0.03, 0.395);

  // Forward Stock / Handguard Chassis (Rectangular flat-bottom AWP forend)
  const forend = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.09, 0.42), chassisMat);
  forend.position.set(0, -0.015, -0.48);

  // Detachable Box Magazine (5/10 round AWP steel mag)
  const boxMag = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.15, 0.11), steelMat);
  boxMag.position.set(0, -0.11, -0.16);

  // Long Heavy Fluted Match Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 1.05, 12), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.78);

  // Iconic Massive Cylindrical Dual-Port AWP Muzzle Brake
  const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.095, 12), steelMat);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.035, -1.28);

  // Telescopic High-Power Sniper Optic Scope
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.44, 14), steelMat);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.145, -0.18);

  const scopeObjective = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.038, 0.12, 14), mid);
  scopeObjective.rotation.x = Math.PI / 2;
  scopeObjective.position.set(0, 0.145, -0.42);

  const scopeOcular = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.09, 14), mid);
  scopeOcular.rotation.x = Math.PI / 2;
  scopeOcular.position.set(0, 0.145, 0.06);

  const scopeMountF = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.04), steelMat);
  scopeMountF.position.set(0, 0.1, -0.28);

  const scopeMountR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.04), steelMat);
  scopeMountR.position.set(0, 0.1, -0.06);

  // Folded Tactical Bipod Legs under Forend
  const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), steelMat);
  bipodMount.position.set(0, -0.07, -0.64);

  const bipodLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), steelMat);
  bipodLegL.rotation.x = Math.PI / 2;
  bipodLegL.position.set(-0.032, -0.08, -0.52);

  const bipodLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), steelMat);
  bipodLegR.rotation.x = Math.PI / 2;
  bipodLegR.position.set(0.032, -0.08, -0.52);

  // Futuristic Crimson Cyber Accents & Thermal Flutes
  const barrelGlow = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.72), accent);
  barrelGlow.position.set(0, 0.062, -0.78);

  const chassisSensor = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.015, 0.28), accent);
  chassisSensor.position.set(0, 0.01, -0.46);

  // Arms placement
  rightArm.position.set(-0.02, -0.11, 0.12);
  leftArm.position.set(0.075, -0.13, -0.1);
  leftArm.rotation.z = 0.38;
  leftArm.rotation.y = 0.35;

  parts.push(
    receiver, boltStem, boltKnob,
    buttstock, thumbholeCutout, cheekRiser, recoilPad,
    forend, boxMag, barrel, muzzleBrake,
    scopeTube, scopeObjective, scopeOcular, scopeMountF, scopeMountR,
    bipodMount, bipodLegL, bipodLegR,
    barrelGlow, chassisSensor,
    rightArm, leftArm
  );
  return parts;
}

// ==========================================
// BLUE TEAM SNIPER: M107 .50 CAL SNIPER RIFLE (FUTURISTIC)
// ==========================================
function buildM107Model(
  dark: THREE.Material,
  mid: THREE.Material,
  accent: THREE.Material,
  rightArm: THREE.Group,
  leftArm: THREE.Group
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];

  // Massive Rectangular Steel Upper Receiver (distinctive Barrett M107 profile)
  const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.155, 0.68), dark);
  upperReceiver.position.set(0, 0.045, -0.22);

  const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.085, 0.44), mid);
  lowerReceiver.position.set(0, -0.06, -0.12);

  // Full-Length Top Picatinny Rail
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.95), dark);
  topRail.position.set(0, 0.13, -0.28);

  // Carry Handle on right side
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.18), dark);
  carryHandle.position.set(0.065, 0.08, -0.18);

  // Huge Angled 10-Round .50 BMG Steel Box Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.28, 0.16), mid);
  mag.rotation.x = -0.12;
  mag.position.set(0, -0.2, -0.18);

  // AR-Style Pistol Grip & Heavy Trigger Guard
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.18, 0.085), dark);
  grip.rotation.x = -0.28;
  grip.position.set(0, -0.14, 0.05);

  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.04, 0.09), mid);
  triggerGuard.position.set(0, -0.09, -0.04);

  // Rear Buffer Tube & Heavy Sniper Stock with Monopod
  const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.28, 12), dark);
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.02, 0.22);

  const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.24), mid);
  buttstock.position.set(0, -0.02, 0.32);

  const recoilPad = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.19, 0.04), dark);
  recoilPad.position.set(0, -0.02, 0.44);

  // Colossal .50 BMG Heavy Fluted Free-Floating Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 1.25, 14), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -0.88);

  // World-Famous Massive Barrett Arrowhead / Tank Muzzle Brake (2-Chamber)
  const brakeBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.18), dark);
  brakeBody.position.set(0, 0.045, -1.48);

  const brakePort1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.035), mid);
  brakePort1.position.set(0, 0.045, -1.44);

  const brakePort2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.035), mid);
  brakePort2.position.set(0, 0.045, -1.52);

  // Heavy Duty Bipod Assembly mounted to front receiver
  const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.08), dark);
  bipodMount.position.set(0, -0.02, -0.58);

  const bipodL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), dark);
  bipodL.rotation.x = Math.PI / 2;
  bipodL.position.set(-0.045, -0.04, -0.42);

  const bipodR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), dark);
  bipodR.rotation.x = Math.PI / 2;
  bipodR.position.set(0.045, -0.04, -0.42);

  // Heavy Long-Range Sniper Optic with Thermal/EMP Housing
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.48, 14), dark);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.19, -0.2);

  const scopeSunshade = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.044, 0.14, 14), mid);
  scopeSunshade.rotation.x = Math.PI / 2;
  scopeSunshade.position.set(0, 0.19, -0.47);

  const scopeEyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.09, 14), mid);
  scopeEyepiece.rotation.x = Math.PI / 2;
  scopeEyepiece.position.set(0, 0.19, 0.07);

  const scopeTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.035, 10), accent);
  scopeTurret.position.set(0, 0.245, -0.2);

  // Futuristic Cyan Energy / Rail Conduits
  const railGlow = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.82), accent);
  railGlow.position.set(0, 0.08, -0.75);

  const magChargeBar = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.015, 0.06), accent);
  magChargeBar.position.set(0, -0.16, -0.18);

  // Arms placement
  rightArm.position.set(-0.02, -0.11, 0.12);
  leftArm.position.set(0.08, -0.13, -0.05);
  leftArm.rotation.z = 0.38;
  leftArm.rotation.y = 0.36;

  parts.push(
    upperReceiver, lowerReceiver, topRail, carryHandle,
    mag, grip, triggerGuard,
    bufferTube, buttstock, recoilPad,
    barrel, brakeBody, brakePort1, brakePort2,
    bipodMount, bipodL, bipodR,
    scopeTube, scopeSunshade, scopeEyepiece, scopeTurret,
    railGlow, magChargeBar,
    rightArm, leftArm
  );
  return parts;
}

export function buildPrimaryModel(
  classKey: WeaponClassKey,
  skinId?: string,
  team: 'blue' | 'red' = 'blue'
): THREE.Object3D[] {
  const { dark, mid, accent } = getSkinMaterials(skinId, team);

  const parts: THREE.Object3D[] = [];
  const rightArm = createArm(false);
  const leftArm = createArm(true);

  if (classKey === 'ar') {
    // Red Team: AK-47 | Blue Team: M4
    if (team === 'red') {
      return buildAK47Model(dark, mid, accent, rightArm, leftArm, skinId);
    } else {
      return buildM4Model(dark, mid, accent, rightArm, leftArm);
    }
  } else if (classKey === 'smg') {
    // Red Team: Kriss Vector | Blue Team: UMP-45
    if (team === 'red') {
      return buildVectorModel(dark, mid, accent, rightArm, leftArm);
    } else {
      return buildUMPModel(dark, mid, accent, rightArm, leftArm);
    }
  } else if (classKey === 'shotgun') {
    // Red Team: S&T ST870 | Blue Team: DP-12
    if (team === 'red') {
      return buildST870Model(dark, mid, accent, rightArm, leftArm, skinId);
    } else {
      return buildDP12Model(dark, mid, accent, rightArm, leftArm);
    }
  } else if (classKey === 'sniper') {
    // Red Team: AWP | Blue Team: M107
    if (team === 'red') {
      return buildAWPModel(dark, mid, accent, rightArm, leftArm, skinId);
    } else {
      return buildM107Model(dark, mid, accent, rightArm, leftArm);
    }
  }

  return parts;
}

export function buildPistolModel(skinId?: string): THREE.Object3D[] {
  const { dark, mid, accent } = getSkinMaterials(skinId);

  const rightArm = createArm(false);
  const leftArm = createArm(true);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.115, 0.34), dark);
  body.position.set(0, 0, -0.15);
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.05, 0.36), mid);
  slide.position.set(0, 0.055, -0.17);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.036, 0.38, 12), mid);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -0.28);
  const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 14), dark);
  silencer.rotation.x = Math.PI / 2;
  silencer.position.set(0, 0, -0.44);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.03, 0.08), accent);
  sight.position.set(0, 0.09, -0.12);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.17, 0.075), dark);
  grip.rotation.x = -0.22;
  grip.position.set(0, -0.12, 0.03);

  rightArm.position.set(-0.02, -0.11, 0.11);
  leftArm.position.set(0.08, -0.13, 0.14);
  leftArm.rotation.z = 0.36;
  leftArm.rotation.y = 0.36;

  return [body, slide, barrel, silencer, sight, grip, rightArm, leftArm];
}

export function buildKnifeModel(skinId?: string): {
  karambitPivot: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
} {
  const { dark, mid, accent, accentCol } = getSkinMaterials(skinId);

  const karambitPivot = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0075, 12, 28), dark);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.115, 0.032), mid);
  handle.position.set(0, -0.07, 0.02);
  handle.rotation.x = -0.15;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.026, -0.042);
  shape.lineTo(0.082, -0.155);
  shape.lineTo(0.016, -0.105);
  shape.lineTo(0, 0);

  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002
    }),
    new THREE.MeshStandardMaterial({
      color: 0xdff6ff,
      emissive: accentCol,
      emissiveIntensity: 0.85,
      metalness: 0.95,
      roughness: 0.12
    })
  );
  blade.rotation.y = Math.PI / 2;
  blade.position.set(-0.004, -0.02, -0.01);
  karambitPivot.add(ring, handle, blade);

  const rightArm = createArm(false);
  rightArm.position.set(0, -0.07, 0.02);
  rightArm.rotation.x = -0.15;

  const leftArm = createArm(true);
  leftArm.position.set(0, -1, 0);

  return { karambitPivot, rightArm, leftArm };
}

export function buildGrenadeModel(isNonLethal: boolean, skinId?: string): {
  grenadePivot: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
} {
  const { dark, mid, accentCol } = getSkinMaterials(skinId);
  const grenadePivot = new THREE.Group();

  if (!isNonLethal) {
    // Slot 4: Lethal Plasma Frag Grenade
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 16), mid);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.034, 16), dark);
    const coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff4400,
        emissiveIntensity: 2.8
      })
    );
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.026, 12), dark);
    topCap.position.y = 0.058;
    const pinRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.013, 0.003, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.2 })
    );
    pinRing.rotation.x = Math.PI / 2;
    pinRing.position.set(0.022, 0.062, 0);

    grenadePivot.add(sphere, band, coreGlow, topCap, pinRing);
  } else {
    // Slot 5: Non-Lethal EMP Flash Canister
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.12, 16), dark);
    const ring1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.041, 0.041, 0.018, 16),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00d4ff,
        emissiveIntensity: 2.8
      })
    );
    ring1.position.y = 0.03;
    const ring2 = ring1.clone();
    ring2.position.y = -0.03;
    const emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xccffff,
        emissiveIntensity: 3.0
      })
    );
    emitter.position.y = 0.065;

    grenadePivot.add(can, ring1, ring2, emitter);
  }

  grenadePivot.position.set(0.06, -0.08, -0.2);

  const rightArm = createArm(false);
  rightArm.position.set(0.05, -0.12, 0.08);

  const leftArm = createArm(true);
  leftArm.position.set(-0.06, -0.16, 0.14);
  leftArm.rotation.z = 0.3;

  return { grenadePivot, rightArm, leftArm };
}

// ==========================================
// THIRD-PERSON WEAPON MESH (BOTS & OTHER PLAYERS)
// ==========================================
export function buildThirdPersonWeapon(
  classKey: WeaponClassKey,
  team: 'blue' | 'red' = 'blue'
): THREE.Group {
  const group = new THREE.Group();
  const darkCol = 0x161c28;
  const midCol = 0x222a38;
  const accentCol = team === 'red' ? 0xff2a6d : 0x00d4ff;
  const dark = new THREE.MeshStandardMaterial({ color: darkCol, metalness: 0.9, roughness: 0.3 });
  const mid = new THREE.MeshStandardMaterial({ color: midCol, metalness: 0.7, roughness: 0.4 });
  const accent = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: accentCol,
    emissiveIntensity: 1.2,
    metalness: 0.5,
    roughness: 0.3
  });

  if (classKey === 'ar') {
    if (team === 'red') {
      // AK-47 (Red Team) - Classic Russian wooden furniture + curved 7.62x39 banana mag + slant brake
      const wood = new THREE.MeshStandardMaterial({ color: 0x5a2715, roughness: 0.55, metalness: 0.1 });
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.55), dark);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), wood);
      stock.position.set(0, -0.06, 0.38);
      stock.rotation.x = -0.15;
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.38), wood);
      handguard.position.set(0, 0, -0.38);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.85, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.6);
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.05), dark);
      frontSight.position.set(0, 0.09, -0.95);
      const slantMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), dark);
      slantMuzzle.rotation.x = Math.PI / 2;
      slantMuzzle.position.set(0, 0.02, -1.05);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.14), dark);
      mag.rotation.x = 0.42;
      mag.position.set(0, -0.22, -0.18);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), wood);
      grip.rotation.x = -0.35;
      grip.position.set(0, -0.16, 0.05);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.015, 0.3), accent);
      glowStrip.position.set(0, 0.06, -0.1);

      group.add(receiver, stock, handguard, barrel, frontSight, slantMuzzle, mag, grip, glowStrip);
    } else {
      // M4 (Blue Team) - Tactical AR-15 carbine + Crane stock + STANAG mag + birdcage
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.52), dark);
      const buffer = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 10), dark);
      buffer.rotation.x = Math.PI / 2;
      buffer.position.set(0, 0.02, 0.2);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.28), mid);
      stock.position.set(0, -0.01, 0.35);
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.45), mid);
      handguard.position.set(0, 0.02, -0.42);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.75, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.65);
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.06), dark);
      frontSight.position.set(0, 0.1, -0.72);
      const birdcage = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), dark);
      birdcage.rotation.x = Math.PI / 2;
      birdcage.position.set(0, 0.02, -1.02);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.12), mid);
      mag.rotation.x = 0.22;
      mag.position.set(0, -0.22, -0.18);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), dark);
      grip.rotation.x = -0.32;
      grip.position.set(0, -0.15, 0.03);
      const optic = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), dark);
      optic.position.set(0, 0.12, -0.15);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.015, 0.35), accent);
      glowStrip.position.set(0, 0.06, -0.4);

      group.add(receiver, buffer, stock, handguard, barrel, frontSight, birdcage, mag, grip, optic, glowStrip);
    }
  } else if (classKey === 'smg') {
    if (team === 'red') {
      // KRISS Vector (Red Team) - Super V recoil mitigation assembly + low bore axis + forward mag
      const superVBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.28), dark);
      superVBlock.rotation.x = -0.42;
      superVBlock.position.set(0, -0.08, -0.12);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.52), mid);
      upper.position.set(0, 0.06, -0.18);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.45, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, -0.02, -0.5);
      const muzzleComp = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.08, 10), dark);
      muzzleComp.rotation.x = Math.PI / 2;
      muzzleComp.position.set(0, -0.02, -0.72);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.09), mid);
      mag.rotation.x = -0.12;
      mag.position.set(0, -0.26, -0.28);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), dark);
      grip.rotation.x = -0.28;
      grip.position.set(0, -0.12, 0.06);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.3), mid);
      stock.position.set(0, 0.04, 0.2);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.03, 0.2), accent);
      glowStrip.rotation.x = -0.42;
      glowStrip.position.set(0, -0.08, -0.12);

      group.add(superVBlock, upper, barrel, muzzleComp, mag, grip, stock, glowStrip);
    } else {
      // UMP-45 (Blue Team) - HK boxy polymer frame + vertical stick mag + vertical foregrip + skeleton stock
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.55), dark);
      receiver.position.set(0, 0.02, -0.16);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.38, 0.1), mid);
      mag.position.set(0, -0.22, -0.14);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.32), mid);
      stock.position.set(0, 0.04, 0.22);
      const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.18, 10), dark);
      foregrip.position.set(0, -0.14, -0.42);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.38, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.01, -0.58);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.1), dark);
      grip.rotation.x = -0.28;
      grip.position.set(0, -0.14, 0.04);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.015, 0.34), accent);
      glowStrip.position.set(0, 0.06, -0.2);

      group.add(receiver, mag, stock, foregrip, barrel, grip, glowStrip);
    }
  } else if (classKey === 'shotgun') {
    if (team === 'red') {
      // S&T ST870 (Red Team) - Classic wooden stock + wooden ribbed forend + tubular mag + heat shield
      const wood = new THREE.MeshStandardMaterial({ color: 0x542312, roughness: 0.5, metalness: 0.1 });
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.52), dark);
      receiver.position.set(0, 0.02, -0.15);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.17, 0.36), wood);
      stock.rotation.x = -0.15;
      stock.position.set(0, -0.05, 0.28);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.88, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.04, -0.58);
      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 10), mid);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.025, -0.5);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.3), wood);
      pump.position.set(0, -0.025, -0.42);
      const heatShield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.48), dark);
      heatShield.position.set(0, 0.07, -0.45);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.015, 0.32), accent);
      glowStrip.position.set(0, 0.06, -0.12);

      group.add(receiver, stock, barrel, magTube, pump, heatShield, glowStrip);
    } else {
      // DP-12 (Blue Team) - Twin side-by-side barrels + dual mag tubes + bullpup stock + pump grip
      const bullpupStock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.19, 0.46), dark);
      bullpupStock.position.set(0, 0.02, 0.12);
      const spacing = 0.036;
      const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 10), dark);
      barrelL.rotation.x = Math.PI / 2;
      barrelL.position.set(-spacing, 0.05, -0.44);
      const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 10), dark);
      barrelR.rotation.x = Math.PI / 2;
      barrelR.position.set(spacing, 0.05, -0.44);
      const chokeL = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.08, 10), mid);
      chokeL.rotation.x = Math.PI / 2;
      chokeL.position.set(-spacing, 0.05, -0.8);
      const chokeR = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.08, 10), mid);
      chokeR.rotation.x = Math.PI / 2;
      chokeR.position.set(spacing, 0.05, -0.8);
      const magTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.55, 10), mid);
      magTubeL.rotation.x = Math.PI / 2;
      magTubeL.position.set(-spacing, -0.018, -0.36);
      const magTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.55, 10), mid);
      magTubeR.rotation.x = Math.PI / 2;
      magTubeR.position.set(spacing, -0.018, -0.36);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), dark);
      pump.position.set(0, -0.02, -0.38);
      const pumpGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.07), mid);
      pumpGrip.rotation.x = -0.25;
      pumpGrip.position.set(0, -0.11, -0.36);
      const optic = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.15), mid);
      optic.position.set(0, 0.13, -0.22);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.52), accent);
      glowStrip.position.set(0, 0.05, -0.44);

      group.add(bullpupStock, barrelL, barrelR, chokeL, chokeR, magTubeL, magTubeR, pump, pumpGrip, optic, glowStrip);
    }
  } else {
    // sniper
    if (team === 'red') {
      // AWP (Red Team) - Iconic thumbhole sniper chassis + cylindrical bolt receiver + large brake + scope
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x222a22, roughness: 0.5, metalness: 0.2 });
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.52), dark);
      receiver.position.set(0, 0.035, -0.2);
      const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.38), chassisMat);
      buttstock.position.set(0, -0.03, 0.24);
      const forend = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.1, 0.45), chassisMat);
      forend.position.set(0, -0.015, -0.5);
      const boxMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.12), dark);
      boxMag.position.set(0, -0.12, -0.16);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 1.1, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.035, -0.82);
      const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 10), dark);
      muzzleBrake.rotation.x = Math.PI / 2;
      muzzleBrake.position.set(0, 0.035, -1.36);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.48, 10), dark);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.16, -0.2);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.75), accent);
      glowStrip.position.set(0, 0.065, -0.8);

      group.add(receiver, buttstock, forend, boxMag, barrel, muzzleBrake, scope, glowStrip);
    } else {
      // M107 (Blue Team) - Massive Barrett .50 cal rectangular receiver + tank brake + huge box mag + bipod + scope
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 0.72), dark);
      upper.position.set(0, 0.045, -0.24);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.19, 0.28), mid);
      stock.position.set(0, -0.02, 0.32);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.3, 0.18), mid);
      mag.rotation.x = -0.12;
      mag.position.set(0, -0.22, -0.2);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 1.3, 10), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.045, -0.92);
      // Colossal Barrett Arrowhead / Tank Muzzle Brake
      const tankBrake = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.095, 0.2), dark);
      tankBrake.position.set(0, 0.045, -1.56);
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.52, 10), dark);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.2, -0.22);
      const bipodL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), dark);
      bipodL.rotation.x = Math.PI / 2;
      bipodL.position.set(-0.05, -0.04, -0.44);
      const bipodR = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), dark);
      bipodR.rotation.x = Math.PI / 2;
      bipodR.position.set(0.05, -0.04, -0.44);
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.85), accent);
      glowStrip.position.set(0, 0.085, -0.8);

      group.add(upper, stock, mag, barrel, tankBrake, scope, bipodL, bipodR, glowStrip);
    }
  }

  // Scale down to comfortably fit operative hands
  group.scale.setScalar(0.72);
  return group;
}
