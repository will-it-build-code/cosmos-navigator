/**
 * SolarSystemBuilder - Constructs the complete solar system
 * Creates and manages all celestial bodies
 *
 * NEGATIVE SPACE: This class asserts that all planetary data exists before
 * creating planets, that ring geometry is valid, and that all bodies are
 * properly added to the scene. Silent failures for missing data are replaced
 * with loud crashes.
 */

import * as THREE from 'three';
import { Sun } from './Sun';
import { Planet, PlanetConfig } from './Planet';
import { Moon } from './Moon';
import { RingSystem } from './RingSystem';
import { CelestialBody } from './CelestialBody';
import { PLANET_ORBITAL_DATA, MOON_ORBITAL_DATA, DWARF_PLANET_ORBITAL_DATA } from '../data/OrbitalData';
import { PLANET_PHYSICAL_DATA, DWARF_PLANET_PHYSICAL_DATA, MOON_PHYSICAL_DATA } from '../data/PhysicalData';
import { ProgressCallback } from '../engine/CosmosApp';
import {
  invariant,
  assertDefined,
  assertPositive,
  assertNonNegative,
  assertNonEmpty,
  assertKeyExists,
  assertFinite,
  postcondition,
  precondition
} from '../utils/invariant';

// Texture paths - local first, CDN fallback handled in loader
// Run `node scripts/download-textures.js` to download textures locally
// Note: Vite serves 'assets' folder at root, so /textures/... not /assets/textures/...
const LOCAL_TEXTURE_BASE = '/textures';
const CDN_TEXTURE_BASE = 'https://www.solarsystemscope.com/textures/download';

// Helper to get texture URL (will try local first via the texture loader)
function getTextureUrl(localPath: string, cdnFilename: string): string {
  // Return local path - the loader will handle fallback if needed
  return `${LOCAL_TEXTURE_BASE}/${localPath}`;
}

// CDN URLs as fallback (used if local files don't exist)
const CDN_TEXTURE_URLS = {
  sun: `${CDN_TEXTURE_BASE}/2k_sun.jpg`,
  mercury: `${CDN_TEXTURE_BASE}/2k_mercury.jpg`,
  venus_surface: `${CDN_TEXTURE_BASE}/2k_venus_surface.jpg`,
  venus_atmosphere: `${CDN_TEXTURE_BASE}/2k_venus_atmosphere.jpg`,
  earth_day: `${CDN_TEXTURE_BASE}/2k_earth_daymap.jpg`,
  earth_night: `${CDN_TEXTURE_BASE}/2k_earth_nightmap.jpg`,
  earth_clouds: `${CDN_TEXTURE_BASE}/2k_earth_clouds.jpg`,
  earth_normal: `${CDN_TEXTURE_BASE}/2k_earth_normal_map.png`,
  earth_specular: `${CDN_TEXTURE_BASE}/2k_earth_specular_map.png`,
  moon: `${CDN_TEXTURE_BASE}/2k_moon.jpg`,
  mars: `${CDN_TEXTURE_BASE}/2k_mars.jpg`,
  jupiter: `${CDN_TEXTURE_BASE}/2k_jupiter.jpg`,
  saturn: `${CDN_TEXTURE_BASE}/2k_saturn.jpg`,
  saturn_ring: `${CDN_TEXTURE_BASE}/2k_saturn_ring_alpha.png`,
  uranus: `${CDN_TEXTURE_BASE}/2k_uranus.jpg`,
  neptune: `${CDN_TEXTURE_BASE}/2k_neptune.jpg`,
  pluto: `${CDN_TEXTURE_BASE}/2k_pluto.jpg`,
  stars: `${CDN_TEXTURE_BASE}/2k_stars_milky_way.jpg`
};

