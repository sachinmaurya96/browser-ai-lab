/**
 * 3D device stage: procedural devices (our own geometry, no vendor artwork)
 * with the user's screenshot on the screen, lit by a studio environment and
 * orbited with the mouse. Loaded on demand by the 3D device dialog.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type DeviceKind = "phone" | "tablet" | "laptop" | "monitor" | "watch";
export type Finish = "graphite" | "silver" | "midnight" | "sand" | "coral";
export type Orientation = "auto" | "portrait" | "landscape";
export type ScreenFit = "cover" | "contain";

export const DEVICES: { id: DeviceKind; label: string }[] = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "laptop", label: "Laptop" },
  { id: "monitor", label: "Monitor" },
  { id: "watch", label: "Watch" },
];

export const FINISHES: { id: Finish; label: string; color: string }[] = [
  { id: "graphite", label: "Graphite", color: "#3a3b3f" },
  { id: "silver", label: "Silver", color: "#d9dbdf" },
  { id: "midnight", label: "Midnight", color: "#1f2738" },
  { id: "sand", label: "Sand", color: "#d8c6a8" },
  { id: "coral", label: "Coral", color: "#d9654a" },
];

/** Camera angles: azimuth and elevation in degrees. */
export const VIEWS: { id: string; label: string; az: number; el: number }[] = [
  { id: "front", label: "Front", az: 0, el: 4 },
  { id: "hero-left", label: "Hero left", az: -32, el: 12 },
  { id: "hero-right", label: "Hero right", az: 32, el: 12 },
  { id: "above", label: "From above", az: 0, el: 38 },
  { id: "iso-left", label: "Iso left", az: -42, el: 30 },
  { id: "iso-right", label: "Iso right", az: 42, el: 30 },
  { id: "side", label: "Side", az: -68, el: 6 },
  { id: "back", label: "Back", az: 160, el: 14 },
];

export interface DeviceOptions {
  kind: DeviceKind;
  finish: Finish;
  orientation: Orientation;
  fit: ScreenFit;
}

const FOV = 28;

