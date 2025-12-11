/**
 * SceneManager - Main scene container and management
 * Handles the Three.js scene, background, and object management
 *
 * NEGATIVE SPACE: This class asserts that scene groups are created,
 * that starfield geometry is valid, and that raycasting has valid inputs.
 */

import * as THREE from 'three';
import { TextureLoader } from './TextureLoader';
import {
  invariant,
  assertFinite,
  assertDefined,
  postcondition
} from '../utils/invariant';

/** Maximum number of stars in starfield */
const MAX_STAR_COUNT = 50000;
/** Maximum number of Milky Way particles */
const MAX_MILKY_WAY_PARTICLES = 20000;

export class SceneManager {
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private textureLoader: TextureLoader;

  // Object groups for organization
  private celestialBodies: THREE.Group;
  private orbitLines: THREE.Group;
  private labels: THREE.Group;
  private particles: THREE.Group;

  // Skybox elements that follow the camera
  private starfield: THREE.Points | null = null;
  private milkyWay: THREE.Points | null = null;

  /**
   * Create a new SceneManager
   *
   * POSTCONDITIONS:
   * - Scene is created
   * - All object groups are created and added to scene
   */
  constructor() {
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.textureLoader = new TextureLoader();

    // POSTCONDITION: Scene created
    postcondition(
      this.scene !== null,
      'Scene must be created'
    );

    // Create object groups
    this.celestialBodies = new THREE.Group();
    this.celestialBodies.name = 'celestialBodies';

    this.orbitLines = new THREE.Group();
    this.orbitLines.name = 'orbitLines';

    this.labels = new THREE.Group();
    this.labels.name = 'labels';

    this.particles = new THREE.Group();
    this.particles.name = 'particles';

    // POSTCONDITION: All groups created
    postcondition(
      this.celestialBodies !== null && this.orbitLines !== null &&
      this.labels !== null && this.particles !== null,
      'All scene groups must be created'
    );

    // Add groups to scene
    this.scene.add(this.celestialBodies);
    this.scene.add(this.orbitLines);
    this.scene.add(this.labels);
    this.scene.add(this.particles);
  }

  async init(): Promise<void> {
    // Create starfield background
    await this.createStarfield();

    // Ambient light provides base illumination for all objects
    // This simulates light from distant stars and nebulae
    // Higher intensity so objects are visible from all angles (especially dark moons)
    const ambientLight = new THREE.AmbientLight(0x606080, 0.8);
    this.scene.add(ambientLight);

    // Hemisphere light adds subtle fill from "space" above and below
    // Sky color is blue-ish (space), ground is warmer (reflected light)
    const hemisphereLight = new THREE.HemisphereLight(0x6080a0, 0x504030, 0.5);
    this.scene.add(hemisphereLight);
  }

  /**
   * Create starfield background
   *
   * INVARIANTS:
   * - Star count must not exceed maximum
   * - All generated positions must be finite
   */
  private async createStarfield(): Promise<void> {
    // Create a procedural starfield as a sphere around the scene
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 15000;

    // INVARIANT: Star count within bounds
    invariant(
      starCount <= MAX_STAR_COUNT,
      'Star count must not exceed maximum',
      { starCount, max: MAX_STAR_COUNT }
    );

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Random position on a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 50000; // Very far away

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Star colors - mostly white with some variation
      const starType = Math.random();
      if (starType < 0.7) {
        // White/yellow stars
        color.setHSL(0.1, 0.2, 0.8 + Math.random() * 0.2);
      } else if (starType < 0.85) {
        // Blue stars
        color.setHSL(0.6, 0.4, 0.7 + Math.random() * 0.3);
      } else if (starType < 0.95) {
        // Red/orange stars
        color.setHSL(0.05, 0.6, 0.6 + Math.random() * 0.3);
      } else {
        // Bright white stars
        color.setHSL(0, 0, 1);
      }

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Random sizes (mostly small with some larger)
      const sizeRandom = Math.random();
      if (sizeRandom < 0.9) {
        sizes[i] = 1 + Math.random() * 2;
      } else if (sizeRandom < 0.98) {
        sizes[i] = 3 + Math.random() * 3;
      } else {
        sizes[i] = 6 + Math.random() * 4;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Star shader material
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;

        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z) * 100.0;
          gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5);

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.name = 'starfield';
    this.starfield = stars;
    this.scene.add(stars);

