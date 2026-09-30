import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { places, type Place } from '../data/content';
import { project, searchPlaces } from './navigation.mjs';
import { cityRegion } from '../data/regions.mjs';
import { makeCelestialSky } from './sky';
import { makeWalkthrough } from './walkthrough';
import { storefrontCatalog } from '../data/storefronts';
import { lookWithKeys } from './look-controls.mjs';
import { makePavilionGroup } from './surface-scenes';
import { communityTour } from '../data/tour';
import { createTourState } from './tour-state.mjs';

type City = {
  metadata: { buildings: number; sourcedHeights: number };
  buildings: { id: number; h: number; estimated: boolean; rings: number[][][] }[];
  roads: number[][][];
};
type Recognition = {
  lang: string; interimResults: boolean; start(): void; stop(): void;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export async function initExplorer() {
  const world = $('world');
  const status = $('scene-status');
  const explorer = document.querySelector<HTMLElement>('.explorer')!;
  const roomDialog = $<HTMLDialogElement>('room-dialog');
  const helpDialog = $<HTMLDialogElement>('help-dialog');
  const panel = $('destination-panel');
  const results = $('search-results');
  const input = $<HTMLInputElement>('destination-search');
  const keys = new Set<string>();
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activePlace: Place | undefined;
  let mode: 'overview' | 'explore' | 'flight' = 'overview';
  let recognition: Recognition | undefined;
  let room: Awaited<ReturnType<typeof makeWalkthrough>> | undefined;
  let roomPlaceId: string | undefined;
  let roomRequest = 0;
  let pendingBusinessId: string | undefined;
  let pendingLandmarkId: string | undefined;
  let sky: Awaited<ReturnType<typeof makeCelestialSky>> | undefined;
  let flightYaw = 0, flightPitch = 0;
  let drag: { x: number; y: number } | null = null;
  let travel: { from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3; started: number; duration: number } | null = null;
  const tour = createTourState(communityTour.stops.length);
  let tourFlight: { curve: THREE.CatmullRomCurve3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; elapsed: number; duration: number } | undefined;
  const announce = (text: string) => { status.textContent = text; status.dataset.kind = 'message'; };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
  } catch {
    announce('3D is unavailable on this device. Browse our places and events instead.');
    $('explore-button').textContent = 'Browse the places →';
    $('explore-button').onclick = () => { location.href = '/places/'; };
    document.querySelectorAll<HTMLButtonElement>('[data-destination]').forEach(button => {
      button.onclick = () => { location.href = `/places/${button.dataset.destination}/`; };
    });
    $('search-form').onsubmit = event => {
      event.preventDefault();
      const businesses = searchPlaces(input.value, storefrontCatalog.businesses);
      if (input.value.trim() && businesses.length === 1) { location.href = `/mall/${businesses[0].id}/`; return; }
      const matches = searchPlaces(input.value, places);
      location.href = matches.length === 1 ? `/places/${matches[0].id}/` : '/places/';
    };
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.4 : 1.8));
  renderer.setClearColor(0x0c131b, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  world.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c171e, .000105);
  const skyScene = new THREE.Scene();
  const skyCamera = new THREE.PerspectiveCamera(60, 1, 1, 16000);
  skyCamera.rotation.order = 'YXZ';
  renderer.autoClear = false;
  const camera = new THREE.PerspectiveCamera(43, 1, 1, 16000);
  const overviewPosition = new THREE.Vector3(2100, 1950, 2500);
  const overviewTarget = new THREE.Vector3(100, 0, 120);
  camera.position.copy(overviewPosition);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(overviewTarget);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.maxPolarAngle = Math.PI / 2.12;
  controls.minDistance = 60;
  controls.maxDistance = 6800;
  controls.enablePan = true;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = .07;
  scene.add(new THREE.HemisphereLight(0xe0f4e3, 0x172631, 2.8));
  const sun = new THREE.DirectionalLight(0xdcf9b8, 3);
  sun.position.set(-1400, 2400, 1100);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x7c9fc2, 1.7);
  fill.position.set(1600, 1300, -900);
  scene.add(fill);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4300, 128), new THREE.MeshStandardMaterial({ color: 0x101d22, roughness: 1, metalness: .15 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  scene.add(ground);
  const grid = new THREE.GridHelper(8500, 85, 0x2b4646, 0x1a2d32);
  grid.position.y = -.4;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = .42;
  scene.add(grid);
  // Catalog loading is independent from city geometry; either can fail gracefully.
  makeCelestialSky(skyScene, renderer.getPixelRatio()).then(result => {
    sky = result; sky.update(skyCamera); world.dataset.skyReady = 'true';
  }).catch(error => {
    console.error(error); world.dataset.skyReady = 'fallback';
  });
  for (const radius of [2400, 3300, 4250]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 2, 180), new THREE.MeshBasicMaterial({ color: 0x456459, transparent: true, opacity: .28, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .2; scene.add(ring);
  }

  const pins = places.map(place => {
    const [x, z] = project(place.coordinates);
    const marker = makeBeacon(place.color, place.room);
    marker.position.set(x, 0, z);
    scene.add(marker);
    const label = document.createElement('button');
    label.className = 'map-pin'; label.style.setProperty('--place-color', place.color);
    const dot = document.createElement('i'); const name = document.createElement('span'); name.textContent = place.shortName.toUpperCase();
    label.append(dot, name);
    label.setAttribute('aria-label', `Travel to ${place.name}`);
    label.onclick = () => visit(place);
    $('map-labels').appendChild(label);
    return { place, marker, label, point: new THREE.Vector3(x, 85, z) };
  });
  makeDataScience(scene);
  const pavilionPlace = places.find(place => place.id === 'ting-pavilion')!;
  const [pavilionX, pavilionZ] = project(pavilionPlace.coordinates);
  const pavilionModel = makePavilionGroup(); pavilionModel.position.set(pavilionX, 0, pavilionZ); scene.add(pavilionModel);
  const projected = new THREE.Vector3();
  let width = 1, height = 1;
  function resize() {
    width = world.clientWidth; height = world.clientHeight;
    camera.aspect = width / height;
    skyCamera.aspect = width / height;
    skyCamera.updateProjectionMatrix();
    if (mode === 'overview' && width > 760) camera.setViewOffset(width, height, -width * .14, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    room?.resize();
  }
  new ResizeObserver(resize).observe(world);
  resize();

  function setMode(next: typeof mode) {
    mode = next;
    explorer.classList.toggle('is-exploring', mode !== 'overview');
    $('flight-hud').hidden = mode !== 'flight';
    $('crosshair').hidden = mode !== 'flight';
    $('touch-controls').hidden = mode !== 'flight' || !matchMedia('(pointer: coarse)').matches;
    controls.enabled = mode !== 'flight';
    controls.autoRotate = mode === 'overview' && !reduced;
    keys.clear(); resize();
  }
  function releaseFlight() {
    if (document.pointerLockElement) document.exitPointerLock();
    keys.clear();
  }
  function overview() {
    endTour(false);
    releaseFlight(); activePlace = undefined; panel.hidden = true; results.hidden = true;
    setMode('overview');
    animateTravel(overviewPosition, overviewTarget);
    history.replaceState(null, '', location.pathname);
    announce('City overview · drag to orbit, scroll to zoom.');
  }
  function animateTravel(to: THREE.Vector3, target: THREE.Vector3) {
    if (reduced) { travel = null; camera.position.copy(to); controls.target.copy(target); controls.enabled = mode !== 'flight'; controls.update(); return; }
    travel = { from: camera.position.clone(), to, targetFrom: controls.target.clone(), targetTo: target, started: performance.now(), duration: 1700 };
    controls.enabled = false;
  }
  function visit(place: Place) {
    endTour(false);
    releaseFlight(); setMode('explore'); activePlace = place; results.hidden = true;
    const [x, z] = project(place.coordinates);
    animateTravel(new THREE.Vector3(x + 160, 145, z + 210), new THREE.Vector3(x, 18, z));
    presentPlace(place);
    panel.hidden = false;
    history.replaceState(null, '', `?place=${place.id}`);
    announce(`Arriving at ${place.name}. ${place.experience === 'outdoor' ? 'The outdoor walk is ready.' : place.room ? 'The community room is open.' : 'Drag to look around.'}`);
  }
  function presentPlace(place: Place) {
    $('destination-kind').textContent = `${place.kind.toUpperCase()} / ${place.district}`;
    $('destination-title').textContent = place.name;
    $('destination-description').textContent = place.description;
    $('destination-address').textContent = place.address;
    $<HTMLAnchorElement>('destination-page').href = `/places/${place.id}/`;
    $('enter-room').hidden = !place.room;
    $('enter-room').firstChild!.textContent = place.experience === 'outdoor' ? (place.id === 'ting-pavilion' ? 'Explore the pavilion ' : 'Walk the Downtown Mall ') : 'Enter the community room ';
  }
  function writeTourURL() {
    if (tour.active && activePlace) history.replaceState(null, '', `?tour=community&stop=${tour.state.index}&place=${activePlace.id}`);
  }
  function updateTourUI() {
    if (!tour.active || !activePlace) return;
    const stop = communityTour.stops[tour.state.index];
    $('tour-title').textContent = activePlace.name;
    $('tour-note').textContent = stop.note;
    $('tour-step').textContent = `${tour.state.phase === 'flying' ? 'FLYING TO' : tour.state.phase === 'held' ? 'FLIGHT PAUSED' : 'AT THE STOP'} · ${tour.state.index + 1} / ${communityTour.stops.length}`;
    $<HTMLButtonElement>('tour-previous').disabled = tour.state.index === 0;
    $('tour-next').textContent = tour.state.index === communityTour.stops.length - 1 ? 'Finish tour →' : 'Next →';
    $('tour-pause').textContent = tour.state.phase === 'held' ? 'Resume flight' : tour.state.phase === 'stop' ? 'Continue tour' : 'Pause flight';
    $<HTMLButtonElement>('tour-enter').disabled = !tour.canEnter || !activePlace.room;
    $('tour-enter').firstChild!.textContent = activePlace.experience === 'outdoor' ? (activePlace.id === 'ting-pavilion' ? 'Explore the pavilion ' : 'Walk the Downtown Mall ') : 'Enter the community room ';
    $('tour-status').textContent = tour.state.phase === 'stop' ? 'Take your time. Explore this place, or continue when you’re ready.' : tour.state.phase === 'held' ? 'The camera is held here until you resume.' : 'Flying between Charlottesville’s gathering places.';
    $('tour-panel').dataset.phase = tour.state.phase;
    $('tour-panel').dataset.stop = activePlace.id;
  }
  function endTour(showPlace = true) {
    if (!tour.active) return;
    tour.end(); tourFlight = undefined; $('tour-panel').hidden = true; explorer.classList.remove('is-touring');
    controls.enabled = mode !== 'flight';
    if (showPlace && activePlace) { presentPlace(activePlace); panel.hidden = false; history.replaceState(null, '', `?place=${activePlace.id}`); announce('Tour finished. Keep exploring at your own pace.'); }
  }
  function arriveTour() {
    tour.arrive(); tourFlight = undefined; controls.enabled = true; controls.autoRotate = false;
    $<HTMLProgressElement>('tour-progress').value = 1;
    updateTourUI(); writeTourURL(); announce(`Arrived at ${activePlace!.name}. Explore here or continue the tour.`);
  }
  function goTour(index: number) {
    releaseFlight(); travel = null; results.hidden = true; panel.hidden = true; setMode('explore');
    tour.go(index); activePlace = places.find(place => place.id === communityTour.stops[index].placeId)!;
    const stop = communityTour.stops[index], [x, z] = project(activePlace.coordinates);
    const destination = new THREE.Vector3(x + stop.cameraOffset[0], stop.cameraOffset[1], z + stop.cameraOffset[2]);
    const target = new THREE.Vector3(x, 18, z), from = camera.position.clone();
    presentPlace(activePlace); panel.hidden = true; $('tour-panel').hidden = false; explorer.classList.add('is-touring');
    controls.enabled = false; controls.autoRotate = false;
    if (reduced) { camera.position.copy(destination); controls.target.copy(target); controls.update(); arriveTour(); return; }
    const lift = Math.max(500, Math.min(900, from.y * .55));
    const a = from.clone().lerp(destination, .25), b = from.clone().lerp(destination, .7);
    a.y = Math.max(a.y, lift); b.y = Math.max(b.y, lift);
    tourFlight = { curve: new THREE.CatmullRomCurve3([from, a, b, destination], false, 'centripetal'), fromTarget: controls.target.clone(), toTarget: target, elapsed: 0, duration: stop.durationMs };
    $<HTMLProgressElement>('tour-progress').value = 0;
    updateTourUI(); writeTourURL(); announce(`Flying to ${activePlace.name}.`);
  }
  function nextTour() {
    if (!tour.active) return;
    if (tour.state.index === communityTour.stops.length - 1) endTour(); else goTour(tour.state.index + 1);
  }
  function showResults() {
    results.replaceChildren();
    const matches: { place: Place; name: string; kind: string; businessId?: string }[] = searchPlaces(input.value, places).map((place: Place) => ({ place, name: place.name, kind: place.kind }));
    if (input.value.trim()) for (const business of searchPlaces(input.value, storefrontCatalog.businesses)) {
      if (business.operatingStatus !== 'closed') matches.push({ place: places.find(p => p.id === 'downtown-mall')!, name: business.name, kind: 'Downtown Mall storefront', businessId: business.id });
    }
    if (!matches.length) {
      const empty = document.createElement('p'); empty.className = 'search-empty';
      empty.textContent = 'No destination yet. Try Studio IX, UVA Data Science, Downtown, or First Wednesdays.'; results.append(empty);
    }
    for (const match of matches) {
      const button = document.createElement('button'); button.className = 'search-result'; button.type = 'button';
      const title = document.createElement('span'); title.textContent = match.name;
      const detail = document.createElement('small'); detail.textContent = `${match.kind} ↗`;
      button.append(title, detail); button.onclick = () => { activateMatch(match); input.value = ''; };
      results.append(button);
    }
    results.hidden = false;
    return matches;
  }
  function activateMatch(match: { place: Place; businessId?: string }) {
    visit(match.place);
    if (match.businessId) { pendingBusinessId = match.businessId; $('enter-room').click(); }
  }
  input.addEventListener('input', showResults);
  input.addEventListener('focus', () => { if (input.value) showResults(); });
  $('search-form').addEventListener('submit', event => {
    event.preventDefault();
    const matches = showResults();
    if (matches.length === 1) { activateMatch(matches[0]); input.blur(); }
    else announce(matches.length ? 'Choose a destination from the search results.' : 'No matching destination found.');
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector<HTMLButtonElement>('button')?.focus(); }
  });
  results.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = Array.from(results.querySelectorAll<HTMLButtonElement>('button'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  });
  document.addEventListener('click', event => { if (!(event.target as HTMLElement).closest('.search-box, .search-results')) results.hidden = true; });
  document.querySelectorAll<HTMLButtonElement>('[data-destination]').forEach(button => {
    button.onclick = () => { const place = places.find(p => p.id === button.dataset.destination); if (place) visit(place); };
  });
  $('explore-button').onclick = () => {
    setMode('explore'); announce('You’re exploring. Drag to orbit, scroll to zoom, or choose a destination.');
  };
  $('overview-button').onclick = overview;
  $('exit-flight').onclick = overview;
  $('tour-start').onclick = () => goTour(0);
  $('tour-end').onclick = () => endTour();
  $('tour-next').onclick = nextTour;
  $('tour-previous').onclick = () => { if (tour.active && tour.state.index > 0) goTour(tour.state.index - 1); };
  $('tour-pause').onclick = () => {
    if (!tour.active) return;
    if (tour.state.phase === 'stop') nextTour();
    else if (tour.state.phase === 'held') { tour.resume(); last = performance.now(); } else tour.pause();
    updateTourUI();
  };
  $('tour-enter').onclick = () => { if (tour.canEnter) $('enter-room').click(); };
  $('close-destination').onclick = () => { panel.hidden = true; };
  $('motion-button').setAttribute('aria-pressed', String(reduced));
  $('motion-button').onclick = () => {
    reduced = !reduced;
    $('motion-button').setAttribute('aria-pressed', String(reduced));
    $('motion-button').setAttribute('aria-label', reduced ? 'Enable animation' : 'Reduce animation');
    controls.autoRotate = mode === 'overview' && !reduced;
    if (reduced && travel) { camera.position.copy(travel.to); controls.target.copy(travel.targetTo); travel = null; controls.enabled = mode !== 'flight'; controls.update(); }
    if (reduced && tourFlight) { camera.position.copy(tourFlight.curve.getPoint(1)); controls.target.copy(tourFlight.toTarget); controls.update(); arriveTour(); }
    announce(reduced ? 'Reduced animation enabled. Destination travel is instant.' : 'Animated travel enabled.');
  };
  $('help-button').onclick = () => { releaseFlight(); helpDialog.showModal(); };
  document.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach(button => { button.onclick = () => button.closest('dialog')?.close(); });
  $('enter-room').onclick = async () => {
    if (!activePlace?.room) return;
    const place = activePlace;
    const businessId = pendingBusinessId; pendingBusinessId = undefined;
    const landmarkId = pendingLandmarkId ?? place.defaultLandmarkId; pendingLandmarkId = undefined;
    const surfaceId = place.experience === 'outdoor' ? 'downtown-mall' : place.id;
    const request = ++roomRequest;
    releaseFlight();
    $('surface-error').hidden = true;
    document.querySelectorAll<HTMLElement>('[data-room-place]').forEach(section => { section.hidden = section.dataset.roomPlace !== surfaceId; });
    $('room-location-name').textContent = `${place.shortName.toUpperCase()} / ${place.experience === 'outdoor' ? 'OUTDOOR WALK' : 'COMMUNITY ROOM'}`;
    $('room-world').setAttribute('aria-label', `Stylized ${place.name} ${place.experience === 'outdoor' ? 'outdoor walk' : 'community room'}`);
    roomDialog.setAttribute('aria-labelledby', `room-title-${surfaceId}`);
    roomDialog.showModal(); roomDialog.scrollTop = 0;
    if (!room || roomPlaceId !== place.id) {
      room?.dispose(); room = undefined; $('room-world').replaceChildren();
      $('room-world').dataset.ready = 'loading';
      document.querySelectorAll<HTMLButtonElement>('.surface-toolbar button').forEach(button => { button.disabled = true; });
      try {
        const created = await makeWalkthrough($('room-world'), place, () => roomDialog.close(), () => request === roomRequest && roomDialog.open);
        if (request !== roomRequest || !roomDialog.open) { created.dispose(); return; }
        room = created; roomPlaceId = place.id; $('room-world').dataset.ready = 'true';
        document.querySelectorAll<HTMLButtonElement>('.surface-toolbar button').forEach(button => { button.disabled = false; });
      } catch {
        if (request !== roomRequest || !roomDialog.open) return;
        $('room-world').dataset.ready = 'fallback'; $('surface-status').textContent = 'The walking scene could not load. You can still read the exhibits and directory pages.';
        $('surface-error').textContent = 'The walking scene could not load. The guide and linked content pages are still available.'; $('surface-error').hidden = false;
        announce('The walking scene is unavailable; its content pages remain readable.');
      }
    }
    room?.resize();
    if (businessId) room?.jump(businessId);
    else if (landmarkId) room?.jumpLandmark(landmarkId);
    else history.replaceState(null, '', `?place=${place.id}&walk=1`);
  };
  roomDialog.addEventListener('close', () => { roomRequest++; keys.clear(); room?.pause(); if (tour.active) writeTourURL(); else if (activePlace) history.replaceState(null, '', `?place=${activePlace.id}`); });
  $('flight-button').onclick = async () => {
    endTour(false);
    travel = null; panel.hidden = true; setMode('flight');
    const direction = new THREE.Vector3(); camera.getWorldDirection(direction);
    flightYaw = Math.atan2(-direction.x, -direction.z);
    flightPitch = Math.asin(direction.y);
    camera.rotation.order = 'YXZ'; camera.rotation.set(flightPitch, flightYaw, 0);
    if (!matchMedia('(pointer: coarse)').matches) {
      try { await renderer.domElement.requestPointerLock(); }
      catch { announce('Mouse capture is unavailable. Drag to look, and use WASD to fly.'); }
    } else announce('Use the arrow pad to fly; drag the city to look around.');
  };
  renderer.domElement.addEventListener('pointerdown', event => {
    if (mode === 'flight' && !document.pointerLockElement) { drag = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture(event.pointerId); }
    if (travel && mode !== 'flight') { travel = null; controls.enabled = true; }
  });
  renderer.domElement.addEventListener('pointerup', () => { drag = null; });
  renderer.domElement.addEventListener('pointercancel', () => { drag = null; });
  document.addEventListener('pointermove', event => {
    if (mode !== 'flight' || roomDialog.open || helpDialog.open) return;
    if (document.pointerLockElement === renderer.domElement || drag) {
      const dx = drag ? event.clientX - drag.x : event.movementX;
      const dy = drag ? event.clientY - drag.y : event.movementY;
      flightYaw -= dx * .0025; flightPitch = THREE.MathUtils.clamp(flightPitch - dy * .0025, -1.35, 1.35);
      camera.rotation.set(flightPitch, flightYaw, 0);
      if (drag) drag = { x: event.clientX, y: event.clientY };
    }
  });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement) { keys.clear(); if (mode === 'flight') announce('Mouse released. Drag to look or return to the overview.'); }
  });
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyC', 'ShiftLeft', 'ShiftRight']);
  document.addEventListener('keydown', event => {
    if ((event.target as HTMLElement).matches('input, textarea') || roomDialog.open || helpDialog.open) return;
    if (event.key === '/') { event.preventDefault(); endTour(false); releaseFlight(); input.focus(); return; }
    if (event.key === 'Escape') { if (tour.active) endTour(); results.hidden = true; panel.hidden = true; releaseFlight(); return; }
    if (mode === 'flight' && movementKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); }
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); drag = null; });
  document.addEventListener('visibilitychange', () => { keys.clear(); last = performance.now(); });
  document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(button.dataset.move!); button.setPointerCapture(event.pointerId); });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => keys.delete(button.dataset.move!));
  });

  const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
  $('voice-button').onclick = () => {
    if (!SpeechRecognition) { announce('Voice is not supported by this browser. Type a destination instead.'); input.focus(); return; }
    if (recognition) { recognition.stop(); return; }
    recognition = new SpeechRecognition(); recognition.lang = 'en-US'; recognition.interimResults = false;
    recognition.onresult = event => {
      input.value = event.results[0][0].transcript;
      const matches = showResults();
      announce(matches.length === 1 ? `Found ${matches[0].name}. Choose it to travel.` : matches.length ? 'Choose one of the matching destinations to travel.' : 'No matching destination yet. Try another place.');
      input.focus();
    };
    recognition.onerror = event => announce(event.error === 'not-allowed' ? 'Microphone access was declined. Typed search is ready.' : 'Couldn’t hear a destination. Try again or type it.');
    recognition.onend = () => { $('voice-button').classList.remove('listening'); recognition = undefined; };
    try { recognition.start(); $('voice-button').classList.add('listening'); announce('Listening… say a place like “Take me to Studio IX”.'); }
    catch { recognition = undefined; announce('Voice could not start. Type a destination instead.'); }
  };

  let last = performance.now();
  const direction = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const [west, north] = project([cityRegion.bounds[0], cityRegion.bounds[3]]);
  const [east, south] = project([cityRegion.bounds[2], cityRegion.bounds[1]]);
  renderer.setAnimationLoop(now => {
    const elapsedMs = Math.max(0, now - last);
    const dt = Math.min(elapsedMs / 1000, .05); last = now;
    if (document.hidden) return;
    if (roomDialog.open) { room?.render(now, reduced); return; }
    if (tourFlight && tour.state.phase === 'flying' && !helpDialog.open) {
      tourFlight.elapsed += elapsedMs;
      const ratio = Math.min(tourFlight.elapsed / tourFlight.duration, 1), eased = ratio * ratio * (3 - 2 * ratio);
      camera.position.copy(tourFlight.curve.getPoint(eased));
      controls.target.lerpVectors(tourFlight.fromTarget, tourFlight.toTarget, eased);
      $<HTMLProgressElement>('tour-progress').value = ratio;
      if (ratio === 1) arriveTour();
    }
    if (travel) {
      const t = Math.min((now - travel.started) / travel.duration, 1);
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(travel.from, travel.to, eased);
      controls.target.lerpVectors(travel.targetFrom, travel.targetTo, eased);
      if (t === 1) { travel = null; controls.enabled = mode !== 'flight'; }
    }
    if (mode === 'flight' && !helpDialog.open) {
      wish.set(0, 0, 0);
      if (keys.has('KeyW')) wish.z -= 1;
      if (keys.has('KeyS')) wish.z += 1;
      if (keys.has('KeyA')) wish.x -= 1;
      if (keys.has('KeyD')) wish.x += 1;
      const look = lookWithKeys(flightYaw, flightPitch, keys, dt); flightYaw = look.yaw; flightPitch = look.pitch;
      camera.rotation.set(flightPitch, flightYaw, 0);
      wish.applyAxisAngle(THREE.Object3D.DEFAULT_UP, flightYaw);
      if (keys.has('Space')) wish.y += 1;
      if (keys.has('KeyC')) wish.y -= 1;
      wish.normalize().multiplyScalar(keys.has('ShiftLeft') || keys.has('ShiftRight') ? 420 : 140);
      velocity.lerp(wish, 1 - Math.exp(-dt * 6));
      camera.position.addScaledVector(velocity, dt);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 28, 2600);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, west, east);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, north, south);
      camera.getWorldDirection(direction); controls.target.copy(camera.position).addScaledVector(direction, 100);
    } else { velocity.set(0, 0, 0); controls.update(); }
    if (!reduced && !helpDialog.open) {
      for (const { marker } of pins) { marker.rotation.y = Math.sin(now * .0002) * .12; }
    }
    camera.getWorldDirection(direction);
    // The map looks down, but its celestial backdrop quietly looks above the
    // horizon along the same bearing. Free flight looking up uses the real gaze.
    skyCamera.rotation.set(Math.max(.35, Math.asin(direction.y)), Math.atan2(-direction.x, -direction.z), 0);
    sky?.update(skyCamera);
    camera.updateMatrixWorld();
    const labelRects: { x: number; y: number }[] = [];
    const dockTop = tour.active ? height - 50 : document.querySelector<HTMLElement>('.discovery-dock')!.offsetTop;
    const introRect = document.querySelector<HTMLElement>('.intro')!.getBoundingClientRect();
    const worldTop = world.getBoundingClientRect().top;
    for (const pin of pins) {
      projected.copy(pin.point).project(camera);
      const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
      const inHero = mode === 'overview' && x - 100 < introRect.right && x + 100 > introRect.left && y < introRect.bottom - worldTop + 35 && y > introRect.top - worldTop - 35;
      const overlap = labelRects.some(rect => Math.abs(rect.x - x) < 130 && Math.abs(rect.y - y) < 45);
      const visible = projected.z < 1 && projected.z > -1 && x > 60 && x < width - 60 && y > 60 && y < dockTop - 25 && !inHero && !overlap;
      pin.label.hidden = !visible;
      if (visible) { pin.label.style.left = `${x}px`; pin.label.style.top = `${y}px`; labelRects.push({ x, y }); }
    }
    renderer.clear();
    renderer.render(skyScene, skyCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  });

  try {
    const response = await fetch(cityRegion.snapshot);
    if (!response.ok) throw new Error('City data not available');
    const city = await response.json() as City;
    drawRoads(scene, city.roads);
    await drawBuildings(scene, city.buildings, n => announce(`Building the city · ${Math.round(n / city.buildings.length * 100)}%`));
    announce(`${city.metadata.buildings.toLocaleString()} real building footprints · ready to explore.`);
    status.dataset.kind = 'ready';
    const params = new URLSearchParams(location.search);
    const placeId = params.get('place');
    const place = places.find(p => p.id === placeId);
    if (place) {
      visit(place);
      if (params.get('walk') === '1' && place.room) { pendingBusinessId = params.get('business') ?? undefined; pendingLandmarkId = params.get('landmark') ?? undefined; $('enter-room').click(); }
    }
    world.dataset.ready = 'true';
    $<HTMLButtonElement>('tour-start').disabled = false;
    if (params.get('tour') === 'community') { const stop = Number(params.get('stop') ?? 0); goTour(Number.isInteger(stop) && stop >= 0 && stop < communityTour.stops.length ? stop : 0); }
  } catch (error) {
    console.error(error); announce('City geometry could not load. Destinations and community pages are still available.');
    world.dataset.ready = 'fallback';
  }
  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null); controls.dispose(); sky?.dispose(); renderer.dispose(); room?.dispose(); recognition?.stop();
  }, { once: true });
}