function rr(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** A flat rounded plate whose UVs span 0..1 over its bounds. */
function plate(w: number, h: number, r: number): THREE.ShapeGeometry {
  const g = new THREE.ShapeGeometry(rr(w, h, r), 24);
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return g;
}

/** A rounded slab centred on z = 0, `d` thick overall. */
function slab(w: number, h: number, r: number, d: number): THREE.ExtrudeGeometry {
  const b = Math.min(d * 0.45, r * 0.6, 0.03);
  const g = new THREE.ExtrudeGeometry(rr(w - 2 * b, h - 2 * b, Math.max(0.001, r - b)), {
    depth: Math.max(0.001, d - 2 * b),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 5,
    curveSegments: 24,
  });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

interface Built {
  group: THREE.Group;
  /** Screen size in scene units, for the texture's aspect. */
  screen: { w: number; h: number; r: number };
  screenMesh: THREE.Mesh;
}

export class DeviceStage {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);
  private readonly controls: OrbitControls;
  private readonly env: THREE.Texture;
  private built: Built | null = null;
  private image: ImageBitmap | null = null;
  private opts: DeviceOptions = { kind: "phone", finish: "graphite", orientation: "auto", fit: "cover" };
  private radius = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.env;
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 4, 5);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.7;
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  resize(width: number, height: number): void {
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  async setImage(blob: Blob): Promise<void> {
    this.image?.close();
    this.image = await createImageBitmap(blob);
    this.rebuild();
  }

  setOptions(next: Partial<DeviceOptions>): void {
    const kindChanged = next.kind && next.kind !== this.opts.kind;
    this.opts = { ...this.opts, ...next };
    this.rebuild();
    if (kindChanged) this.view(this.opts.kind === "laptop" ? "above" : "hero-left");
  }

  /** Move the camera to a named angle (the user can keep dragging from there). */
  view(id: string): void {
    const v = VIEWS.find((x) => x.id === id) ?? VIEWS[0]!;
    const el = (v.el * Math.PI) / 180;
    const az = (v.az * Math.PI) / 180;
    const dist = (this.radius / Math.sin(((FOV / 2) * Math.PI) / 180)) * 1.08;
    this.camera.position.set(dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el), dist * Math.cos(el) * Math.cos(az));
    this.controls.target.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
  }

  /**
   * Render the current view at `size` px square with a transparent
   * background, trimmed to the device, with a soft shadow baked in.
   */
  async snapshot(size = 2200, shadow = true): Promise<Blob> {
    const prev = new THREE.Vector2();
    this.renderer.getSize(prev);
    const prevRatio = this.renderer.getPixelRatio();
    const prevAspect = this.camera.aspect;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const raw = document.createElement("canvas");
    raw.width = size;
    raw.height = size;
    raw.getContext("2d")!.drawImage(this.renderer.domElement, 0, 0);
    this.renderer.setPixelRatio(prevRatio);
    this.renderer.setSize(prev.x, prev.y, false);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    return trimAndShadow(raw, shadow);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.clear();
    this.env.dispose();
    this.image?.close();
    this.renderer.dispose();
  }

  private clear(): void {
    if (!this.built) return;
    this.scene.remove(this.built.group);
    this.built.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        (mat as THREE.MeshBasicMaterial).map?.dispose();
        mat.dispose();
      }
    });
    this.built = null;
  }

  private rebuild(): void {
    const firstBuild = !this.built;
    this.clear();
    const landscape =
      this.opts.orientation === "landscape" ||
      (this.opts.orientation === "auto" && !!this.image && this.image.width > this.image.height * 1.05);
    const color = FINISHES.find((f) => f.id === this.opts.finish)?.color ?? "#3a3b3f";
    const b = build(this.opts.kind, landscape, color);
    const tex = this.screenTexture(b.screen.w / b.screen.h, b.screen.r / b.screen.h);
    if (tex) (b.screenMesh.material as THREE.MeshBasicMaterial).map = tex;
    // Centre on the origin, so the orbit turns around the device.
    const box = new THREE.Box3().setFromObject(b.group);
    const c = box.getCenter(new THREE.Vector3());
    b.group.position.sub(c);
    this.radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    this.scene.add(b.group);
    this.built = b;
    this.controls.minDistance = this.radius * 1.6;
    this.controls.maxDistance = this.radius * 8;
    if (firstBuild) this.view(this.opts.kind === "laptop" ? "above" : "hero-left");
  }

  private screenTexture(aspect: number, radiusFrac: number): THREE.CanvasTexture | null {
    const H = 1800;
    const W = Math.round(H * aspect);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b0b0c";
    g.fillRect(0, 0, W, H);
    const img = this.image;
    if (img) {
      g.save();
      g.beginPath();
      g.roundRect(0, 0, W, H, radiusFrac * H);
      g.clip();
      const s =
        this.opts.fit === "cover"
          ? Math.max(W / img.width, H / img.height)
          : Math.min(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      // Cover keeps the top of tall captures (where an app's header is).
      const dy = this.opts.fit === "cover" ? 0 : (H - dh) / 2;
      g.drawImage(img, (W - dw) / 2, dy, dw, dh);
      g.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

function metal(color: string): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.75, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.25 });
}
const glass = () => new THREE.MeshPhysicalMaterial({ color: 0x060607, metalness: 0.1, roughness: 0.06, clearcoat: 1 });
const black = () => new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.5 });
const screenMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