const TEXTURE_URLS = {
  sun: `${LOCAL_TEXTURE_BASE}/sun/2k_sun.jpg`,
  mercury: `${LOCAL_TEXTURE_BASE}/mercury/2k_mercury.jpg`,
  venus_surface: `${LOCAL_TEXTURE_BASE}/venus/2k_venus_surface.jpg`,
  venus_atmosphere: `${LOCAL_TEXTURE_BASE}/venus/2k_venus_atmosphere.jpg`,
  earth_day: `${LOCAL_TEXTURE_BASE}/earth/2k_earth_daymap.jpg`,
  earth_night: `${LOCAL_TEXTURE_BASE}/earth/2k_earth_nightmap.jpg`,
  earth_clouds: `${LOCAL_TEXTURE_BASE}/earth/2k_earth_clouds.jpg`,
  earth_normal: `${LOCAL_TEXTURE_BASE}/earth/2k_earth_normal_map.png`,
  earth_specular: `${LOCAL_TEXTURE_BASE}/earth/2k_earth_specular_map.png`,
  moon: `${LOCAL_TEXTURE_BASE}/moons/2k_moon.jpg`,
  mars: `${LOCAL_TEXTURE_BASE}/mars/2k_mars.jpg`,
  jupiter: `${LOCAL_TEXTURE_BASE}/jupiter/2k_jupiter.jpg`,
  saturn: `${LOCAL_TEXTURE_BASE}/saturn/2k_saturn.jpg`,
  saturn_ring: `${LOCAL_TEXTURE_BASE}/saturn/2k_saturn_ring_alpha.png`,
  uranus: `${LOCAL_TEXTURE_BASE}/uranus/2k_uranus.jpg`,
  neptune: `${LOCAL_TEXTURE_BASE}/neptune/2k_neptune.jpg`,
  pluto: `${LOCAL_TEXTURE_BASE}/pluto/2k_pluto.jpg`,
  stars: `${LOCAL_TEXTURE_BASE}/skybox/2k_stars_milky_way.jpg`
};

/** Maximum expected celestial bodies (for loop bounds) */
const MAX_BODIES = 200;

/** Maximum asteroids in the belt */
const MAX_ASTEROID_COUNT = 10000;

/** Valid planet names that must have data */
const REQUIRED_PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;

export class SolarSystemBuilder {
  private scene: THREE.Scene;
  private textureLoader: THREE.TextureLoader;

  // All celestial bodies
  private sun: Sun | null = null;
  private planets: Map<string, Planet> = new Map();
  private moons: Map<string, Moon[]> = new Map();
  private ringSystems: Map<string, RingSystem> = new Map();
  private allBodies: CelestialBody[] = [];

  /**
   * Create a new SolarSystemBuilder
   *
   * PRECONDITIONS:
   * - scene must be a valid THREE.Scene
   */
  constructor(scene: THREE.Scene) {
    // PRECONDITION
    invariant(
      scene instanceof THREE.Scene,
      'scene must be a THREE.Scene instance'
    );

    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
  }