async function drawBuildings(scene: THREE.Scene, buildings: City['buildings'], progress: (n: number) => void) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .15 });
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x9ec58e, transparent: true, opacity: .22 });
  const colors = [0x577366, 0x657c70, 0x465f5b, 0x738577, 0x496b61, 0x7d8974];
  for (let offset = 0; offset < buildings.length; offset += 250) {
    const geometries: THREE.BufferGeometry[] = [], edges: number[] = [];
    for (const building of buildings.slice(offset, offset + 250)) {
      if (!building.rings[0] || building.rings[0].length < 4) continue;
      // GeoJSON ring coordinates map to X/-Z, then extrude local Z into world Y.
      const shape = new THREE.Shape(building.rings[0].map(([x, z]) => new THREE.Vector2(x, -z)));
      for (const hole of building.rings.slice(1)) shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: building.h, bevelEnabled: false, steps: 1, curveSegments: 1 });
      geometry.rotateX(-Math.PI / 2);
      const color = new THREE.Color(colors[Math.abs(building.id) % colors.length]);
      const count = geometry.getAttribute('position').count;
      const attributes = new Float32Array(count * 3);
      for (let j = 0; j < count; j++) { attributes[j * 3] = color.r; attributes[j * 3 + 1] = color.g; attributes[j * 3 + 2] = color.b; }
      geometry.setAttribute('color', new THREE.BufferAttribute(attributes, 3));
      geometries.push(geometry);
      for (const ring of building.rings) for (let j = 0; j < ring.length - 1; j++) {
        const [x, z] = ring[j], [x2, z2] = ring[j + 1];
        edges.push(x, building.h + .15, z, x2, building.h + .15, z2);
        if (j % 3 === 0) edges.push(x, 0, z, x, building.h, z);
      }
    }
    if (geometries.length) {
      const merged = mergeGeometries(geometries, false);
      if (merged) scene.add(new THREE.Mesh(merged, material));
      geometries.forEach(g => g.dispose());
      const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
      scene.add(new THREE.LineSegments(lineGeometry, edgesMaterial));
    }
    progress(Math.min(offset + 250, buildings.length)); await nextFrame();
  }
}

