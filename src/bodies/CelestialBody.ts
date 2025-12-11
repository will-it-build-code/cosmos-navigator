/**
 * CelestialBody - Base class for all solar system objects
 * Handles orbital mechanics, rendering, and updates
 *
 * NEGATIVE SPACE: This class asserts that all configuration values are valid,
 * that geometry is properly created, and that update calculations produce
 * finite results.
 */

import * as THREE from 'three';
import { OrbitalElements, calculatePosition } from './OrbitalMechanics';
import {
  invariant,
  assertPositive,
  assertNonNegative,
  assertFinite,
  postcondition
} from '../utils/invariant';

/** Valid celestial body types */
const VALID_BODY_TYPES = ['star', 'planet', 'dwarf_planet', 'moon', 'asteroid', 'comet', 'spacecraft'] as const;

/** Maximum orbit line segments */
const MAX_ORBIT_SEGMENTS = 1000;

export interface CelestialBodyConfig {
  name: string;
  type: 'star' | 'planet' | 'dwarf_planet' | 'moon' | 'asteroid' | 'comet' | 'spacecraft';
  radius: number; // km
  mass?: number; // kg
  rotationPeriod?: number; // hours
  axialTilt?: number; // degrees
  orbitalElements?: OrbitalElements;
  parentBody?: CelestialBody;
  color?: number;
  emissive?: number;
  textureUrl?: string;
  normalMapUrl?: string;
  specularMapUrl?: string;
}

export abstract class CelestialBody {
  name: string;
  type: string;
  radius: number;
  mass: number;
  rotationPeriod: number;
  axialTilt: number;
  orbitalElements?: OrbitalElements;
  parentBody?: CelestialBody;

  // Three.js objects
  protected group: THREE.Group;
  protected mesh: THREE.Mesh | null = null;
  protected orbitLine: THREE.Line | null = null;

  // Scale factor for visualization
  // We use a logarithmic-like scale to make things visible
  // Distances: 1 unit = 1 AU (so Earth is at distance 1 from Sun), then multiplied by SCALE_FACTOR
  // Sizes: Exaggerated so planets are visible but proportional
  static readonly SCALE_FACTOR = 100; // 100 units = 1 AU for better camera work
  // For Earth (radius 6371 km): 6371 * 0.00001 * 30 = 1.91 units
  // Earth at 100 units from Sun, so planet is ~2% of orbital distance (visible but not absurd)
  static readonly SIZE_SCALE = 0.00001; // Base size scale (km to AU-ish units)
  static readonly SIZE_EXAGGERATION = 30; // Moderate exaggeration for visibility
  // Moon orbits need additional scaling to be visible outside exaggerated parent planets
  // Without this, moons would be inside the planet due to SIZE_EXAGGERATION
  static readonly MOON_ORBIT_SCALE = 50; // Exaggerate moon orbital distances

  /**
   * Create a new CelestialBody
   *
   * PRECONDITIONS:
   * - config.name must not be empty
   * - config.type must be a valid body type
   * - config.radius must be positive
   * - config.mass (if provided) must be non-negative
   * - config.rotationPeriod (if provided) must be positive
   *
   * POSTCONDITIONS:
   * - group is created with proper userData
   */
  constructor(config: CelestialBodyConfig) {
    // PRECONDITIONS
    invariant(
      config.name.length > 0,
      'Celestial body name must not be empty'
    );
    invariant(
      VALID_BODY_TYPES.includes(config.type),
      'Celestial body type must be valid',
      { type: config.type, validTypes: VALID_BODY_TYPES }
    );
    assertPositive(config.radius, `${config.name} radius`);

    if (config.mass !== undefined) {
      assertNonNegative(config.mass, `${config.name} mass`);
    }
    if (config.rotationPeriod !== undefined) {
      // Rotation period can be negative (retrograde rotation like Venus/Uranus)
      // but must be non-zero
      invariant(
        config.rotationPeriod !== 0,
        `${config.name} rotation period must be non-zero`,
        { actual: config.rotationPeriod }
      );
      assertFinite(config.rotationPeriod, `${config.name} rotation period`);
    }

    this.name = config.name;
    this.type = config.type;
    this.radius = config.radius;
    this.mass = config.mass || 0;
    // rotationPeriod: 0 means no autonomous rotation (e.g., tidally locked moons)
    // Negative values are valid for retrograde rotation (Venus, Uranus)
    this.rotationPeriod = config.rotationPeriod ?? 0;
    this.axialTilt = config.axialTilt || 0;
    this.orbitalElements = config.orbitalElements;
    this.parentBody = config.parentBody;

    // Create the main group
    this.group = new THREE.Group();
    this.group.name = this.name;
    this.group.userData = {
      isCelestialBody: true,
      name: this.name,
      type: this.type,
      radius: this.getScaledRadius()
    };

    // POSTCONDITIONS
    postcondition(
      this.group !== null,
      'Group must be created'
    );
    postcondition(
      this.group.userData.isCelestialBody === true,
      'Group must have celestial body userData'
    );
  }