    // Add Milky Way band (subtle)
    await this.createMilkyWay();
  }

  /**
   * Create Milky Way particle effect
   *
   * INVARIANTS:
   * - Particle count must not exceed maximum
   */
  private async createMilkyWay(): Promise<void> {
    // Create a subtle milky way band
    const milkyWayGeometry = new THREE.BufferGeometry();
    const particleCount = 5000;

    // INVARIANT: Particle count within bounds
    invariant(
      particleCount <= MAX_MILKY_WAY_PARTICLES,
      'Milky Way particle count must not exceed maximum',
      { particleCount, max: MAX_MILKY_WAY_PARTICLES }
    );

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Concentrate particles along the galactic plane
      const angle = Math.random() * Math.PI * 2;
      const radius = 40000 + Math.random() * 10000;

      // Add some thickness to the band
      const heightSpread = (Math.random() - 0.5) * 8000;

      positions[i3] = radius * Math.cos(angle);
      positions[i3 + 1] = heightSpread; // Y is up
      positions[i3 + 2] = radius * Math.sin(angle);

      // Milky colors
      const brightness = 0.3 + Math.random() * 0.3;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness * 0.95;
      colors[i3 + 2] = brightness * 1.1;

      sizes[i] = 10 + Math.random() * 30;
    }

    milkyWayGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    milkyWayGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    milkyWayGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const milkyWayMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (1.0 / -mvPosition.z) * 50.0;
          gl_PointSize = clamp(gl_PointSize, 0.5, 20.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 2.0) * 0.15;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const milkyWay = new THREE.Points(milkyWayGeometry, milkyWayMaterial);
    milkyWay.name = 'milkyWay';
    milkyWay.rotation.x = Math.PI * 0.1; // Tilt slightly
    this.milkyWay = milkyWay;
    this.scene.add(milkyWay);
  }

  /**
   * Update skybox position to follow camera
   * This ensures stars are always visible no matter how far you travel
   */
  updateSkybox(cameraPosition: THREE.Vector3): void {
    if (this.starfield) {
      this.starfield.position.copy(cameraPosition);
    }
    if (this.milkyWay) {
      this.milkyWay.position.copy(cameraPosition);
    }
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCelestialBodiesGroup(): THREE.Group {
    return this.celestialBodies;
  }

  getOrbitLinesGroup(): THREE.Group {
    return this.orbitLines;
  }

  getLabelsGroup(): THREE.Group {
    return this.labels;
  }

  getParticlesGroup(): THREE.Group {
    return this.particles;
  }

  getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  getTextureLoader(): TextureLoader {
    return this.textureLoader;
  }

  /**
   * Raycast for object picking
   *
   * PRECONDITIONS:
   * - mouse coordinates must be finite
   */
  raycast(
    mouse: THREE.Vector2,
    camera: THREE.Camera,
    objects?: THREE.Object3D[]
  ): THREE.Intersection[] {
    // PRECONDITIONS
    assertFinite(mouse.x, 'Raycast mouse x');
    assertFinite(mouse.y, 'Raycast mouse y');

    this.raycaster.setFromCamera(mouse, camera);
    const targets = objects || this.celestialBodies.children;
    return this.raycaster.intersectObjects(targets, true);
  }

  // Add object to appropriate group
  addCelestialBody(object: THREE.Object3D): void {
    this.celestialBodies.add(object);
  }

  addOrbitLine(line: THREE.Object3D): void {
    this.orbitLines.add(line);
  }

  addLabel(label: THREE.Object3D): void {
    this.labels.add(label);
  }

  addParticles(particles: THREE.Object3D): void {
    this.particles.add(particles);
  }

  // Toggle visibility
  setOrbitLinesVisible(visible: boolean): void {
    this.orbitLines.visible = visible;
  }

  setLabelsVisible(visible: boolean): void {
    this.labels.visible = visible;
  }
}