  /**
   * Build the complete solar system
   *
   * PRECONDITIONS:
   * - All required planet data must exist in data files
   *
   * POSTCONDITIONS:
   * - Sun is created
   * - All 8 planets are created
   * - Moons are attached to their planets
   * - allBodies contains at least 9 bodies (Sun + 8 planets)
   */
  async build(onProgress?: ProgressCallback): Promise<void> {
    // PRECONDITION: Verify all required data exists before building
    for (const planetName of REQUIRED_PLANETS) {
      invariant(
        planetName in PLANET_ORBITAL_DATA,
        `Orbital data must exist for planet: ${planetName}`,
        { planet: planetName, availableData: Object.keys(PLANET_ORBITAL_DATA) }
      );
      invariant(
        planetName in PLANET_PHYSICAL_DATA,
        `Physical data must exist for planet: ${planetName}`,
        { planet: planetName, availableData: Object.keys(PLANET_PHYSICAL_DATA) }
      );
    }

    let step = 0;
    const totalSteps = 11; // Sun + 8 planets + moons + dwarf planets

    // Helper to calculate progress, clamped to [0, 1] to avoid floating-point errors
    const getProgress = () => Math.min(1, step / totalSteps);

    // Create Sun
    onProgress?.(getProgress(), 'Creating the Sun...');
    await this.createSun();
    step++;

    // POSTCONDITION: Sun must be created
    postcondition(
      this.sun !== null,
      'Sun must be created after createSun()'
    );

    // Create planets
    const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

    for (const name of planetNames) {
      onProgress?.(getProgress(), `Creating ${name.charAt(0).toUpperCase() + name.slice(1)}...`);
      await this.createPlanet(name);

      // POSTCONDITION: Planet must be created
      postcondition(
        this.planets.has(name),
        `Planet ${name} must be created after createPlanet()`
      );

      step++;
    }

    // Create major moons
    onProgress?.(getProgress(), 'Creating moons...');
    await this.createMoons();
    step++;

    // Create dwarf planets
    onProgress?.(getProgress(), 'Creating dwarf planets...');
    await this.createDwarfPlanets();
    step++;

    // Create asteroid belt (simplified)
    onProgress?.(getProgress(), 'Creating asteroid belt...');
    this.createAsteroidBelt();

    onProgress?.(1, 'Solar system complete!');

    // POSTCONDITIONS
    postcondition(
      this.allBodies.length >= 9,
      'Solar system must have at least 9 bodies (Sun + 8 planets)',
      { actualCount: this.allBodies.length }
    );
    postcondition(
      this.planets.size >= 8,
      'Solar system must have at least 8 planets',
      { actualCount: this.planets.size }
    );
    invariant(
      this.allBodies.length <= MAX_BODIES,
      'Body count exceeds maximum',
      { count: this.allBodies.length, max: MAX_BODIES }
    );
  }

  /**
   * Create the Sun
   *
   * POSTCONDITIONS:
   * - this.sun is not null
   * - Sun is added to scene
   * - Sun is in allBodies
   */
  private async createSun(): Promise<void> {
    this.sun = new Sun();

    // POSTCONDITION: Sun instance created
    postcondition(this.sun !== null, 'Sun instance must be created');

    this.sun.init();
    this.scene.add(this.sun.getGroup());
    this.allBodies.push(this.sun);

    // POSTCONDITION: Sun is tracked
    postcondition(
      this.allBodies.includes(this.sun),
      'Sun must be in allBodies after creation'
    );
  }