  abstract createMesh(): THREE.Mesh | THREE.Group;

  /**
   * Initialize the celestial body
   *
   * POSTCONDITIONS:
   * - Visual mesh is added to group
   * - Orbit line is created if orbital elements exist
   */
  init(): void {
    // Create the visual mesh
    const visual = this.createMesh();

    // POSTCONDITION: Mesh must be created
    postcondition(
      visual !== null,
      `${this.name} visual mesh must be created`
    );

    if (visual instanceof THREE.Mesh) {
      this.mesh = visual;
    }
    this.group.add(visual);

    // Apply axial tilt
    if (this.axialTilt !== 0) {
      assertFinite(this.axialTilt, `${this.name} axial tilt`);
      const tiltRadians = THREE.MathUtils.degToRad(this.axialTilt);
      assertFinite(tiltRadians, `${this.name} tilt radians`);
      this.group.rotation.z = tiltRadians;
    }

    // Create orbit line if we have orbital elements
    if (this.orbitalElements) {
      this.createOrbitLine();
    }
  }

  /**
   * Create the orbit visualization line
   *
   * PRECONDITIONS:
   * - orbitalElements must exist
   *
   * POSTCONDITIONS:
   * - orbitLine is created with valid geometry
   *
   * INVARIANTS:
   * - Segment count must not exceed maximum
   * - All generated points must be finite
   */
  protected createOrbitLine(): void {
    if (!this.orbitalElements) return;

    const points: THREE.Vector3[] = [];
    const segments = 256;

    // INVARIANT: Segment count bounds
    invariant(
      segments > 0 && segments <= MAX_ORBIT_SEGMENTS,
      'Orbit segment count must be within bounds',
      { segments, max: MAX_ORBIT_SEGMENTS }
    );

    // Use moon orbit scale for bodies with parents (moons)
    const orbitScale = this.parentBody
      ? CelestialBody.SCALE_FACTOR * CelestialBody.MOON_ORBIT_SCALE
      : CelestialBody.SCALE_FACTOR;

    // Generate points around the orbit
    for (let i = 0; i <= segments; i++) {
      const meanAnomaly = (i / segments) * 360;
      const tempElements = { ...this.orbitalElements, meanAnomaly };
      const pos = calculatePosition(tempElements, 0);

      // INVARIANT: Calculated positions must be finite
      assertFinite(pos.x, `${this.name} orbit point x at segment ${i}`);
      assertFinite(pos.y, `${this.name} orbit point y at segment ${i}`);
      assertFinite(pos.z, `${this.name} orbit point z at segment ${i}`);

      points.push(new THREE.Vector3(
        pos.x * orbitScale,
        pos.y * orbitScale,
        pos.z * orbitScale
      ));
    }

    // POSTCONDITION: Points generated
    postcondition(
      points.length === segments + 1,
      `${this.name} orbit must have correct number of points`,
      { expected: segments + 1, actual: points.length }
    );

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x6688aa,
      transparent: true,
      opacity: 0.5
    });

    this.orbitLine = new THREE.Line(geometry, material);
    this.orbitLine.name = `${this.name}_orbit`;
    this.orbitLine.frustumCulled = false; // Always render orbit lines

    // POSTCONDITION: Orbit line created
    postcondition(
      this.orbitLine !== null,
      `${this.name} orbit line must be created`
    );
  }

  /**
   * Update the celestial body's position and rotation
   *
   * PRECONDITIONS:
   * - julianDate must be finite
   * - deltaTime must be finite and non-negative
   * - timeScale must be finite
   *
   * INVARIANTS:
   * - Calculated positions must be finite
   * - Rotation values must be finite
   */
  update(julianDate: number, deltaTime: number, timeScale: number = 1): void {
    // PRECONDITIONS
    assertFinite(julianDate, `${this.name} Julian date`);
    assertFinite(deltaTime, `${this.name} delta time`);
    assertNonNegative(deltaTime, `${this.name} delta time`);
    assertFinite(timeScale, `${this.name} time scale`);

    // Update orbital position
    if (this.orbitalElements) {
      const position = calculatePosition(this.orbitalElements, julianDate);

      // INVARIANT: Calculated position must be finite
      assertFinite(position.x, `${this.name} calculated position x`);
      assertFinite(position.y, `${this.name} calculated position y`);
      assertFinite(position.z, `${this.name} calculated position z`);

      // If we have a parent, position relative to it
      if (this.parentBody) {
        const parentPos = this.parentBody.getPosition();

        // INVARIANT: Parent position must be finite
        assertFinite(parentPos.x, `${this.name} parent position x`);
        assertFinite(parentPos.y, `${this.name} parent position y`);
        assertFinite(parentPos.z, `${this.name} parent position z`);

        // Moons need additional orbit scaling to be visible outside exaggerated parent planets
        const orbitScale = CelestialBody.SCALE_FACTOR * CelestialBody.MOON_ORBIT_SCALE;

        this.group.position.set(
          parentPos.x + position.x * orbitScale,
          parentPos.y + position.y * orbitScale,
          parentPos.z + position.z * orbitScale
        );
      } else {
        this.group.position.set(
          position.x * CelestialBody.SCALE_FACTOR,
          position.y * CelestialBody.SCALE_FACTOR,
          position.z * CelestialBody.SCALE_FACTOR
        );
      }

      // INVARIANT: Final position must be finite
      assertFinite(this.group.position.x, `${this.name} final position x`);
      assertFinite(this.group.position.y, `${this.name} final position y`);
      assertFinite(this.group.position.z, `${this.name} final position z`);
    }

    // Update rotation
    // Note: rotationPeriod can be negative for retrograde rotation (Venus, Uranus)
    if (this.mesh && this.rotationPeriod !== 0) {
      // rotationPeriod is in hours (negative = retrograde rotation)
      // Calculate rotation speed: full rotation (2π radians) per rotationPeriod hours
      // deltaTime is in seconds, timeScale accelerates rotation
      const hoursPerSecond = 1 / 3600; // Convert seconds to hours
      const rotationsPerSecond = hoursPerSecond / this.rotationPeriod; // Preserves sign for retrograde
      const radiansPerSecond = rotationsPerSecond * 2 * Math.PI;

      // INVARIANT: Rotation calculations must be finite
      assertFinite(radiansPerSecond, `${this.name} radians per second`);

      const rotationDelta = radiansPerSecond * deltaTime * timeScale;
      assertFinite(rotationDelta, `${this.name} rotation delta`);

      // Apply time scale so rotation speeds up with simulation
      this.mesh.rotation.y += rotationDelta;

      // INVARIANT: Final rotation must be finite (handle wrap-around)
      if (!Number.isFinite(this.mesh.rotation.y)) {
        this.mesh.rotation.y = 0; // Reset if somehow infinite
      }
    }
  }

  /**
   * Get the group containing this body's meshes
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Get the main mesh
   */
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  /**
   * Get the orbit visualization line
   */
  getOrbitLine(): THREE.Line | null {
    return this.orbitLine;
  }

  /**
   * Get the current position
   *
   * POSTCONDITIONS:
   * - Returns a clone (not the original vector)
   */
  getPosition(): THREE.Vector3 {
    const pos = this.group.position.clone();
    postcondition(
      pos !== this.group.position,
      'getPosition must return a clone'
    );
    return pos;
  }

  /**
   * Get the scaled visual radius
   *
   * POSTCONDITIONS:
   * - Result is positive
   */
  getScaledRadius(): number {
    // Convert km to AU and apply exaggeration
    const scaled = this.radius * CelestialBody.SIZE_SCALE * CelestialBody.SIZE_EXAGGERATION;
    assertPositive(scaled, `${this.name} scaled radius`);
    return scaled;
  }

  /**
   * Set visibility of this body
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Set orbit line visibility
   */
  setOrbitLineVisible(visible: boolean): void {
    if (this.orbitLine) {
      this.orbitLine.visible = visible;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    }
    if (this.orbitLine) {
      this.orbitLine.geometry.dispose();
      if (this.orbitLine.material instanceof THREE.Material) {
        this.orbitLine.material.dispose();
      }
    }
  }
}
