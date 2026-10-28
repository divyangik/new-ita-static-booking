import * as THREE from './vendor/three.module.js';

const canvas = document.querySelector('#cinematic-earth');
const container = canvas?.closest('.earth-visual');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function initializeEarth() {
  if (!canvas || !container) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 640 ? 1.3 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 0, 4.5);
  const globe = new THREE.Group();
  globe.rotation.set(.15, 0, -.13);
  scene.add(globe);
  const textureLoader = new THREE.TextureLoader();
  let textures;
  try {
    textures = await Promise.all([
      textureLoader.loadAsync('/img/earth/day.jpg'),
      textureLoader.loadAsync('/img/earth/night.png'),
      textureLoader.loadAsync('/img/earth/clouds.png'),
    ]);
  } catch {
    renderer.dispose();
    return;
  }
  textures[0].colorSpace = THREE.SRGBColorSpace;
  textures[1].colorSpace = THREE.SRGBColorSpace;
  const sphereGeometry = new THREE.SphereGeometry(1, 64, 48);
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      daylight: { value: textures[0] },
      nightlights: { value: textures[1] },
    },
    vertexShader: `
      varying vec2 surfaceUv;
      varying vec3 surfaceNormal;
      void main() {
        surfaceUv = uv;
        surfaceNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D daylight;
      uniform sampler2D nightlights;
      varying vec2 surfaceUv;
      varying vec3 surfaceNormal;
      void main() {
        vec3 normal = normalize(surfaceNormal);
        float sunlight = dot(normal, normalize(vec3(-0.8, 0.55, 1.0)));
        float illumination = smoothstep(-0.2, 0.7, sunlight);
        vec3 surface = texture2D(daylight, surfaceUv).rgb;
        float luminance = dot(surface, vec3(0.2126, 0.7152, 0.0722));
        surface = mix(vec3(luminance), surface, 0.67) * vec3(0.7, 0.84, 0.91);
        vec3 lights = texture2D(nightlights, surfaceUv).rgb * vec3(1.2, 0.9, 0.5);
        float rim = pow(1.0 - max(normal.z, 0.0), 3.5);
        vec3 color = surface * (0.08 + illumination * 0.95);
        color += lights * (1.0 - illumination) * 1.5;
        color += vec3(0.52, 0.39, 0.21) * rim * max(sunlight, 0.0) * 0.8;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  globe.add(new THREE.Mesh(sphereGeometry, earthMaterial));
  const cloudMaterial = new THREE.MeshPhongMaterial({ map: textures[2], transparent: true, opacity: .22, depthWrite: false, color: '#b6c2bf' });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.013, 48, 32), cloudMaterial);
  globe.add(clouds);
  scene.add(new THREE.AmbientLight('#8aabbc', .6));
  const sunlight = new THREE.DirectionalLight('#e8c994', 2.2);
  sunlight.position.set(-3, 2, 4);
  scene.add(sunlight);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    vertexShader: `
      varying vec3 atmosphereNormal;
      varying vec3 viewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        atmosphereNormal = normalize(normalMatrix * normal);
        viewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 atmosphereNormal;
      varying vec3 viewDirection;
      void main() {
        float intensity = pow(1.0 - max(0.0, dot(normalize(atmosphereNormal), normalize(viewDirection))), 3.5);
        vec3 color = mix(vec3(0.18, 0.4, 0.55), vec3(0.84, 0.63, 0.32), smoothstep(-0.8, 0.7, atmosphereNormal.x));
        gl_FragColor = vec4(color, intensity * 0.32);
      }
    `,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.08, 48, 32), atmosphereMaterial));
  const locationOnSphere = (latitude, longitude, radius = 1.02) => {
    const latitudeRadians = latitude * Math.PI / 180;
    const longitudeRadians = (longitude + 180) * Math.PI / 180;
    return new THREE.Vector3(-radius * Math.cos(latitudeRadians) * Math.cos(longitudeRadians), radius * Math.sin(latitudeRadians), radius * Math.cos(latitudeRadians) * Math.sin(longitudeRadians));
  };
  const regionColors = {
    'North America': '#e3959b',
    'Latin America': '#8fb878',
    Caribbean: '#7fc4c0',
    Europe: '#d9b75a',
    Africa: '#d98a5b',
    Asia: '#7fb2dc',
  };
  const destinations = [
    { name: 'Panama', region: 'Latin America', note: 'Our gateway to Latin America', latitude: 8.98, longitude: -79.52, label: 1 },
    { name: 'Los Angeles', region: 'North America', note: 'Southern California', latitude: 34.05, longitude: -118.24, label: 1, side: 'left' },
    { name: 'Mexico City', region: 'Latin America', note: 'Culture & cuisine', latitude: 19.43, longitude: -99.13, label: 2, side: 'left' },
    { name: 'Havana', region: 'Caribbean', note: 'Rhythm & heritage', latitude: 23.11, longitude: -82.37 },
    { name: 'San Salvador', region: 'Latin America', note: 'Real estate discovery', latitude: 13.69, longitude: -89.22 },
    { name: 'Cartagena', region: 'Latin America', note: 'Colonial Caribbean coast', latitude: 10.39, longitude: -75.51 },
    { name: 'Cusco', region: 'Latin America', note: 'The Inca Trail', latitude: -13.53, longitude: -71.97, label: 2 },
    { name: 'Lisbon', region: 'Europe', note: 'History & gastronomy', latitude: 38.72, longitude: -9.14, label: 1, side: 'left' },
    { name: 'Amalfi', region: 'Europe', note: 'The Italian coast', latitude: 40.63, longitude: 14.6, label: 2 },
    { name: 'Istanbul', region: 'Europe', note: 'Where continents meet', latitude: 41.01, longitude: 28.98 },
    { name: 'Cairo', region: 'Africa', note: 'The Nile & beyond', latitude: 30.04, longitude: 31.24, label: 1 },
    { name: 'Tanzania', region: 'Africa', note: 'The Great Migration', latitude: -3.39, longitude: 36.68, label: 2 },
    { name: 'Bangkok', region: 'Asia', note: 'Treasures of Thailand', latitude: 13.76, longitude: 100.5 },
    { name: 'Kyoto', region: 'Asia', note: 'Cultural depth', latitude: 35.01, longitude: 135.77, label: 1 },
    { name: 'Bali', region: 'Asia', note: 'Island of the gods', latitude: -8.41, longitude: 115.19, label: 1, side: 'left' },
  ];
  const routePairs = [
    ['Los Angeles', 'Mexico City'], ['Mexico City', 'Panama'], ['Panama', 'Cusco'], ['Panama', 'Havana', 'secondary'],
    ['Cartagena', 'Lisbon'], ['Lisbon', 'Amalfi'], ['Amalfi', 'Istanbul', 'secondary'], ['Istanbul', 'Cairo'],
    ['Cairo', 'Tanzania'], ['Istanbul', 'Bangkok'], ['Bangkok', 'Bali'], ['Bangkok', 'Kyoto', 'secondary'],
    ['Kyoto', 'Los Angeles'], ['San Salvador', 'Panama', 'secondary'],
  ];
  const compact = window.matchMedia('(max-width: 640px)');
  const markerGeometry = new THREE.SphereGeometry(.0125, 12, 8);
  const pulseGeometry = new THREE.RingGeometry(.018, .023, 32);
  const haloGeometry = new THREE.CircleGeometry(.03, 24);
  const markers = destinations.map(destination => {
    const position = locationOnSphere(destination.latitude, destination.longitude);
    const color = new THREE.Color(regionColors[destination.region]);
    const point = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color('#fff4dc'), .35) }));
    point.position.copy(position);
    globe.add(point);
    const outward = position.clone().multiplyScalar(2);
    const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.copy(position.clone().multiplyScalar(1.004));
    halo.lookAt(outward);
    globe.add(halo);
    const pulse = new THREE.Mesh(pulseGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .5, depthWrite: false }));
    pulse.position.copy(position.clone().multiplyScalar(1.008));
    pulse.lookAt(outward);
    globe.add(pulse);
    return { ...destination, position, point, pulse, halo };
  });
  const markerByName = Object.fromEntries(markers.map(marker => [marker.name, marker]));
  const arcPoints = (start, end, segments = 96) => {
    const startDirection = start.clone().normalize();
    const endDirection = end.clone().normalize();
    const angle = startDirection.angleTo(endDirection);
    const lift = .05 + angle * .12;
    const points = [];
    for (let step = 0; step <= segments; step += 1) {
      const progress = step / segments;
      const direction = new THREE.Vector3()
        .addScaledVector(startDirection, Math.sin((1 - progress) * angle) / Math.sin(angle))
        .addScaledVector(endDirection, Math.sin(progress * angle) / Math.sin(angle));
      points.push(direction.normalize().multiplyScalar(1.014 + Math.sin(Math.PI * progress) * lift));
    }
    return points;
  };
  const routeMaterial = new THREE.LineBasicMaterial({ color: '#d6b477', transparent: true, opacity: .2, depthWrite: false });
  const trailMaterial = new THREE.LineBasicMaterial({ color: '#f1d39a', transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending });
  const travelerGeometry = new THREE.SphereGeometry(.0085, 10, 6);
  const travelerMaterial = new THREE.MeshBasicMaterial({ color: '#fff1d2' });
  const routes = routePairs.map(([from, to, density], index) => {
    const points = arcPoints(markerByName[from].position, markerByName[to].position);
    const base = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), routeMaterial);
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(points);
    trailGeometry.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    const traveler = new THREE.Mesh(travelerGeometry, travelerMaterial);
    traveler.position.copy(points[0]);
    const group = new THREE.Group();
    group.add(base, trail, traveler);
    globe.add(group);
    return { points, trailGeometry, traveler, group, secondary: density === 'secondary', speed: .16 + (index % 4) * .025, offset: index * .29 };
  });
  const labelLayer = container.querySelector('.earth-labels');
  const labels = markers.filter(marker => marker.label).map(marker => {
    const element = document.createElement('span');
    element.className = `earth-label${marker.side === 'left' ? ' is-left' : ''}`;
    element.style.setProperty('--marker', regionColors[marker.region]);
    element.textContent = marker.name;
    labelLayer?.append(element);
    return { marker, element };
  });
  const spotlightName = container.querySelector('[data-earth-name]');
  const spotlightRegion = container.querySelector('[data-earth-region]');
  const spotlightCoordinate = container.querySelector('[data-earth-coordinate]');
  const formatCoordinate = (value, positive, negative) => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutes = Math.round((absolute - degrees) * 60);
    return `${String(degrees).padStart(2, '0')}° ${String(minutes).padStart(2, '0')}′ ${value >= 0 ? positive : negative}`;
  };
  let spotlight = markerByName.Panama;
  let spotlightTimer = 0;
  const setSpotlight = marker => {
    spotlight = marker;
    container.style.setProperty('--spotlight', regionColors[marker.region]);
    if (spotlightName) spotlightName.textContent = marker.name;
    if (spotlightRegion) spotlightRegion.textContent = `${marker.region} · ${marker.note}`;
    if (spotlightCoordinate) spotlightCoordinate.textContent = `${formatCoordinate(marker.latitude, 'N', 'S')} · ${formatCoordinate(marker.longitude, 'E', 'W')}`;
  };
  const worldPosition = new THREE.Vector3();
  const viewDirection = new THREE.Vector3();
  const facingCamera = marker => {
    marker.point.getWorldPosition(worldPosition);
    viewDirection.copy(camera.position).sub(worldPosition).normalize();
    return worldPosition.normalize().dot(viewDirection);
  };
  const chooseSpotlight = () => {
    const candidates = markers.filter(marker => marker.label === 1 && marker !== spotlight && facingCamera(marker) > .45);
    if (candidates.length) setSpotlight(candidates[Math.floor(Math.random() * candidates.length)]);
  };
  const applyDensity = () => routes.forEach(route => { route.group.visible = !(compact.matches && route.secondary); });
  applyDensity();
  compact.addEventListener('change', applyDensity);
  let viewportWidth = 0;
  let viewportHeight = 0;
  const projected = new THREE.Vector3();
  const updateLabels = () => {
    globe.updateMatrixWorld();
    labels.forEach(({ marker, element }) => {
      const facing = facingCamera(marker);
      const shown = marker === spotlight || !compact.matches || marker.label === 1 && viewportWidth > 360;
      const opacity = shown ? Math.min(1, Math.max(0, (facing - .3) / .3)) : 0;
      element.style.opacity = opacity.toFixed(2);
      element.classList.toggle('is-active', marker === spotlight);
      if (opacity <= 0) return;
      marker.point.getWorldPosition(projected).project(camera);
      element.style.transform = `translate3d(${((projected.x + 1) / 2 * viewportWidth).toFixed(1)}px, ${((1 - projected.y) / 2 * viewportHeight).toFixed(1)}px, 0)`;
    });
  };
  let animationFrame;
  let visible = true;
  let disposed = false;
  let lastTime = 0;
  let rotation = globe.rotation.y;
  let pointerX = 0;
  let pointerY = 0;
  let elapsed = 0;
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    viewportWidth = width;
    viewportHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (reducedMotion.matches) {
      updateLabels();
      renderer.render(scene, camera);
    }
  };
  const animate = timestamp => {
    animationFrame = undefined;
    if (disposed || !visible || document.hidden) return;
    const delta = Math.min((timestamp - (lastTime || timestamp)) / 1000, .05);
    lastTime = timestamp;
    elapsed += delta;
    if (!reducedMotion.matches) {
      rotation += delta * .045;
      globe.rotation.y += (rotation + pointerX * .12 - globe.rotation.y) * .025;
      globe.rotation.x += (.15 + pointerY * .06 - globe.rotation.x) * .025;
      clouds.rotation.y += delta * .012;
      routes.forEach(route => {
        if (!route.group.visible) return;
        const cycle = (elapsed * route.speed + route.offset) % 1.6;
        const last = route.points.length - 1;
        const head = Math.min(last, Math.floor(cycle * last));
        const tail = Math.max(0, Math.floor((cycle - .3) * last));
        route.trailGeometry.setDrawRange(tail, cycle >= 1.3 ? 0 : Math.max(0, head - tail + 1));
        route.traveler.visible = cycle < 1;
        route.traveler.position.copy(route.points[head]);
      });
      markers.forEach((marker, index) => {
        const active = marker === spotlight;
        const phase = (elapsed * (active ? .55 : .3) + index * .137) % 1;
        marker.pulse.scale.setScalar(1 + phase * (active ? 2.6 : 1.4));
        marker.pulse.material.opacity = (1 - phase) * (active ? .85 : .4);
        marker.halo.material.opacity += ((active ? .42 : .14) - marker.halo.material.opacity) * .08;
      });
      spotlightTimer += delta;
      if (spotlightTimer > 4.2) {
        spotlightTimer = 0;
        chooseSpotlight();
      }
    }
    updateLabels();
    renderer.render(scene, camera);
    container.classList.add('is-rendered');
    if (!reducedMotion.matches) animationFrame = requestAnimationFrame(animate);
  };
  const resume = () => { lastTime = 0; if (!animationFrame && visible && !document.hidden && !disposed) animationFrame = requestAnimationFrame(animate); };
  const pointerMove = event => {
    if (event.pointerType === 'touch' || reducedMotion.matches) return;
    pointerX = event.clientX / innerWidth - .5;
    pointerY = event.clientY / innerHeight - .5;
  };
  const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(animationFrame); animationFrame = undefined; } else resume(); };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
    else { cancelAnimationFrame(animationFrame); animationFrame = undefined; }
  }, { rootMargin: '100px' });
  observer.observe(container);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  document.addEventListener('pointermove', pointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', resume);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    container.classList.remove('is-rendered');
  });
  canvas.addEventListener('webglcontextrestored', resume);
  resize();
  resume();
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener('pointermove', pointerMove);
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', resume);
    compact.removeEventListener('change', applyDensity);
    const materials = new Set();
    const geometries = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    renderer.dispose();
  }, { once: true });
}

initializeEarth();