  /**
   * Create a planet by name
   *
   * PRECONDITIONS:
   * - name must be a valid planet name
   * - Orbital data must exist for this planet
   * - Physical data must exist for this planet
   *
   * POSTCONDITIONS:
   * - Planet is created and stored
   * - Planet is added to scene
   * - Planet is in allBodies
   */
  private async createPlanet(name: string): Promise<void> {
    // PRECONDITIONS
    invariant(
      name.length > 0,
      'Planet name must not be empty'
    );
    invariant(
      name in PLANET_ORBITAL_DATA,
      `Orbital data must exist for planet`,
      { planet: name, validPlanets: Object.keys(PLANET_ORBITAL_DATA) }
    );
    invariant(
      name in PLANET_PHYSICAL_DATA,
      `Physical data must exist for planet`,
      { planet: name, validPlanets: Object.keys(PLANET_PHYSICAL_DATA) }
    );

    const orbitalData = PLANET_ORBITAL_DATA[name];
    const physicalData = PLANET_PHYSICAL_DATA[name];

    // These are guaranteed by the invariants above, but TypeScript doesn't know
    const validOrbitalData = assertDefined(orbitalData, `${name} orbital data`);
    const validPhysicalData = assertDefined(physicalData, `${name} physical data`);

    // Configure planet based on type
    const config: PlanetConfig = {
      name: validPhysicalData.name,
      physicalData: validPhysicalData,
      orbitalElements: validOrbitalData
    };

    // Set atmosphere and texture options based on planet
    switch (name) {
      case 'mercury':
        config.textureUrl = TEXTURE_URLS.mercury;
        break;

      case 'venus':
        config.textureUrl = TEXTURE_URLS.venus_surface;
        config.cloudsTextureUrl = TEXTURE_URLS.venus_atmosphere;
        config.hasAtmosphere = true;
        config.hasClouds = true;
        config.atmosphereColor = new THREE.Color(0xffe4b3);
        config.atmosphereIntensity = 1.2;
        break;

      case 'earth':
        config.textureUrl = TEXTURE_URLS.earth_day;
        config.normalMapUrl = TEXTURE_URLS.earth_normal;
        config.specularMapUrl = TEXTURE_URLS.earth_specular;
        config.cloudsTextureUrl = TEXTURE_URLS.earth_clouds;
        config.nightTextureUrl = TEXTURE_URLS.earth_night;
        config.hasAtmosphere = true;
        config.hasClouds = true;
        config.hasNightLights = true;
        config.atmosphereColor = new THREE.Color(0x88aaff);
        config.atmosphereIntensity = 1.0;
        break;

      case 'mars':
        config.textureUrl = TEXTURE_URLS.mars;
        config.hasAtmosphere = true;
        config.atmosphereColor = new THREE.Color(0xffaa88);
        config.atmosphereIntensity = 0.3;
        break;

      case 'jupiter':
        config.textureUrl = TEXTURE_URLS.jupiter;
        config.hasAtmosphere = true;
        config.atmosphereColor = new THREE.Color(0xffddaa);
        config.atmosphereIntensity = 0.5;
        break;

      case 'saturn':
        config.textureUrl = TEXTURE_URLS.saturn;
        config.hasAtmosphere = true;
        config.atmosphereColor = new THREE.Color(0xfff0d0);
        config.atmosphereIntensity = 0.4;
        break;

      case 'uranus':
        config.textureUrl = TEXTURE_URLS.uranus;
        config.hasAtmosphere = true;
        config.atmosphereColor = new THREE.Color(0x88ddff);
        config.atmosphereIntensity = 0.6;
        break;

      case 'neptune':
        config.textureUrl = TEXTURE_URLS.neptune;
        config.hasAtmosphere = true;
        config.atmosphereColor = new THREE.Color(0x4466ff);
        config.atmosphereIntensity = 0.7;
        break;
    }

    // Create and initialize the planet
    const planet = new Planet(config);

    // POSTCONDITION: Planet instance created
    postcondition(planet !== null, `Planet ${name} instance must be created`);

    planet.init();

    // Add to scene
    this.scene.add(planet.getGroup());
    const orbitLine = planet.getOrbitLine();
    if (orbitLine) {
      this.scene.add(orbitLine);
    }

    // Store reference
    this.planets.set(name, planet);
    this.allBodies.push(planet);

    // POSTCONDITION: Planet is tracked
    postcondition(
      this.planets.has(name),
      `Planet ${name} must be stored after creation`
    );
    postcondition(
      this.allBodies.includes(planet),
      `Planet ${name} must be in allBodies after creation`
    );

    // Load textures asynchronously (non-blocking)
    // Note: Texture loading failures are operating errors, not invariant violations
    planet.loadTextures(this.textureLoader).catch(e => {
      console.warn(`Failed to load textures for ${name}:`, e);
    });

    // Create rings for Saturn, Uranus
    if (name === 'saturn') {
      await this.createSaturnRings(planet);
    } else if (name === 'uranus') {
      await this.createUranusRings(planet);
    }
  }

