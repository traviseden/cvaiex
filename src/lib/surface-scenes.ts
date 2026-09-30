import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rooms, type Place } from '../data/content';
import type { StorefrontCatalog, StorefrontSlot, MallPhoto } from '../data/storefronts';
import { mallLayout } from './mall-layout.mjs';

export interface Obstacle { minX: number; maxX: number; minZ: number; maxZ: number; }
export interface SurfaceInteraction {
  id: string; title: string; kind: 'event' | 'community' | 'build' | 'exit' | 'business' | 'district' | 'landmark';
  position: THREE.Vector3; eventId?: string; businessId?: string; slotId?: string; landmarkId?: string;
}
export interface SurfaceScene {
  scene: THREE.Scene; obstacles: Obstacle[]; bounds: Obstacle; interactions: SurfaceInteraction[];
  spawn: THREE.Vector3; overview: THREE.Vector3; overviewTarget: THREE.Vector3;
  dispose(): void;
}

function tools(scene: THREE.Scene) {
  const textures: THREE.Texture[] = [];
  const obstacles: Obstacle[] = [];
  let disposed = false;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string | number, glow = false) {
    const key = `${color}-${glow}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .15, emissive: glow ? color : 0, emissiveIntensity: glow ? .3 : 0 }));
    return materials.get(key)!;
  }
  function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string | number, solid = false, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color)); mesh.position.set(x, y, z); parent.add(mesh);
    if (solid) obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  }
  function sign(title: string, subtitle: string, width: number, height: number, color: string, position: THREE.Vector3, yaw = 0, parent: THREE.Object3D = scene, interaction?: SurfaceInteraction) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.max(128, Math.min(1024, Math.round(1024 * height / width)));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#16282b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.textAlign = 'center'; ctx.fillStyle = color;
    let size = Math.min(84, Math.round(canvas.height * .33)); ctx.font = `600 ${size}px sans-serif`;
    while (ctx.measureText(title).width > 920 && size > 28) { size -= 2; ctx.font = `600 ${size}px sans-serif`; }
    ctx.fillText(title, 512, canvas.height * .5);
    ctx.fillStyle = '#c0cec1';
    let subtitleSize = Math.max(12, Math.round(canvas.height * .13)); ctx.font = `${subtitleSize}px monospace`;
    while (ctx.measureText(subtitle.slice(0, 52)).width > 920 && subtitleSize > 10) { subtitleSize--; ctx.font = `${subtitleSize}px monospace`; }
    ctx.fillText(subtitle.slice(0, 52), 512, canvas.height * .76);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.copy(position); mesh.rotation.y = yaw;
    if (interaction) mesh.userData.interactionId = interaction.id;
    parent.add(mesh); return mesh;
  }
  function photo(image: MallPhoto, w: number, h: number, position: THREE.Vector3, yaw = 0, parent: THREE.Object3D = scene, interactionId?: string) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#33413d', side: THREE.DoubleSide }));
    plane.position.copy(position); plane.rotation.y = yaw; parent.add(plane);
    if (interactionId) plane.userData.interactionId = interactionId;
    const texture = new THREE.TextureLoader().load(image.src, loaded => {
      if (disposed) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      const imageRatio = loaded.image.width / loaded.image.height, planeRatio = w / h;
      if (imageRatio > planeRatio) { loaded.repeat.x = planeRatio / imageRatio; loaded.offset.x = (1 - loaded.repeat.x) / 2; }
      else { loaded.repeat.y = imageRatio / planeRatio; loaded.offset.y = (1 - loaded.repeat.y) / 2; }
      plane.material.dispose(); plane.material = new THREE.MeshBasicMaterial({ map: loaded, side: THREE.DoubleSide });
    }, undefined, () => { /* The procedural panel remains when a photo fails. */ });
    textures.push(texture); return plane;
  }
  function portal(position: THREE.Vector3, color: string, interaction: SurfaceInteraction) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, .07, 12, 70), new THREE.MeshBasicMaterial({ color }));
    ring.position.copy(position); ring.userData.interactionId = interaction.id; scene.add(ring);
    sign('BACK TO THE CITY', 'LOOK • E TO RETURN', 3.2, .8, color, position.clone().add(new THREE.Vector3(0, 2.4, 0)), 0, scene, interaction);
  }
  function tree(x: number, z: number, scale = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.25 * scale, .4 * scale, 5.5 * scale, 10), material('#665448')); trunk.position.set(x, 2.75 * scale, z); scene.add(trunk);
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry((2.8 + i * .25) * scale, 1), material(['#536847', '#617751', '#495f42'][i]));
      crown.position.set(x + Math.sin(i * 2) * 1.2 * scale, (6 + i * .5) * scale, z + Math.cos(i * 2) * 1.2 * scale); scene.add(crown);
    }
    obstacles.push({ minX: x - .45, maxX: x + .45, minZ: z - .45, maxZ: z + .45 });
  }
  return { box, material, sign, photo, portal, tree, obstacles,
    ownTexture(canvas: HTMLCanvasElement) { const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture); return texture; },
    optimize() {
      scene.updateMatrixWorld(true);
      const groups = new Map<THREE.Material, THREE.Mesh[]>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && !object.userData.interactionId) {
          const list = groups.get(object.material) ?? []; list.push(object); groups.set(object.material, list);
        }
      });
      for (const [mat, meshes] of groups) {
        if (meshes.length < 2) continue;
        const parts = meshes.map(mesh => {
          let geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
          if (geometry.index) { const flat = geometry.toNonIndexed(); geometry.dispose(); geometry = flat; }
          return geometry;
        });
        const merged = mergeGeometries(parts, false); parts.forEach(part => part.dispose());
        if (merged) { meshes.forEach(mesh => { mesh.removeFromParent(); mesh.geometry.dispose(); }); scene.add(new THREE.Mesh(merged, mat)); }
      }
    },
    dispose() {
      disposed = true;
      const seen = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry.dispose();
          for (const mat of Array.isArray(object.material) ? object.material : [object.material]) if (!seen.has(mat)) { seen.add(mat); mat.dispose(); }
        }
      });
      materials.forEach(mat => { if (!seen.has(mat)) mat.dispose(); }); textures.forEach(texture => texture.dispose());
    },
  };
}

export function makeVenueScene(place: Place): SurfaceScene {
  const config = rooms.find(room => room.placeId === place.id)!;
  const forum = place.id === 'uva-data-science';
  const hall = place.id === 'kardinal-hall';
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0c141b, .012);
  scene.add(new THREE.HemisphereLight(0xd1e8df, 0x3f4732, 2.8));
  const t = tools(scene);
  const light = new THREE.PointLight(place.color, 65, 45, 1.5); light.position.set(5, 7, -8); scene.add(light);
  const warm = new THREE.PointLight(0xffdab0, 160, 45, 1.5); warm.position.set(-7, 5, 8); scene.add(warm);
  t.box(38, .5, 36, 0, -.3, 0, '#293d38');
  scene.add(new THREE.GridHelper(38, 38, 0x749965, 0x3a5047));
  for (const x of [-17, 17]) for (const z of [-15, -2]) {
    t.box(.6, 9, .6, x, 4.5, z, '#3c5049', true);
    t.box(.08, 8, .08, x + .35, 4.5, z + .35, place.color);
  }
  for (const z of [-15, -2]) t.box(34, .4, .5, 0, 9, z, '#3c5049');
  t.box(34, 9, .5, 0, 4.5, -16, '#1c2b30');
  for (const x of [-17, 17]) {
    t.box(.4, 9, 34, x, 4.5, 0, '#1d302e');
    for (const z of [-8, 8]) t.box(.12, 3.5, 6, x + (x < 0 ? .25 : -.25), 4.8, z, '#3d5558');
  }
  t.box(34, .3, 34, 0, 9.1, 0, '#223632');
  for (const z of [-9, 0, 9]) {
    t.box(14, .08, .15, 0, 8.85, z, '#d2d4b1');
    const pendant = new THREE.Mesh(new THREE.CylinderGeometry(.55, .8, .35, 16), t.material('#c1b69b')); pendant.position.set(0, 6.7, z); scene.add(pendant);
    t.box(.04, 2.1, .04, 0, 7.85, z, '#48554a');
  }
  t.sign(config.sign, config.subtitle, 10, 3.7, place.color, new THREE.Vector3(-6, 6.4, -15.7));
  t.sign(forum ? 'beCamp' : 'CvAIEx', forum ? '20 YEARS OF SHOWING UP WITH IDEAS' : 'LOCAL ROOTS. LIMITLESS POSSIBILITIES.', 8, 2.8, place.color, new THREE.Vector3(7, 6.5, -15.7));
  if (forum) {
    t.box(21, .65, 5, 1, .325, -10, '#55586b', true);
    t.box(1.3, 1.15, .9, 4, 1.225, -9, '#858196', true);
    for (const z of [0, 5, 10]) for (const x of [-5, -1, 3, 7]) {
      t.box(.7, .12, .7, x, .45, z, '#7a708e', true);
      t.box(.7, .7, .12, x, .75, z + .3, '#7a708e');
      t.box(.15, .4, .5, x, .2, z, '#343b4a');
    }
  } else if (hall) for (const z of [1, 8]) {
    t.box(11, .12, 2, 2, .85, z, '#968069', true);
    for (const side of [-1, 1]) { t.box(11, .18, .7, 2, .45, z + side * 1.65, '#836a4c', true); for (const x of [-2.5, 6.5]) t.box(.15, .4, .6, x, .2, z + side * 1.65, '#404739'); }
    for (const x of [-2.5, 6.5]) t.box(.2, .8, 1.5, x, .4, z, '#414837');
  } else for (const z of [1, 8]) {
    t.box(11, .12, 2, 2, .85, z, '#8b9271', true);
    for (const x of [-2.5, 6.5]) t.box(.2, .8, 1.5, x, .4, z, '#364640');
    for (const x of [-2, 2, 6]) for (const side of [-1, 1]) {
      t.box(.7, .12, .7, x, .45, z + side * 1.8, '#697b52', true);
      t.box(.7, .7, .12, x, .75, z + side * 2.1, '#697b52');
      t.box(.2, .4, .5, x, .2, z + side * 1.8, '#34423d');
    }
    for (const x of [-1, 3, 6]) { t.box(.8, .5, .06, x, 1.15, z, '#17282c'); t.box(.7, .4, .02, x, 1.15, z + .045, '#80b867'); }
  }
  const interactions: SurfaceInteraction[] = [
    { id: 'event', title: forum ? 'beCamp 2026 exhibit' : hall ? 'First Wednesdays exhibit' : 'AI Design Bake-Off exhibit', kind: 'event', eventId: config.eventId, position: new THREE.Vector3(-10, 2.1, -15.5) },
    { id: 'community', title: 'Meet the community', kind: 'community', position: new THREE.Vector3(-16, 2.1, 4) },
    { id: 'build', title: forum ? 'How an unconference works' : hall ? 'The conversation corner' : 'The build corner', kind: 'build', position: new THREE.Vector3(15.8, 2.1, 2) },
    { id: 'exit', title: 'Return to the city', kind: 'exit', position: new THREE.Vector3(0, 1.9, 16) },
  ];
  t.sign(forum ? 'PITCH • VOTE • EXPLORE' : hall ? 'FIRST WEDNESDAYS' : 'THE AI DESIGN BAKE-OFF', 'DISCOVER THE EVENT • E', 7, 2.5, place.color, interactions[0].position, 0, scene, interactions[0]);
  t.sign('GOOD COMPANY', 'MEET THE EXPLORERS • E', 5, 2, place.color, interactions[1].position, Math.PI / 2, scene, interactions[1]);
  t.sign(forum ? 'YOUR IDEAS. OUR AGENDA.' : hall ? 'START A CONVERSATION' : 'BUILD SOMETHING', 'TAKE A CLOSER LOOK • E', 5, 2, place.color, interactions[2].position, -Math.PI / 2, scene, interactions[2]);
  t.portal(interactions[3].position, place.color, interactions[3]);
  for (const x of [-13, 13]) {
    t.box(1, 1, 1, x, .5, -7, '#414b3f', true);
    t.tree(x, -7, .4);
  }
  t.optimize();
  return { scene, obstacles: t.obstacles, interactions, bounds: { minX: -16, maxX: 16, minZ: -15, maxZ: 16 }, spawn: new THREE.Vector3(forum ? 0 : -7, 1.7, 13), overview: new THREE.Vector3(14, 7.5, 15), overviewTarget: new THREE.Vector3(0, 3, -4), dispose: t.dispose };
}

export function makeMallScene(catalog: StorefrontCatalog): SurfaceScene {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x122025, .005);
  scene.add(new THREE.HemisphereLight(0xe2ead8, 0x60523b, 3.4));
  const moonlight = new THREE.DirectionalLight(0xc2d8d8, 2.3); moonlight.position.set(-30, 50, 10); scene.add(moonlight);
  const t = tools(scene);
  const length = catalog.district.length;
  const layout = mallLayout(catalog);
  t.box(layout.width + 40, .6, layout.end + 60, 0, -.4, -layout.end / 2, '#23312e');
  const paving = document.createElement('canvas'); paving.width = 512; paving.height = 512;
  const ctx = paving.getContext('2d')!; ctx.fillStyle = '#453b31'; ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let col = -1; col < 9; col++) {
    ctx.fillStyle = ['#80614c', '#775a48', '#8a6952', '#6e5545'][(row * 3 + col + 8) % 4];
    ctx.fillRect(col * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
  }
  const brickTexture = new THREE.CanvasTexture(paving); brickTexture.colorSpace = THREE.SRGBColorSpace; brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping; brickTexture.repeat.set(4, length / 5);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(layout.width, layout.end + 35), new THREE.MeshStandardMaterial({ map: brickTexture, roughness: .95 })); path.rotation.x = -Math.PI / 2; path.position.set(0, -.03, -layout.end / 2); scene.add(path);
  const interactions: SurfaceInteraction[] = [];
  const businesses = new Map(catalog.businesses.map(b => [b.id, b]));
  const media = new Map(catalog.media.map(image => [image.id, image]));
  function storefront(slot: StorefrontSlot, filler = false) {
    const business = slot.businessId ? businesses.get(slot.businessId) : undefined;
    const tenant = business?.operatingStatus === 'closed' ? undefined : business;
    const north = slot.side === 'north', x = north ? -layout.halfWidth : layout.halfWidth;
    const group = new THREE.Group(); group.position.set(x, 0, -slot.along); group.rotation.y = north ? Math.PI / 2 : -Math.PI / 2; scene.add(group);
    t.box(slot.width, slot.height, 8, 0, slot.height / 2, -4, slot.appearance.brick, false, group);
    for (const y of [0, 3.6, slot.height]) t.box(slot.width + .1, .22, .3, 0, y + .1, .12, slot.appearance.trim, false, group);
    for (const localX of [-slot.width * .3, slot.width * .3]) {
      t.box(slot.width * .3, 2.4, .15, localX, 1.8, .2, '#273f3e', false, group);
      for (const side of [-1, 1]) t.box(.1, 2.5, .2, localX + side * slot.width * .15, 1.8, .3, slot.appearance.trim, false, group);
      for (let y = 6.8; y < slot.height - 1; y += 3) { t.box(1.3, 1.8, .2, localX, y, .15, '#3d5351', false, group); t.box(1.6, .15, .3, localX, y - .9, .25, slot.appearance.trim, false, group); }
    }
    t.box(1.25, 2.7, .2, 0, 1.35, .3, '#263c36', false, group);
    t.box(.08, 2.7, .22, .67, 1.35, .4, slot.appearance.trim, false, group);
    if (slot.appearance.awning) { const awning = t.box(slot.width * .9, .16, 1.6, 0, 3.1, .8, slot.appearance.accent, false, group); awning.rotation.x = -.12; }
    const interaction: SurfaceInteraction | undefined = tenant ? { id: `slot-${slot.id}`, title: tenant.name, kind: 'business', businessId: tenant.id, slotId: slot.id, position: new THREE.Vector3(north ? -layout.halfWidth + 1.5 : layout.halfWidth - 1.5, 1.7, -slot.along) } : undefined;
    if (interaction) interactions.push(interaction);
    const title = filler ? '' : tenant?.name.toUpperCase() ?? 'THE NEXT CHAPTER';
    if (title) t.sign(title, tenant?.category.toUpperCase() ?? slot.address, slot.width * .85, 1.8, slot.appearance.accent, new THREE.Vector3(0, 4.4, slot.appearance.facadeImageId ? .65 : .35), 0, group, interaction);
    if (tenant?.photoId) { const image = media.get(tenant.photoId); if (image) t.photo(image, 2.2, 2.8, new THREE.Vector3(slot.width * .3, 1.8, .42), 0, group, interaction?.id); }
    const appearance = slot.appearance;
    if (appearance.facadeImageId) { const image = media.get(appearance.facadeImageId); if (image) t.photo(image, slot.width, slot.height, new THREE.Vector3(0, slot.height / 2, .5), 0, group, interaction?.id); }
    if (interaction) t.sign('DISCOVER', 'LOOK • E', 1.2, .55, slot.appearance.accent, new THREE.Vector3(-1.2, 1.65, slot.appearance.facadeImageId ? .7 : .5), 0, group, interaction);
  }
  catalog.slots.forEach(slot => storefront(slot));
  for (const side of ['north', 'south'] as const) for (let along = 0; along < length; along += 14) {
    if (catalog.slots.some(slot => slot.side === side && Math.abs(slot.along - along) < slot.width / 2 + 8)) continue;
    storefront({ id: `filler-${side}-${along}`, address: '', side, along, width: 12, height: 8 + (along % 3) * 2, businessId: null, appearance: { brick: side === 'north' ? '#634f41' : '#6b574a', trim: '#aeaa90', accent: '#a5b590', awning: false } }, true);
  }
  for (let along = 5; along < length; along += layout.treeSpacing) for (const side of [-1, 1]) {
    t.tree(side * layout.treeOffset, -along);
    t.box(2.8, .2, .7, side * (layout.treeOffset + 1.6), .55, -along - 7, '#827157', true);
    t.box(2.8, .6, .12, side * (layout.treeOffset + 1.6), .9, -along - 7.3, '#827157');
    const lampX = side * (layout.treeOffset + 3.2);
    t.box(.14, 4.7, .14, lampX, 2.35, -along + 6, '#444e45', true);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf3d7a2 })); lamp.position.set(lampX, 4.7, -along + 6); scene.add(lamp);
    if (Math.round((along - 5) / layout.treeSpacing) % 2 === 0) {
      const light = new THREE.PointLight(0xf3d7a2, 12, 18, 1.5); light.position.copy(lamp.position); scene.add(light);
    }
  }
  for (const along of [35, 130, 180]) {
    const caféX = -layout.halfWidth + 2.5;
    const table = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .12, 20), t.material('#93907a')); table.position.set(caféX, .8, -along); scene.add(table);
    t.obstacles.push({ minX: caféX - .8, maxX: caféX + .8, minZ: -along - .8, maxZ: -along + .8 });
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.8, .5, 8), t.material('#707d60')); umbrella.position.set(caféX, 2.8, -along); scene.add(umbrella);
    t.box(.08, 2.8, .08, caféX, 1.4, -along, '#645a47');
  }
  const district: SurfaceInteraction = { id: 'district', title: 'The Downtown Mall story', kind: 'district', position: new THREE.Vector3(-7.5, 1.8, 1) };
  interactions.push(district);
  t.sign('THE DOWNTOWN MALL', 'MAIN STREET. MADE FOR PEOPLE.', 5, 1.8, '#b6f36a', district.position, 0, scene, district);
  t.box(.15, 1.2, .15, -9.5, .6, 1, '#5a6857', true); t.box(.15, 1.2, .15, -5.5, .6, 1, '#5a6857', true);
  for (const landmark of catalog.landmarks ?? []) {
    const interaction: SurfaceInteraction = { id: `landmark-${landmark.id}`, title: landmark.name, kind: 'landmark', landmarkId: landmark.id, position: new THREE.Vector3(landmark.x, 1.7, -landmark.along) };
    interactions.push(interaction);
    if (landmark.kind === 'pavilion') {
      const pavilion = makePavilionGroup(); pavilion.position.set(landmark.x, 0, -landmark.along); scene.add(pavilion);
      t.obstacles.push({ minX: landmark.x - 13.5, maxX: landmark.x + 13.5, minZ: -landmark.along - 11, maxZ: -landmark.along - 3 });
      interaction.position.set(landmark.x - 10, 1.7, -landmark.along + 20);
      t.sign('TING PAVILION', 'THE STAGE HAS STORIES • E', 7, 2.3, '#d4e1b8', new THREE.Vector3(landmark.x - 10, 2.5, -landmark.along + 20.5), 0, scene, interaction);
    } else {
      t.box(.55, 2.8, 16.3, landmark.x, 1.4, -landmark.along, '#313b37', true);
      const texture = t.ownTexture(chalkArtwork(catalog));
      for (const side of [-1, 1]) {
        const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.6), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
        board.rotation.y = side * Math.PI / 2; board.position.set(landmark.x + side * .3, 1.45, -landmark.along); board.userData.interactionId = interaction.id; scene.add(board);
      }
      interaction.position.x = landmark.x - .4;
    }
  }
  const exit: SurfaceInteraction = { id: 'exit', title: 'Return to the city', kind: 'exit', position: new THREE.Vector3(0, 1.9, 18) }; interactions.push(exit); t.portal(exit.position, '#b6f36a', exit);
  t.optimize();
  return { scene, obstacles: t.obstacles, interactions, bounds: { minX: -layout.halfWidth + .7, maxX: layout.halfWidth - .7, minZ: -layout.end, maxZ: 19 }, spawn: new THREE.Vector3(-layout.walkLane, 1.7, 12), overview: new THREE.Vector3(30, 23, 30), overviewTarget: new THREE.Vector3(0, 0, -50), dispose() { brickTexture.dispose(); t.dispose(); } };
}

export function makePavilionGroup() {
  const group = new THREE.Group();
  const positions: number[] = [], uv: number[] = [], index: number[] = [];
  const columns = 32, rows = 16;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const u = col / columns * 2 - 1, v = row / rows * 2 - 1;
    positions.push(u * 21, 7 + 3.5 * (1 - u * u) + .8 * Math.cos(v * Math.PI / 2), v * 13);
    uv.push(col / columns, row / rows);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, b = a + columns + 1; index.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const roof = new THREE.BufferGeometry(); roof.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); roof.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); roof.setIndex(index); roof.computeVertexNormals();
  group.add(new THREE.Mesh(roof, new THREE.MeshStandardMaterial({ color: 0xe4e9df, emissive: 0x7d8c7b, emissiveIntensity: .5, side: THREE.DoubleSide, roughness: .8 })));
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa99e, metalness: .65, roughness: .5 });
  for (const x of [-20, 20]) for (const z of [-13, 13]) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(.18, .25, 12, 10), steel); mast.position.set(x, 6, z); group.add(mast); }
  for (const z of [-13, 13]) {
    const arch = new THREE.CatmullRomCurve3([new THREE.Vector3(-21, 6, z), new THREE.Vector3(-12, 10, z), new THREE.Vector3(0, 12, z), new THREE.Vector3(12, 10, z), new THREE.Vector3(21, 6, z)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(arch, 40, .13, 8, false), steel));
  }
  const stage = new THREE.Mesh(new THREE.BoxGeometry(27, .7, 8), new THREE.MeshStandardMaterial({ color: 0x34473f })); stage.position.set(0, .35, -7); group.add(stage);
  const back = new THREE.Mesh(new THREE.BoxGeometry(27, 4.5, .3), new THREE.MeshStandardMaterial({ color: 0x172a26 })); back.position.set(0, 2.6, -11); group.add(back);
  for (const x of [-10, 10]) { const speaker = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, .9), new THREE.MeshStandardMaterial({ color: 0x162322 })); speaker.position.set(x, 1.7, -7); group.add(speaker); }
  return group;
}

function chalkArtwork(catalog: StorefrontCatalog) {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 400;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#14201d'; ctx.fillRect(0, 0, 2048, 400);
  let seed = 731;
  for (let i = 0; i < 1800; i++) { seed = seed * 16807 % 2147483647; const x = seed / 2147483647 * 2048; seed = seed * 16807 % 2147483647; ctx.fillStyle = '#eff4e409'; ctx.fillRect(x, seed / 2147483647 * 400, 2, 1); }
  const content = catalog.chalkboard;
  ctx.fillStyle = '#e8eddb'; ctx.font = '60px cursive'; ctx.fillText(content?.heading ?? 'AI Explorers', 55, 85);
  ctx.font = '27px cursive'; (content?.lines ?? []).forEach((line, i) => ctx.fillText(line, 60, 140 + i * 55));
  ctx.strokeStyle = '#d4e1bd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(625, 35); ctx.lineTo(625, 365); ctx.moveTo(1375, 35); ctx.lineTo(1375, 365); ctx.stroke();
  ctx.font = '32px cursive'; ctx.fillText('THIS STAGE HAS HEARD…', 680, 58);
  ctx.font = '24px cursive';
  (catalog.musicVenues?.find(v => v.id === 'ting-pavilion')?.performers ?? []).slice(0, 10).forEach((performer, i) => ctx.fillText(performer.name, 685, 93 + i * 28));
  ctx.fillStyle = '#e7b48a'; ctx.font = '64px cursive'; ctx.fillText(content?.cheer ?? 'Go Hoos!', 1450, 80);
  // Original collegiate motifs: books, stars, hills, and a generic classical portico.
  ctx.strokeStyle = '#9ebdd0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(1450, 185); ctx.lineTo(1540, 118); ctx.lineTo(1630, 185); ctx.closePath(); ctx.stroke();
  ctx.strokeRect(1460, 185, 160, 105);
  for (let x = 1475; x < 1610; x += 34) { ctx.beginPath(); ctx.moveTo(x, 188); ctx.lineTo(x, 287); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(1435, 300); ctx.lineTo(1640, 300); ctx.moveTo(1450, 320); ctx.lineTo(1770, 230); ctx.lineTo(1980, 320); ctx.stroke();
  ctx.strokeStyle = '#e7b48a'; for (let i = 0; i < 3; i++) ctx.strokeRect(1790 + i * 6, 130 + i * 31, 150, 25);
  ctx.fillStyle = '#e5e9d4'; ctx.font = '44px serif'; ctx.fillText('✧', 1740, 100); ctx.fillText('✦', 1950, 175);
  return canvas;
}
