import * as THREE from 'three';
import { community, events, type Place } from '../data/content';
import type { StorefrontCatalog, MallPhoto } from '../data/storefronts';
import { assertStorefrontCatalog } from './storefront-catalog.mjs';
import { moveWalker } from './walk-motion.mjs';
import { makeMallScene, makeVenueScene, type SurfaceInteraction } from './surface-scenes';
import { makeCelestialSky } from './sky';
import { lookWithKeys } from './look-controls.mjs';
import { mallLayout } from './mall-layout.mjs';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
  const element = document.createElement(tag); if (text) element.textContent = text; if (className) element.className = className; return element;
};
function link(text: string, url: string) {
  const anchor = node('a', text); anchor.href = url;
  if (url.startsWith('https:')) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
  return anchor;
}

export async function makeWalkthrough(container: HTMLElement, place: Place, onExit: () => void, isCurrent = () => true) {
  const mall = place.experience === 'outdoor';
  let catalog: StorefrontCatalog | undefined;
  async function loadCatalog() {
    const response = await fetch('/data/storefronts.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Storefront catalog could not load');
    return assertStorefrontCatalog(await response.json()) as StorefrontCatalog;
  }
  if (mall) catalog = await loadCatalog();
  if (!isCurrent()) throw new Error('Scene request was cancelled');
  let model = mall ? makeMallScene(catalog!) : makeVenueScene(place);
  const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', mall ? 'Walk along the Downtown Mall. WASD moves, arrow keys or mouse look around, E discovers.' : 'Walk inside the venue. WASD moves, arrow keys or mouse look around, E explores exhibits.');
  const camera = new THREE.PerspectiveCamera(62, 1, .1, 16000); camera.rotation.order = 'YXZ';
  const dialog = $<HTMLDialogElement>('room-dialog');
  const detail = $('surface-details');
  const directory = $('surface-directory');
  const prompt = $<HTMLButtonElement>('surface-interact');
  const info = $('surface-status');
  const modeButton = $<HTMLButtonElement>('surface-mode-button');
  const keys = new Set<string>();
  const abort = new AbortController();
  const signal = abort.signal;
  let walking = false, disposed = false;
  let yaw = 0, pitch = 0, velocity = new THREE.Vector3();
  let drag: { x: number; y: number; downX: number; downY: number } | undefined;
  let nearest: SurfaceInteraction | undefined;
  let sky: Awaited<ReturnType<typeof makeCelestialSky>> | undefined;
  let skyGeneration = 0;
  let lastTime = 0;
  function loadSky() {
    const generation = ++skyGeneration;
    makeCelestialSky(model.scene, renderer.getPixelRatio()).then(result => { if (disposed || generation !== skyGeneration) result.dispose(); else sky = result; }).catch(console.error);
  }
  loadSky();
  function status(message: string) { info.textContent = message; }
  function active() { return !disposed && dialog.open; }
  function release() { keys.clear(); velocity.set(0, 0, 0); drag = undefined; if (document.pointerLockElement === renderer.domElement) document.exitPointerLock(); }
  function hideDetail() { detail.hidden = true; release(); }
  function overview() { camera.position.copy(model.overview); camera.lookAt(model.overviewTarget); }
  function setWalking(value: boolean) {
    release(); hideDetail(); directory.hidden = true;
    nearest = undefined; prompt.hidden = true;
    walking = value; dialog.classList.toggle('is-walking', value);
    modeButton.textContent = value ? (mall ? 'Read the mall guide' : 'Read the exhibits') : (mall ? 'Walk the mall' : 'Walk inside');
    modeButton.setAttribute('aria-pressed', String(value));
    $('surface-hud').hidden = !value;
    $('surface-touch').hidden = !value || !matchMedia('(pointer: coarse)').matches;
    if (value) { camera.position.copy(model.spawn); yaw = 0; pitch = 0; camera.rotation.set(pitch, yaw, 0); renderer.domElement.focus({ preventScroll: true }); }
    else overview();
    status(value ? 'WASD to walk · arrows / mouse to look · E or click to discover' : 'Choose a walking view, or read the exhibits.');
  }
  function photo(image: MallPhoto) {
    const figure = node('figure', undefined, 'surface-photo');
    const img = node('img'); img.src = image.src; img.alt = image.alt; img.loading = 'lazy';
    const caption = node('figcaption'); caption.append(node('span', `${image.capturedAt} · ${image.creator} · `), link(image.license, image.licenseUrl), node('span', ' · '), link('Photo source', image.source));
    figure.append(img, caption); return figure;
  }
  function musicHistory(id: string, body: HTMLElement) {
    const venue = catalog?.musicVenues?.find(venue => venue.id === id);
    if (!venue) return;
    const section = node('section'); section.dataset.musicVenue = venue.id;
    section.append(node('h3', venue.title), node('p', 'A curated, source-verified selection—not a ranking or the complete concert archive.'));
    const list = node('ul');
    for (const artist of venue.performers) {
      const item = node('li'); item.append(node('strong', artist.name), node('span', ` · ${artist.date} `), link('Source ↗', artist.source));
      if (artist.note) item.append(node('p', artist.note, 'small-muted')); list.append(item);
    }
    section.append(list, node('p', `Source-checked ${venue.verifiedAt}.`, 'small-muted')); body.append(section);
  }
  function showInteraction(item: SurfaceInteraction) {
    if (item.kind === 'exit') { release(); onExit(); return; }
    release(); directory.hidden = true;
    const body = $('surface-details-body'); body.replaceChildren();
    $('surface-details-title').textContent = item.title;
    detail.dataset.interaction = item.id;
    if (item.kind === 'event') {
      const event = events.find(event => event.id === item.eventId)!;
      body.append(node('span', event.displayDate, 'eyebrow'), node('h3', event.title), node('p', event.description));
      const list = node('ul'); event.schedule.forEach(line => list.append(node('li', line))); body.append(list);
      body.append(link('Read the full event →', `/events/${event.id}/`), link('Original Meetup listing ↗', event.source));
      if (event.registration) body.append(link('Register at be.camp ↗', event.registration));
    } else if (item.kind === 'community') {
      body.append(node('h3', community.name), node('p', community.mission), link('Join the conversation on Cville Slack ↗', community.slack), link('Find a meetup ↗', community.meetup));
    } else if (item.kind === 'build') {
      body.append(node('h3', place.id === 'uva-data-science' ? 'Pitch. Vote. Make it happen.' : place.id === 'kardinal-hall' ? 'No slides. Just conversation.' : 'A room for making things.'), node('p', place.id === 'uva-data-science' ? 'An unconference starts with the people in the room. Suggest a topic, vote together, then explore the sessions the community chooses. Bring a question, a demo, or a spark of curiosity.' : place.id === 'kardinal-hall' ? 'First Wednesdays is an informal gathering. Share what you’re working on, join a conversation, or meet someone new. Everyone is welcome regardless of profession.' : 'Bring a laptop, pick a tool, build something together, and share what you learned. The AI Design Bake-Off turned this very website into a shared design experiment.'), link('Explore the community’s activities →', '/about/'));
    } else if (item.kind === 'business') {
      const business = catalog?.businesses.find(b => b.id === item.businessId);
      if (!business) return;
      body.append(node('span', business.category.toUpperCase(), 'eyebrow'), node('h3', business.name), node('p', business.description), node('p', business.address, 'surface-address'));
      const image = catalog?.media.find(image => image.id === business.photoId); if (image) body.append(photo(image));
      body.append(link('Visit the official website ↗', business.website), link('Business details & sources →', `/mall/${business.id}/`), node('p', `Source-checked ${business.verifiedAt}. Consult the business for current hours and availability.`, 'small-muted'));
      musicHistory(business.id, body);
    } else if (item.kind === 'landmark' && catalog) {
      const landmark = catalog.landmarks?.find(landmark => landmark.id === item.landmarkId);
      if (!landmark) return;
      body.append(node('h3', landmark.name), node('p', landmark.description));
      if (landmark.kind === 'chalkboard' && catalog.chalkboard) {
        body.append(node('h3', catalog.chalkboard.heading));
        catalog.chalkboard.lines.forEach(line => body.append(node('p', line)));
        body.append(node('h3', catalog.chalkboard.cheer), node('p', catalog.chalkboard.artNote), node('p', 'A static community chalk composition for now. Live drawing can become a future layer.', 'small-muted'));
      }
      musicHistory(landmark.kind === 'chalkboard' ? 'ting-pavilion' : landmark.id, body);
      body.append(link('Reference & history source ↗', landmark.source), link('Mall stories and concert-history sources →', '/mall/'));
    } else if (item.kind === 'district' && catalog) {
      body.append(node('p', catalog.district.description));
      for (const fact of catalog.district.facts) body.append(node('h3', fact.title), node('p', fact.text), link('Source ↗', fact.source));
      for (const image of catalog.media.filter(image => image.id.startsWith('mall-'))) body.append(photo(image));
      body.append(link('Browse all catalog stops & photo credits →', '/mall/'), node('p', catalog.district.layoutNote, 'small-muted'));
    }
    detail.hidden = false; $('surface-details-close').focus({ preventScroll: true });
  }
  function jump(id: string) {
    if (!mall || !catalog) { const item = model.interactions.find(item => item.id === id); if (item) showInteraction(item); return; }
    const slot = catalog.slots.find(slot => slot.businessId === id);
    if (!slot) return;
    if (!walking) setWalking(true);
    hideDetail(); directory.hidden = true;
    const layout = mallLayout(catalog);
    camera.position.set((slot.side === 'north' ? -1 : 1) * Math.max(layout.treeOffset + 3.5, layout.halfWidth - 11.5), 1.7, -slot.along);
    yaw = slot.side === 'north' ? Math.PI / 2 : -Math.PI / 2; pitch = 0;
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld();
    nearest = model.interactions.find(item => item.slotId === slot.id);
    prompt.hidden = !nearest;
    if (nearest) prompt.textContent = `E · ${nearest.title}`;
    status(`At ${catalog.businesses.find(b => b.id === id)?.name ?? slot.address}. Look toward the storefront and press E.`);
    history.replaceState(null, '', `?place=downtown-mall&walk=1&business=${encodeURIComponent(id)}`);
  }
  function jumpLandmark(id: string) {
    const landmark = catalog?.landmarks?.find(landmark => landmark.id === id);
    const target = model.interactions.find(item => item.landmarkId === id);
    if (!landmark || !target || !catalog) return;
    if (!walking) setWalking(true);
    hideDetail(); directory.hidden = true;
    camera.position.set(-mallLayout(catalog).walkLane, 1.7, -landmark.along + (landmark.kind === 'pavilion' ? 32 : 0));
    const direction = target.position.clone().sub(camera.position).normalize();
    yaw = Math.atan2(-direction.x, -direction.z); pitch = 0; camera.rotation.set(pitch, yaw, 0); camera.updateMatrixWorld();
    nearest = target; prompt.hidden = false; prompt.textContent = `E · ${target.title}`;
    status(`At ${landmark.name}. Arrow keys look around; E opens its story.`);
    history.replaceState(null, '', `?place=downtown-mall&walk=1&landmark=${encodeURIComponent(id)}`);
  }
  function directoryContents() {
    const list = $('surface-directory-list'); list.replaceChildren();
    $('surface-directory-title').textContent = mall ? 'Along Main Street' : 'In this room';
    if (mall && catalog) {
      for (const slot of catalog.slots) {
        const business = catalog.businesses.find(b => b.id === slot.businessId);
        if (!business || business.operatingStatus === 'closed') continue;
        const button = node('button', undefined, 'surface-stop'); button.type = 'button'; button.dataset.business = business.id;
        button.append(node('strong', business.name), node('small', business.category)); button.onclick = () => jump(business.id); list.append(button);
      }
      const story = node('button', 'The mall story & photographs', 'surface-stop'); story.type = 'button'; story.onclick = () => showInteraction(model.interactions.find(i => i.kind === 'district')!); list.append(story);
      for (const landmark of catalog.landmarks ?? []) { const button = node('button', landmark.name, 'surface-stop'); button.type = 'button'; button.dataset.landmark = landmark.id; button.onclick = () => jumpLandmark(landmark.id); list.append(button); }
      $('surface-revision').textContent = `Catalog revision ${catalog.revision} · ${catalog.updatedAt.slice(0, 10)}`;
    } else {
      for (const item of model.interactions.filter(i => i.kind !== 'exit')) { const button = node('button', item.title, 'surface-stop'); button.type = 'button'; button.dataset.exhibit = item.id; button.onclick = () => showInteraction(item); list.append(button); }
      $('surface-revision').textContent = 'Choose an exhibit or discover it as you walk.';
    }
  }
  $('surface-details-close').addEventListener('click', hideDetail, { signal });
  $('surface-directory-close').addEventListener('click', () => { directory.hidden = true; }, { signal });
  modeButton.addEventListener('click', () => setWalking(!walking), { signal });
  $('surface-directory-button').textContent = mall ? 'Places' : 'Exhibits';
  $('surface-directory-button').addEventListener('click', () => { release(); detail.hidden = true; directory.hidden = !directory.hidden; }, { signal });
  $('surface-reset-button').addEventListener('click', () => setWalking(true), { signal });
  prompt.addEventListener('click', () => { if (nearest) showInteraction(nearest); }, { signal });
  $('surface-reload-button').hidden = !mall;
  $('surface-reload-button').addEventListener('click', async () => {
    const button = $<HTMLButtonElement>('surface-reload-button'); button.disabled = true;
    release();
    try {
      const fresh = await loadCatalog();
      if (disposed) return;
      const replacement = makeMallScene(fresh);
      sky?.dispose(); sky = undefined; model.dispose(); model = replacement; catalog = fresh;
      nearest = undefined; prompt.hidden = true;
      loadSky();
      hideDetail(); directoryContents();
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, model.bounds.minX + .35, model.bounds.maxX - .35);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, model.bounds.minZ + .35, model.bounds.maxZ - .35);
      status(`Storefronts refreshed · catalog revision ${fresh.revision}.`);
    } catch { status('The new storefront catalog could not load or is invalid. Keeping the current streetscape.'); }
    finally { button.disabled = false; }
  }, { signal });
  const movement = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  document.addEventListener('keydown', event => {
    if (!active() || !walking || (event.target as HTMLElement).matches('input, textarea')) return;
    if (event.key === 'Escape') {
      if (!detail.hidden || !directory.hidden || document.pointerLockElement === renderer.domElement) { event.preventDefault(); hideDetail(); directory.hidden = true; release(); }
      return;
    }
    if (!detail.hidden || !directory.hidden) return;
    if (movement.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'KeyE' && nearest) { event.preventDefault(); showInteraction(nearest); }
  }, { signal });
  document.addEventListener('keyup', event => keys.delete(event.code), { signal });
  window.addEventListener('blur', release, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); }, { signal });
  renderer.domElement.addEventListener('pointerdown', event => {
    if (!active() || !walking || !detail.hidden || !directory.hidden) return;
    renderer.domElement.focus({ preventScroll: true });
    drag = { x: event.clientX, y: event.clientY, downX: event.clientX, downY: event.clientY };
    renderer.domElement.setPointerCapture(event.pointerId);
  }, { signal });
  const ray = new THREE.Raycaster();
  renderer.domElement.addEventListener('pointerup', event => {
    if (drag && Math.hypot(event.clientX - drag.downX, event.clientY - drag.downY) < 5) {
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects(model.scene.children, true).find(hit => hit.object.userData.interactionId && hit.distance < 18);
      const item = model.interactions.find(item => item.id === hit?.object.userData.interactionId); if (item) showInteraction(item);
    }
    drag = undefined;
  }, { signal });
  renderer.domElement.addEventListener('pointercancel', () => { drag = undefined; }, { signal });
  document.addEventListener('pointermove', event => {
    if (!active() || !walking || !detail.hidden || !directory.hidden) return;
    if (document.pointerLockElement === renderer.domElement || drag) {
      const dx = drag ? event.clientX - drag.x : event.movementX, dy = drag ? event.clientY - drag.y : event.movementY;
      yaw -= dx * .003; pitch = THREE.MathUtils.clamp(pitch - dy * .003, -1.3, 1.3); camera.rotation.set(pitch, yaw, 0);
      if (drag) { drag.x = event.clientX; drag.y = event.clientY; }
    }
  }, { signal });
  $('surface-capture-button').addEventListener('click', async () => {
    if (!walking) setWalking(true);
    try { await renderer.domElement.requestPointerLock(); }
    catch { status('Mouse capture is unavailable. Drag to look around instead.'); }
  }, { signal });
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== renderer.domElement) keys.clear(); }, { signal });
  $('surface-capture-button').hidden = matchMedia('(pointer: coarse)').matches;
  document.querySelectorAll<HTMLButtonElement>('[data-walk-key]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(button.dataset.walkKey!); button.setPointerCapture(event.pointerId); }, { signal });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => keys.delete(button.dataset.walkKey!), { signal });
  });
  directoryContents(); setWalking(mall);
  const wish = new THREE.Vector3(), forward = new THREE.Vector3(), toward = new THREE.Vector3();
  return {
    resize() { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    jump, jumpLandmark, setWalking,
    pause() { release(); lastTime = 0; },
    render(now: number, reduced: boolean) {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0; lastTime = now;
      if (walking) {
        wish.set(0, 0, 0);
        if (detail.hidden && directory.hidden) {
          if (keys.has('KeyW')) wish.z -= 1;
          if (keys.has('KeyS')) wish.z += 1;
          if (keys.has('KeyA')) wish.x -= 1;
          if (keys.has('KeyD')) wish.x += 1;
          const look = lookWithKeys(yaw, pitch, keys, dt); yaw = look.yaw; pitch = look.pitch;
          camera.rotation.set(pitch, yaw, 0);
        }
        wish.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).multiplyScalar(keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6 : 3.2);
        velocity.lerp(wish, 1 - Math.exp(-dt * 10));
        const next = moveWalker(camera.position, { x: velocity.x * dt, z: velocity.z * dt }, model.bounds, model.obstacles);
        camera.position.set(next.x, 1.7, next.z);
        camera.getWorldDirection(forward); nearest = undefined; let best = -Infinity;
        for (const item of model.interactions) {
          toward.copy(item.position).sub(camera.position); const distance = toward.length();
          const alignment = distance > .001 ? toward.normalize().dot(forward) : 1;
          const score = alignment * 3 - distance / 14;
          if (distance < 14 && alignment > .25 && score > best) { nearest = item; best = score; }
        }
        prompt.hidden = !nearest || !detail.hidden || !directory.hidden;
        if (nearest) prompt.textContent = `E · ${nearest.title}`;
      } else if (!reduced) { camera.position.x = model.overview.x + Math.sin(now * .00006) * 1.2; camera.lookAt(model.overviewTarget); }
      renderer.domElement.dataset.position = `${camera.position.x.toFixed(3)},${camera.position.z.toFixed(3)}`;
      renderer.domElement.dataset.heading = THREE.MathUtils.radToDeg(yaw).toFixed(1);
      renderer.domElement.dataset.pitch = THREE.MathUtils.radToDeg(pitch).toFixed(1);
      sky?.update(camera); renderer.render(model.scene, camera);
    },
    dispose() { disposed = true; abort.abort(); release(); sky?.dispose(); model.dispose(); renderer.dispose(); renderer.domElement.remove(); detail.hidden = true; directory.hidden = true; dialog.classList.remove('is-walking'); },
  };
}