  /**
   * Create Saturn's ring system
   *
   * PRECONDITIONS:
   * - saturn must be a valid Planet
   * - Saturn's radius must be positive
   *
   * POSTCONDITIONS:
   * - Ring system is created and attached
   * - Ring inner radius < outer radius
   */
  private async createSaturnRings(saturn: Planet): Promise<void> {
    // PRECONDITION
    invariant(saturn !== null, 'Saturn must not be null');

    const saturnRadius = saturn.getScaledRadius();
    assertPositive(saturnRadius, 'Saturn radius');

    const innerRadius = saturnRadius * 1.2;
    const outerRadius = saturnRadius * 2.3;

    // INVARIANT: Ring geometry must be valid
    invariant(
      outerRadius > innerRadius,
      'Ring outer radius must exceed inner radius',
      { innerRadius, outerRadius }
    );

    const ringSystem = new RingSystem({
      innerRadius,
      outerRadius,
      tilt: 26.73,
      opacity: 0.9,
      segments: 128
    });

    // POSTCONDITION: Ring mesh created
    const mesh = ringSystem.getMesh();
    postcondition(mesh !== null, 'Saturn ring mesh must be created');

    saturn.getGroup().add(mesh);
    this.ringSystems.set('saturn', ringSystem);

    // POSTCONDITION: Ring stored
    postcondition(
      this.ringSystems.has('saturn'),
      'Saturn rings must be stored'
    );
  }

  /**
   * Create Uranus's ring system
   *
   * PRECONDITIONS:
   * - uranus must be a valid Planet
   * - Uranus's radius must be positive
   *
   * POSTCONDITIONS:
   * - Ring system is created and attached
   */
  private async createUranusRings(uranus: Planet): Promise<void> {
    // PRECONDITION
    invariant(uranus !== null, 'Uranus must not be null');

    const uranusRadius = uranus.getScaledRadius();
    assertPositive(uranusRadius, 'Uranus radius');

    const innerRadius = uranusRadius * 1.5;
    const outerRadius = uranusRadius * 2.0;

    // INVARIANT: Ring geometry must be valid
    invariant(
      outerRadius > innerRadius,
      'Ring outer radius must exceed inner radius',
      { innerRadius, outerRadius }
    );

    const ringSystem = new RingSystem({
      innerRadius,
      outerRadius,
      tilt: 97.77, // Uranus is tilted!
      opacity: 0.3,
      segments: 64
    });

    // POSTCONDITION: Ring mesh created
    const mesh = ringSystem.getMesh();
    postcondition(mesh !== null, 'Uranus ring mesh must be created');

    uranus.getGroup().add(mesh);
    this.ringSystems.set('uranus', ringSystem);

    // POSTCONDITION: Ring stored
    postcondition(
      this.ringSystems.has('uranus'),
      'Uranus rings must be stored'
    );
  }