function drawRoads(scene: THREE.Scene, roads: City['roads']) {
  const vertices: number[] = [], center: number[] = [];
  for (const road of roads) for (let i = 0; i < road.length - 1; i++) {
    const [x, z] = road[i], [x2, z2] = road[i + 1];
    const length = Math.hypot(x2 - x, z2 - z); if (length < .01) continue;
    const dx = (z2 - z) / length * 4, dz = -(x2 - x) / length * 4;
    vertices.push(x + dx, .1, z + dz, x2 + dx, .1, z2 + dz, x - dx, .1, z - dz, x - dx, .1, z - dz, x2 + dx, .1, z2 + dz, x2 - dx, .1, z2 - dz);
    center.push(x, .2, z, x2, .2, z2);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x34514d, side: THREE.DoubleSide })));
  const line = new THREE.BufferGeometry(); line.setAttribute('position', new THREE.Float32BufferAttribute(center, 3));
  scene.add(new THREE.LineSegments(line, new THREE.LineBasicMaterial({ color: 0x819b70, transparent: true, opacity: .45 })));
}

function makeBeacon(color: string, portal: boolean) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(portal ? 22 : 16, .8, 8, 70), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 2; group.add(ring);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 75, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 })); pillar.position.y = 38; group.add(pillar);
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(4), new THREE.MeshBasicMaterial({ color })); orb.position.y = 75; group.add(orb);
  if (portal) {
    const gate = new THREE.Mesh(new THREE.TorusGeometry(11, 1.1, 10, 60), new THREE.MeshBasicMaterial({ color })); gate.position.y = 15; group.add(gate);
    const inside = new THREE.Mesh(new THREE.CircleGeometry(10.5, 40), new THREE.MeshBasicMaterial({ color, opacity: .14, transparent: true, side: THREE.DoubleSide })); inside.position.y = 15; group.add(inside);
  }
  return group;
}

function makeDataScience(scene: THREE.Scene) {
  const place = places.find(p => p.id === 'uva-data-science')!;
  const [x, z] = project(place.coordinates);
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const frame = new THREE.MeshStandardMaterial({ color: 0x92959d, roughness: .6, metalness: .3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x526177, roughness: .25, metalness: .7, emissive: 0x221b3b, emissiveIntensity: .6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(50, 22, 35), glass); body.position.y = 11; group.add(body);
  for (const y of [1, 8, 15, 22]) { const slab = new THREE.Mesh(new THREE.BoxGeometry(52, .6, 37), frame); slab.position.y = y; group.add(slab); }
  for (let i = -24; i <= 24; i += 4) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.45, 22, 1.4), frame); fin.position.set(i, 11, 18); group.add(fin);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(20, .5, 10), frame); canopy.position.set(6, 5, 22); group.add(canopy);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(50, .2, .2), new THREE.MeshBasicMaterial({ color: place.color })); trim.position.set(0, 22.5, 18.6); group.add(trim);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(70, .3, 55), new THREE.MeshStandardMaterial({ color: 0x394347, roughness: 1 })); plaza.position.set(0, -.1, 0); group.add(plaza);
  scene.add(group);
}
