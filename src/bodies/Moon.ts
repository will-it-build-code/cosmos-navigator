/**
 * Moon - Natural satellite class
 * Orbits parent planets with proper mechanics
 *
 * NEGATIVE SPACE: This class asserts that configuration is valid,
 * that parent body exists for tidal locking, and that geometry
 * is properly created.
 */

import * as THREE from 'three';
import { CelestialBody, CelestialBodyConfig } from './CelestialBody';
import { OrbitalElements } from './OrbitalMechanics';
import {
  invariant,
  assertPositive,
  assertFinite,
  assertDefined,
  postcondition
} from '../utils/invariant';

export interface MoonConfig {
  name: string;
  radius: number;
  mass?: number;
  rotationPeriod?: number;
  axialTilt?: number;
  orbitalElements: OrbitalElements;
  parentBody: CelestialBody;
  tidallyLocked?: boolean;
  color?: number;
  textureUrl?: string;
}

export class Moon extends CelestialBody {
  private tidallyLocked: boolean;
  private color: number;
  private moonMaterial: THREE.MeshStandardMaterial | null = null;
  private textureUrl?: string;

  /**
   * Create a new Moon
   *
   * PRECONDITIONS:
   * - config.name must not be empty
   * - config.radius must be positive
   * - config.orbitalElements must be defined
   * - config.parentBody must be defined
   */
  constructor(config: MoonConfig) {
    // PRECONDITIONS
    invariant(
      config.name.length > 0,
      'Moon name must not be empty'
    );
    assertPositive(config.radius, `Moon ${config.name} radius`);
    invariant(
      config.orbitalElements !== null && config.orbitalElements !== undefined,
      `Moon ${config.name} must have orbital elements`
    );
    invariant(
      config.parentBody !== null && config.parentBody !== undefined,
      `Moon ${config.name} must have a parent body`
    );

    // For tidally locked moons, rotation is handled by tidal locking logic,
    // not by the base class rotation. Only pass rotationPeriod if explicitly provided.
    const celestialConfig: CelestialBodyConfig = {
      name: config.name,
      type: 'moon',
      radius: config.radius,
      mass: config.mass,
      // Only include rotationPeriod if provided and non-zero
      // Tidally locked moons don't use standard rotation
      ...(config.rotationPeriod ? { rotationPeriod: config.rotationPeriod } : {}),
      axialTilt: config.axialTilt || 0,
      orbitalElements: config.orbitalElements,
      parentBody: config.parentBody
    };
    super(celestialConfig);

    this.tidallyLocked = config.tidallyLocked ?? true;
    this.color = config.color || 0xaaaaaa;
    this.textureUrl = config.textureUrl;
  }

  /**
   * Create the moon's visual mesh
   *
   * PRECONDITIONS:
   * - Scaled radius must be positive
   *
   * POSTCONDITIONS:
   * - Mesh and material are created
   */
  createMesh(): THREE.Mesh {
    const radius = this.getScaledRadius();

    // PRECONDITION
    assertPositive(radius, `${this.name} scaled radius for mesh`);

    const geometry = new THREE.SphereGeometry(radius, 32, 16);

    this.moonMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.8,
      metalness: 0.0,
      emissive: this.color,
      emissiveIntensity: 0.15 // Stronger glow for visibility in shadow
    });

    // POSTCONDITION: Material created
    postcondition(
      this.moonMaterial !== null,
      `${this.name} material must be created`
    );

    const mesh = new THREE.Mesh(geometry, this.moonMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `${this.name}_surface`;

    return mesh;
  }

  async loadTexture(loader: THREE.TextureLoader): Promise<void> {
    if (this.textureUrl && this.moonMaterial) {
      try {
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            this.textureUrl!,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.generateMipmaps = true;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              resolve(tex);
            },
            undefined,
            reject
          );
        });
        this.moonMaterial.map = texture;
        // Use same texture for emissive so glow shows surface detail
        this.moonMaterial.emissiveMap = texture;
        this.moonMaterial.emissive = new THREE.Color(0xffffff);
        this.moonMaterial.emissiveIntensity = 0.06;
        this.moonMaterial.needsUpdate = true;
      } catch (e) {
        console.warn(`Failed to load texture for moon ${this.name}`);
      }
    }
  }

  /**
   * Update moon position and tidal locking orientation
   *
   * INVARIANTS:
   * - Parent position must be finite for tidal locking
   * - Moon position must be finite
   */
  update(julianDate: number, deltaTime: number, timeScale: number = 1): void {
    // Call parent update for orbital motion
    super.update(julianDate, deltaTime, timeScale);

    // If tidally locked, the moon always shows the same face to the parent
    if (this.tidallyLocked && this.parentBody) {
      const parentPos = this.parentBody.getPosition();
      const moonPos = this.getPosition();

      // INVARIANT: Positions must be finite for tidal locking calculation
      assertFinite(parentPos.x, `${this.name} parent position x`);
      assertFinite(parentPos.y, `${this.name} parent position y`);
      assertFinite(parentPos.z, `${this.name} parent position z`);
      assertFinite(moonPos.x, `${this.name} moon position x`);
      assertFinite(moonPos.y, `${this.name} moon position y`);
      assertFinite(moonPos.z, `${this.name} moon position z`);

      const direction = new THREE.Vector3().subVectors(parentPos, moonPos).normalize();

      // Calculate the rotation to face the parent
      const up = new THREE.Vector3(0, 1, 0);
      const matrix = new THREE.Matrix4().lookAt(moonPos, parentPos, up);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);

      if (this.mesh) {
        this.mesh.quaternion.slerp(quaternion, 0.1);
      }
    }
  }
}

/**
 * Factory function for creating moons
 *
 * PRECONDITIONS:
 * - name must not be empty
 * - moonData.radius must be positive
 * - orbitalElements must be defined
 * - parentBody must be defined
 */
export function createMoonFromData(
  name: string,
  moonData: {
    radius: number;
    mass?: number;
    rotationPeriod?: number;
    color?: number;
    textureUrl?: string;
    description?: string;
  },
  orbitalElements: OrbitalElements,
  parentBody: CelestialBody
): Moon {
  // PRECONDITIONS
  invariant(name.length > 0, 'Moon name must not be empty');
  assertPositive(moonData.radius, `createMoonFromData ${name} radius`);
  invariant(
    orbitalElements !== null && orbitalElements !== undefined,
    `createMoonFromData ${name} requires orbital elements`
  );
  invariant(
    parentBody !== null && parentBody !== undefined,
    `createMoonFromData ${name} requires parent body`
  );

  return new Moon({
    name,
    radius: moonData.radius,
    mass: moonData.mass,
    rotationPeriod: moonData.rotationPeriod,
    orbitalElements,
    parentBody,
    tidallyLocked: true,
    color: moonData.color,
    textureUrl: moonData.textureUrl
  });
}