  private async createMoons(): Promise<void> {
    // Earth's Moon
    const earth = this.planets.get('earth');
    if (earth) {
      const luna = this.createMoon(
        'Moon',
        1737.4,
        MOON_ORBITAL_DATA.earth.moon,
        earth,
        0xcccccc,
        TEXTURE_URLS.moon
      );
      this.storeMoon('earth', luna);
    }

    // Mars moons
    const mars = this.planets.get('mars');
    if (mars && MOON_ORBITAL_DATA.mars) {
      const phobos = this.createMoon('Phobos', 11.267, MOON_ORBITAL_DATA.mars.phobos, mars, 0xab9375);
      const deimos = this.createMoon('Deimos', 6.2, MOON_ORBITAL_DATA.mars.deimos, mars, 0xab9375);
      this.storeMoon('mars', phobos);
      this.storeMoon('mars', deimos);
    }

    // Jupiter's Galilean moons
    const jupiter = this.planets.get('jupiter');
    if (jupiter && MOON_ORBITAL_DATA.jupiter) {
      const io = this.createMoon('Io', 1821.6, MOON_ORBITAL_DATA.jupiter.io, jupiter, 0xffcc00);
      const europa = this.createMoon('Europa', 1560.8, MOON_ORBITAL_DATA.jupiter.europa, jupiter, 0xccddee);
      const ganymede = this.createMoon('Ganymede', 2634.1, MOON_ORBITAL_DATA.jupiter.ganymede, jupiter, 0xbbaa99);
      const callisto = this.createMoon('Callisto', 2410.3, MOON_ORBITAL_DATA.jupiter.callisto, jupiter, 0x99887a);
      this.storeMoon('jupiter', io);
      this.storeMoon('jupiter', europa);
      this.storeMoon('jupiter', ganymede);
      this.storeMoon('jupiter', callisto);
    }

    // Saturn's major moons
    const saturn = this.planets.get('saturn');
    if (saturn && MOON_ORBITAL_DATA.saturn) {
      const titan = this.createMoon('Titan', 2574.7, MOON_ORBITAL_DATA.saturn.titan, saturn, 0xddaa55);
      const enceladus = this.createMoon('Enceladus', 252.1, MOON_ORBITAL_DATA.saturn.enceladus, saturn, 0xffffff);
      const mimas = this.createMoon('Mimas', 198.2, MOON_ORBITAL_DATA.saturn.mimas, saturn, 0xcccccc);
      this.storeMoon('saturn', titan);
      this.storeMoon('saturn', enceladus);
      this.storeMoon('saturn', mimas);
    }

    // Uranus moons
    const uranus = this.planets.get('uranus');
    if (uranus && MOON_ORBITAL_DATA.uranus) {
      const miranda = this.createMoon('Miranda', 235.8, MOON_ORBITAL_DATA.uranus.miranda, uranus, 0xcccccc);
      const ariel = this.createMoon('Ariel', 578.9, MOON_ORBITAL_DATA.uranus.ariel, uranus, 0xdddddd);
      const titania = this.createMoon('Titania', 788.4, MOON_ORBITAL_DATA.uranus.titania, uranus, 0xbbbbbb);
      this.storeMoon('uranus', miranda);
      this.storeMoon('uranus', ariel);
      this.storeMoon('uranus', titania);
    }

    // Neptune's Triton
    const neptune = this.planets.get('neptune');
    if (neptune && MOON_ORBITAL_DATA.neptune) {
      const triton = this.createMoon('Triton', 1353.4, MOON_ORBITAL_DATA.neptune.triton, neptune, 0xaabbcc);
      this.storeMoon('neptune', triton);
    }
  }

  /**
   * Create a moon
   *
   * PRECONDITIONS:
   * - name must not be empty
   * - radius must be positive
   * - parent must be a valid CelestialBody
   *
   * POSTCONDITIONS:
   * - Moon is created and added to scene
   * - Moon is in allBodies
   */
  private createMoon(
    name: string,
    radius: number,
    orbitalElements: typeof MOON_ORBITAL_DATA.earth.moon,
    parent: CelestialBody,
    color: number,
    textureUrl?: string
  ): Moon {
    // PRECONDITIONS
    invariant(name.length > 0, 'Moon name must not be empty');
    assertPositive(radius, `Moon ${name} radius`);
    invariant(parent !== null, `Moon ${name} must have a parent body`);
    invariant(
      orbitalElements !== null && orbitalElements !== undefined,
      `Moon ${name} must have orbital elements`
    );

    const moon = new Moon({
      name,
      radius,
      orbitalElements,
      parentBody: parent,
      color,
      textureUrl,
      tidallyLocked: true
    });

    // POSTCONDITION: Moon created
    postcondition(moon !== null, `Moon ${name} must be created`);

    moon.init();
    this.scene.add(moon.getGroup());
    this.allBodies.push(moon);

    // POSTCONDITION: Moon tracked
    postcondition(
      this.allBodies.includes(moon),
      `Moon ${name} must be in allBodies`
    );

    if (textureUrl) {
      moon.loadTexture(this.textureLoader);
    }

    return moon;
  }