/** A phone- or tablet-like slab: body, glass front, screen; returns the front z. */
function handheld(group: THREE.Group, w: number, h: number, r: number, d: number, bezel: number, color: string) {
  group.add(new THREE.Mesh(slab(w, h, r, d), metal(color)));
  const front = d / 2;
  const g = new THREE.Mesh(plate(w - 0.012, h - 0.012, r - 0.006), glass());
  g.position.z = front + 0.001;
  group.add(g);
  const sw = w - 2 * bezel;
  const sh = h - 2 * bezel;
  const sr = Math.max(0.01, r - bezel);
  const screen = new THREE.Mesh(plate(sw, sh, sr), screenMat());
  screen.position.z = front + 0.002;
  group.add(screen);
  // A dark back panel so the rear reads as glass.
  const back = new THREE.Mesh(plate(w - 0.02, h - 0.02, r - 0.01), new THREE.MeshPhysicalMaterial({ color, metalness: 0.2, roughness: 0.45, clearcoat: 0.6 }));
  back.position.z = -front - 0.001;
  back.rotation.y = Math.PI;
  group.add(back);
  return { screen: { w: sw, h: sh, r: sr }, screenMesh: screen, front };
}

function build(kind: DeviceKind, landscape: boolean, color: string): Built {
  const group = new THREE.Group();
  switch (kind) {
    case "phone": {
      const [w, h] = landscape ? [2.06, 1] : [1, 2.06];
      const out = handheld(group, w, h, 0.16, 0.09, 0.034, color);
      // Camera pill on the screen, and a camera block on the back.
      const pill = new THREE.Mesh(plate(landscape ? 0.06 : 0.26, landscape ? 0.26 : 0.06, 0.03), black());
      pill.position.set(landscape ? -w / 2 + 0.09 : 0, landscape ? 0 : h / 2 - 0.09, out.front + 0.003);
      group.add(pill);
      const block = new THREE.Mesh(slab(0.38, 0.38, 0.1, 0.03), metal(color));
      const bx = landscape ? w / 2 - 0.27 : -w / 2 + 0.27;
      block.position.set(bx, h / 2 - 0.27, -out.front - 0.012);
      group.add(block);
      for (const [dx, dy] of [[-0.085, 0.085], [0.085, -0.02], [-0.085, -0.085]] as const) {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.03, 32), glass());
        lens.rotation.x = Math.PI / 2;
        lens.position.set(bx + dx, h / 2 - 0.27 + dy, -out.front - 0.03);
        group.add(lens);
      }
      // Side buttons.
      for (const [y, len] of [[0.35, 0.22], [0.08, 0.14]] as const) {
        const btn = new THREE.Mesh(new THREE.BoxGeometry(0.02, len, 0.035), metal(color));
        if (landscape) {
          btn.rotation.z = Math.PI / 2;
          btn.position.set(y - 0.2, h / 2 + 0.006, 0);
        } else btn.position.set(w / 2 + 0.006, y, 0);
        group.add(btn);
      }
      return { group, screen: out.screen, screenMesh: out.screenMesh };
    }
    case "tablet": {
      const [w, h] = landscape ? [2.2, 1.62] : [1.62, 2.2];
      const out = handheld(group, w, h, 0.1, 0.06, 0.07, color);
      return { group, screen: out.screen, screenMesh: out.screenMesh };
    }
    case "watch": {
      const w = 1;
      const h = 1.2;
      const out = handheld(group, w, h, 0.3, 0.32, 0.08, color);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 32), metal(color));
      crown.rotation.z = Math.PI / 2;
      crown.position.set(w / 2 + 0.03, 0.18, 0);
      group.add(crown);
      const band = new THREE.MeshStandardMaterial({ color: "#2b2d31", roughness: 0.85 });
      // Each strap leaves the case edge and curves away behind the wrist.
      const section = rr(0.07, 0.74, 0.03);
      for (const sign of [1, -1]) {
        const y0 = sign * (h / 2 - 0.08);
        const path = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, y0, -0.06),
          new THREE.Vector3(0, y0 + sign * 0.3, -0.14),
          new THREE.Vector3(0, y0 + sign * 0.55, -0.38),
          new THREE.Vector3(0, y0 + sign * 0.66, -0.7),
        ]);
        const geo = new THREE.ExtrudeGeometry(section, { steps: 32, bevelEnabled: false, extrudePath: path });
        group.add(new THREE.Mesh(geo, band));
      }
      return { group, screen: out.screen, screenMesh: out.screenMesh };
    }
    case "laptop": {
      const W = 3;
      const lidH = 1.95;
      const depth = 2.05;
      // Base, lying flat, extending towards the viewer from the hinge.
      const base = new THREE.Mesh(slab(W, depth, 0.1, 0.07), metal(color));
      base.rotation.x = -Math.PI / 2;
      base.position.set(0, -0.035, depth / 2);
      group.add(base);
      const deck = new THREE.Mesh(plate(W - 0.5, 0.95, 0.04), black());
      deck.rotation.x = -Math.PI / 2;
      deck.position.set(0, 0.001, 0.62);
      group.add(deck);
      const pad = new THREE.Mesh(plate(1.05, 0.62, 0.05), new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.25 }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(0, 0.002, 1.56);
      group.add(pad);
      // Lid, hinged at the back edge and tilted back a little.
      const lid = new THREE.Group();
      lid.rotation.x = -0.18;
      const shell = new THREE.Mesh(slab(W, lidH, 0.08, 0.04), metal(color));
      shell.position.y = lidH / 2;
      lid.add(shell);
      const bezel = new THREE.Mesh(plate(W - 0.01, lidH - 0.01, 0.075), glass());
      bezel.position.set(0, lidH / 2, 0.021);
      lid.add(bezel);
      const sw = W - 0.16;
      const sh = lidH - 0.2;
      const screen = new THREE.Mesh(plate(sw, sh, 0.02), screenMat());
      screen.position.set(0, lidH / 2 + 0.02, 0.022);
      lid.add(screen);
      group.add(lid);
      return { group, screen: { w: sw, h: sh, r: 0.02 }, screenMesh: screen };
    }
    case "monitor": {
      const W = 3.2;
      const H = 1.95;
      const panel = new THREE.Group();
      panel.add(new THREE.Mesh(slab(W, H, 0.05, 0.06), metal(color)));
      const front = new THREE.Mesh(plate(W - 0.01, H - 0.01, 0.045), glass());
      front.position.z = 0.031;
      panel.add(front);
      const sw = W - 0.1;
      const sh = H - 0.22;
      const screen = new THREE.Mesh(plate(sw, sh, 0.01), screenMat());
      screen.position.set(0, 0.06, 0.032);
      panel.add(screen);
      panel.position.y = 0.55;
      group.add(panel);
      const neck = new THREE.Mesh(slab(0.42, 1.2, 0.04, 0.08), metal(color));
      neck.position.set(0, -0.35, -0.12);
      neck.rotation.x = -0.12;
      group.add(neck);
      const foot = new THREE.Mesh(slab(1.25, 0.8, 0.12, 0.05), metal(color));
      foot.rotation.x = -Math.PI / 2;
      foot.position.set(0, -0.98, -0.02);
      group.add(foot);
      return { group, screen: { w: sw, h: sh, r: 0.01 }, screenMesh: screen };
    }
  }
}

/** Crop the transparent margin, pad it back evenly and bake a soft shadow. */
async function trimAndShadow(raw: HTMLCanvasElement, shadow: boolean): Promise<Blob> {
  const g = raw.getContext("2d")!;
  const { width: W, height: H } = raw;
  const data = g.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3]! > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("Nothing to render: the device is out of view.");
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const pad = Math.round(Math.max(w, h) * (shadow ? 0.08 : 0.02));
  const out = document.createElement("canvas");
  out.width = w + 2 * pad;
  out.height = h + 2 * pad;
  const o = out.getContext("2d")!;
  if (shadow) {
    o.shadowColor = "rgba(0, 0, 0, 0.34)";
    o.shadowBlur = Math.max(10, Math.max(w, h) * 0.035);
    o.shadowOffsetY = Math.max(6, h * 0.025);
  }
  o.drawImage(raw, x0, y0, w, h, pad, pad, w, h);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not encode the image.");
  return blob;
}