  /**
   * Store a moon reference under its parent planet
   *
   * PRECONDITIONS:
   * - parentName must not be empty
   * - moon must not be null
   *
   * POSTCONDITIONS:
   * - Moon is stored in the moons map
   */
  private storeMoon(parentName: string, moon: Moon): void {
    // PRECONDITIONS
    invariant(parentName.length > 0, 'Parent name must not be empty');
    invariant(moon !== null, 'Moon must not be null');

    if (!this.moons.has(parentName)) {
      this.moons.set(parentName, []);
    }

    const moonList = this.moons.get(parentName);
    invariant(moonList !== undefined, 'Moon list must exist after creation');
    moonList.push(moon);

    // POSTCONDITION
    postcondition(
      this.moons.get(parentName)?.includes(moon),
      `Moon must be stored under ${parentName}`
    );
  }

  private async createDwarfPlanets(): Promise<void> {
    // Pluto
    if (DWARF_PLANET_ORBITAL_DATA.pluto && DWARF_PLANET_PHYSICAL_DATA.pluto) {
      const plutoConfig: PlanetConfig = {
        name: 'Pluto',
        physicalData: DWARF_PLANET_PHYSICAL_DATA.pluto,
        orbitalElements: DWARF_PLANET_ORBITAL_DATA.pluto,
        textureUrl: TEXTURE_URLS.pluto
      };

      const pluto = new Planet(plutoConfig);
      pluto.init();
      this.scene.add(pluto.getGroup());
      const orbitLine = pluto.getOrbitLine();
      if (orbitLine) {
        this.scene.add(orbitLine);
      }
      this.planets.set('pluto', pluto);
      this.allBodies.push(pluto);
      pluto.loadTextures(this.textureLoader);

      // Charon
      if (MOON_ORBITAL_DATA.pluto?.charon) {
        const charon = this.createMoon('Charon', 606, MOON_ORBITAL_DATA.pluto.charon, pluto, 0x888888);
        this.storeMoon('pluto', charon);
      }
    }

    // Ceres
    if (DWARF_PLANET_ORBITAL_DATA.ceres && DWARF_PLANET_PHYSICAL_DATA.ceres) {
      const ceresConfig: PlanetConfig = {
        name: 'Ceres',
        physicalData: DWARF_PLANET_PHYSICAL_DATA.ceres,
        orbitalElements: DWARF_PLANET_ORBITAL_DATA.ceres
      };

      const ceres = new Planet(ceresConfig);
      ceres.init();
      this.scene.add(ceres.getGroup());
      this.planets.set('ceres', ceres);
      this.allBodies.push(ceres);
    }
  }

  /**
   * Create the asteroid belt
   *
   * INVARIANTS:
   * - Asteroid count must not exceed maximum
   * - Inner radius must be less than outer radius
   * - All instanced matrices must be valid
   */
  private createAsteroidBelt(): void {
    // Create a simplified asteroid belt using instanced meshes
    const asteroidCount = 3000;

    // INVARIANT: Asteroid count must be reasonable
    invariant(
      asteroidCount > 0 && asteroidCount <= MAX_ASTEROID_COUNT,
      'Asteroid count must be between 1 and maximum',
      { count: asteroidCount, max: MAX_ASTEROID_COUNT }
    );

    const SCALE = CelestialBody.SCALE_FACTOR;
    assertPositive(SCALE, 'Scale factor');

    // Asteroid size - larger for visibility
    const geometry = new THREE.IcosahedronGeometry(0.8, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x998877,
      roughness: 0.9,
      metalness: 0.2,
      emissive: 0x444444,
      emissiveIntensity: 0.3
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, asteroidCount);
    instancedMesh.name = 'asteroid_belt';
    instancedMesh.userData.isAsteroidBelt = true;

    const dummy = new THREE.Object3D();
    const innerRadius = 2.2 * SCALE; // AU scaled
    const outerRadius = 3.2 * SCALE; // AU scaled

    // INVARIANT: Belt geometry must be valid
    invariant(
      outerRadius > innerRadius,
      'Asteroid belt outer radius must exceed inner radius',
      { innerRadius, outerRadius }
    );
    assertPositive(innerRadius, 'Asteroid belt inner radius');
    assertPositive(outerRadius, 'Asteroid belt outer radius');

    for (let i = 0; i < asteroidCount; i++) {
      // Random position in the belt
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const height = (Math.random() - 0.5) * 15; // Vertical spread scaled

      dummy.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      // Random rotation
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Random scale - larger asteroids
      const scale = 0.5 + Math.random() * 1.5;
      assertPositive(scale, 'Asteroid scale');
      dummy.scale.set(scale, scale, scale);

      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    this.scene.add(instancedMesh);
  }

  /**
   * Update all celestial bodies
   *
   * PRECONDITIONS:
   * - julianDate must be finite
   * - delta must be finite and non-negative
   * - timeScale must be finite
   *
   * INVARIANTS:
   * - Body count must not exceed maximum
   */
  update(julianDate: number, delta: number, timeScale: number = 1): void {
    // PRECONDITIONS
    assertFinite(julianDate, 'Julian date');
    assertFinite(delta, 'Delta time');
    assertNonNegative(delta, 'Delta time');
    assertFinite(timeScale, 'Time scale');

    // INVARIANT: Body count bounds
    invariant(
      this.allBodies.length <= MAX_BODIES,
      'Body count exceeds maximum during update',
      { count: this.allBodies.length, max: MAX_BODIES }
    );

    // Update all celestial bodies with Julian Date and time scale for rotation
    for (const body of this.allBodies) {
      body.update(julianDate, delta, timeScale);
    }

    // Update ring systems with sun position
    const sunPos = this.sun?.getPosition() || new THREE.Vector3(0, 0, 0);

    for (const [name, ringSystem] of this.ringSystems) {
      const planet = this.planets.get(name);
      if (planet) {
        ringSystem.update(sunPos, planet.getPosition(), planet.getScaledRadius());
      }
    }
  }

  // Accessors with assertions

  /**
   * Get the Sun
   * @returns Sun or null if not yet created
   */
  getSun(): Sun | null {
    return this.sun;
  }

  /**
   * Get a planet by name
   *
   * PRECONDITIONS:
   * - name must not be empty
   */
  getPlanet(name: string): Planet | undefined {
    invariant(name.length > 0, 'Planet name must not be empty');
    return this.planets.get(name.toLowerCase());
  }

  /**
   * Get all planets
   *
   * POSTCONDITIONS:
   * - Returned array length matches planets map size
   */
  getAllPlanets(): Planet[] {
    const planets = Array.from(this.planets.values());
    postcondition(
      planets.length === this.planets.size,
      'getAllPlanets must return all planets'
    );
    return planets;
  }

  /**
   * Get moons for a planet
   *
   * PRECONDITIONS:
   * - planetName must not be empty
   */
  getMoons(planetName: string): Moon[] {
    invariant(planetName.length > 0, 'Planet name must not be empty');
    return this.moons.get(planetName.toLowerCase()) || [];
  }

  /**
   * Get all celestial bodies
   */
  getAllBodies(): CelestialBody[] {
    return this.allBodies;
  }

  /**
   * Get a body by name
   *
   * PRECONDITIONS:
   * - name must not be empty
   * - allBodies must not be empty
   */
  getBodyByName(name: string): CelestialBody | undefined {
    invariant(name.length > 0, 'Body name must not be empty');
    invariant(
      this.allBodies.length > 0,
      'Cannot search empty body list'
    );

    return this.allBodies.find(
      body => body.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Visibility controls

  /**
   * Toggle orbit line visibility for all bodies
   */
  setOrbitLinesVisible(visible: boolean): void {
    for (const body of this.allBodies) {
      body.setOrbitLineVisible(visible);
    }
  }

  /**
   * Toggle moon visibility
   */
  setMoonsVisible(visible: boolean): void {
    for (const [, moonList] of this.moons) {
      for (const moon of moonList) {
        moon.setVisible(visible);
        moon.setOrbitLineVisible(visible);
      }
    }
  }
}
