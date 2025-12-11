/**
 * Planet - Represents planets in the solar system
 * Handles textures, atmospheres, and visual effects
 *
 * NEGATIVE SPACE: This class asserts that physical data is valid, that
 * geometry is created with proper dimensions, and that atmosphere/cloud
 * layers have valid radii relative to the planet surface.
 */

import * as THREE from 'three';
import { CelestialBody, CelestialBodyConfig } from './CelestialBody';
import { OrbitalElements } from './OrbitalMechanics';
import { PhysicalProperties } from '../data/PhysicalData';
import {
  invariant,
  assertPositive,
  assertNonNegative,
  assertFinite,
  postcondition
} from '../utils/invariant';

// Atmosphere shader
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uAtmosphereColor;
  uniform float uAtmosphereIntensity;
  uniform vec3 uSunDirection;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

    // Day/night factor based on sun direction
    float dayFactor = dot(vNormal, normalize(uSunDirection)) * 0.5 + 0.5;
    dayFactor = pow(dayFactor, 0.5);

    vec3 color = uAtmosphereColor * fresnel * uAtmosphereIntensity;
    color *= 0.5 + dayFactor * 0.5;

    float alpha = fresnel * 0.8 * (0.3 + dayFactor * 0.7);

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface PlanetConfig {
  name: string;
  physicalData: PhysicalProperties;
  orbitalElements: OrbitalElements;
  textureUrl?: string;
  normalMapUrl?: string;
  specularMapUrl?: string;
  cloudsTextureUrl?: string;
  nightTextureUrl?: string;
  atmosphereColor?: THREE.Color;
  atmosphereIntensity?: number;
  hasAtmosphere?: boolean;
  hasClouds?: boolean;
  hasNightLights?: boolean;
}

export class Planet extends CelestialBody {
  private physicalData: PhysicalProperties;
  private atmosphereMesh: THREE.Mesh | null = null;
  private cloudsMesh: THREE.Mesh | null = null;
  private atmosphereMaterial: THREE.ShaderMaterial | null = null;
  private planetMaterial: THREE.MeshStandardMaterial | null = null;

  private atmosphereColor: THREE.Color;
  private atmosphereIntensity: number;
  private hasAtmosphere: boolean;
  private hasClouds: boolean;
  private hasNightLights: boolean;

  private textureUrl?: string;
  private normalMapUrl?: string;
  private specularMapUrl?: string;
  private cloudsTextureUrl?: string;
  private nightTextureUrl?: string;

  /**
   * Create a new Planet
   *
   * PRECONDITIONS:
   * - config.name must not be empty
   * - config.physicalData must be valid with positive radius
   * - config.orbitalElements must be defined
   * - config.atmosphereIntensity (if provided) must be non-negative
   */
  constructor(config: PlanetConfig) {
    // PRECONDITIONS
    invariant(
      config.name.length > 0,
      'Planet name must not be empty'
    );
    invariant(
      config.physicalData !== null && config.physicalData !== undefined,
      `Planet ${config.name} must have physical data`
    );
    assertPositive(config.physicalData.radius, `Planet ${config.name} radius`);
    invariant(
      config.orbitalElements !== null && config.orbitalElements !== undefined,
      `Planet ${config.name} must have orbital elements`
    );
    if (config.atmosphereIntensity !== undefined) {
      assertNonNegative(config.atmosphereIntensity, `Planet ${config.name} atmosphere intensity`);
    }

    const celestialConfig: CelestialBodyConfig = {
      name: config.name,
      type: 'planet',
      radius: config.physicalData.radius,
      mass: config.physicalData.mass,
      rotationPeriod: config.physicalData.rotationPeriod,
      axialTilt: config.physicalData.axialTilt,
      orbitalElements: config.orbitalElements
    };
    super(celestialConfig);

    this.physicalData = config.physicalData;
    this.atmosphereColor = config.atmosphereColor || new THREE.Color(0x88aaff);
    this.atmosphereIntensity = config.atmosphereIntensity || 1.0;
    this.hasAtmosphere = config.hasAtmosphere ?? false;
    this.hasClouds = config.hasClouds ?? false;
    this.hasNightLights = config.hasNightLights ?? false;

    this.textureUrl = config.textureUrl;
    this.normalMapUrl = config.normalMapUrl;
    this.specularMapUrl = config.specularMapUrl;
    this.cloudsTextureUrl = config.cloudsTextureUrl;
    this.nightTextureUrl = config.nightTextureUrl;
  }

  /**
   * Create the planet's visual mesh
   *
   * PRECONDITIONS:
   * - Scaled radius must be positive
   *
   * POSTCONDITIONS:
   * - Main mesh is created
   * - Atmosphere is created if hasAtmosphere
   * - Clouds are created if hasClouds
   */
  createMesh(): THREE.Group {
    const group = new THREE.Group();
    const radius = this.getScaledRadius();

    // PRECONDITION: Radius must be positive for geometry
    assertPositive(radius, `${this.name} scaled radius for mesh`);

    // Create planet geometry
    const geometry = new THREE.SphereGeometry(radius, 64, 32);

    // POSTCONDITION: Geometry must be created
    postcondition(
      geometry !== null,
      `${this.name} geometry must be created`
    );

    // Create material with emissive for visibility from all angles
    // Without this, planets are invisible when their lit side faces away
    const baseColor = this.getDefaultColor();
    this.planetMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      metalness: 0.1,
      emissive: baseColor,
      emissiveIntensity: 0.12 // Moderate glow - visible shape from all angles
    });

    // POSTCONDITION: Material must be created
    postcondition(
      this.planetMaterial !== null,
      `${this.name} material must be created`
    );

    // Create main mesh
    const planetMesh = new THREE.Mesh(geometry, this.planetMaterial);
    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;
    planetMesh.name = `${this.name}_surface`;
    this.mesh = planetMesh;
    group.add(planetMesh);

    // POSTCONDITION: Main mesh must be set
    postcondition(
      this.mesh !== null,
      `${this.name} mesh must be set`
    );

    // Create atmosphere if needed
    if (this.hasAtmosphere) {
      this.createAtmosphere(group, radius);
    }

    // Create cloud layer if needed
    if (this.hasClouds) {
      this.createClouds(group, radius);
    }

    return group;
  }

  private getDefaultColor(): number {
    // Default colors for each planet
    const colors: Record<string, number> = {
      Mercury: 0x8c8c8c,
      Venus: 0xe6c87a,
      Earth: 0x4169e1,
      Mars: 0xcd5c5c,
      Jupiter: 0xd4a574,
      Saturn: 0xf4d59e,
      Uranus: 0x88ccff,
      Neptune: 0x4466ff
    };
    return colors[this.name] || 0x888888;
  }

  /**
   * Create atmosphere layer
   *
   * PRECONDITIONS:
   * - radius must be positive
   *
   * INVARIANTS:
   * - Atmosphere radius must be larger than planet radius
   *
   * POSTCONDITIONS:
   * - Atmosphere mesh and material are created
   */
  private createAtmosphere(parent: THREE.Group, radius: number): void {
    // PRECONDITION
    assertPositive(radius, `${this.name} radius for atmosphere`);

    const atmosphereRadius = radius * 1.02;

    // INVARIANT: Atmosphere must be larger than planet
    invariant(
      atmosphereRadius > radius,
      `${this.name} atmosphere radius must exceed planet radius`,
      { atmosphereRadius, planetRadius: radius }
    );

    const atmosphereGeometry = new THREE.SphereGeometry(atmosphereRadius, 64, 32);

    this.atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uAtmosphereColor: { value: this.atmosphereColor },
        uAtmosphereIntensity: { value: this.atmosphereIntensity },
        uSunDirection: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    // POSTCONDITION: Material created
    postcondition(
      this.atmosphereMaterial !== null,
      `${this.name} atmosphere material must be created`
    );

    this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, this.atmosphereMaterial);
    this.atmosphereMesh.name = `${this.name}_atmosphere`;
    parent.add(this.atmosphereMesh);

    // POSTCONDITION: Mesh created
    postcondition(
      this.atmosphereMesh !== null,
      `${this.name} atmosphere mesh must be created`
    );
  }

  /**
   * Create cloud layer
   *
   * PRECONDITIONS:
   * - radius must be positive
   *
   * INVARIANTS:
   * - Cloud radius must be larger than planet radius
   */
  private createClouds(parent: THREE.Group, radius: number): void {
    // PRECONDITION
    assertPositive(radius, `${this.name} radius for clouds`);

    const cloudsRadius = radius * 1.005;

    // INVARIANT: Clouds must be larger than planet
    invariant(
      cloudsRadius > radius,
      `${this.name} clouds radius must exceed planet radius`,
      { cloudsRadius, planetRadius: radius }
    );

    const cloudsGeometry = new THREE.SphereGeometry(cloudsRadius, 64, 32);

    const cloudsMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      alphaTest: 0.01
    });

    this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    this.cloudsMesh.name = `${this.name}_clouds`;
    parent.add(this.cloudsMesh);

    // POSTCONDITION: Mesh created
    postcondition(
      this.cloudsMesh !== null,
      `${this.name} clouds mesh must be created`
    );
  }

  async loadTextures(loader: THREE.TextureLoader): Promise<void> {
    if (this.textureUrl && this.planetMaterial) {
      try {
        const texture = await this.loadTexture(loader, this.textureUrl);
        this.planetMaterial.map = texture;
        // Use same texture for emissive so the glow shows surface detail
        this.planetMaterial.emissiveMap = texture;
        this.planetMaterial.emissive = new THREE.Color(0xffffff); // White emissive with map
        this.planetMaterial.emissiveIntensity = 0.08; // Slightly higher with texture
        this.planetMaterial.needsUpdate = true;
        console.log(`Loaded texture for ${this.name}`);
      } catch (e) {
        console.warn(`Failed to load texture for ${this.name}:`, e);
      }
    }

    if (this.normalMapUrl && this.planetMaterial) {
      try {
        const normalMap = await this.loadTexture(loader, this.normalMapUrl);
        this.planetMaterial.normalMap = normalMap;
        this.planetMaterial.normalScale = new THREE.Vector2(0.5, 0.5);
        this.planetMaterial.needsUpdate = true;
      } catch (e) {
        console.warn(`Failed to load normal map for ${this.name}`);
      }
    }

    if (this.specularMapUrl && this.planetMaterial) {
      try {
        const specularMap = await this.loadTexture(loader, this.specularMapUrl);
        this.planetMaterial.roughnessMap = specularMap;
        this.planetMaterial.needsUpdate = true;
      } catch (e) {
        console.warn(`Failed to load specular map for ${this.name}`);
      }
    }

    if (this.cloudsTextureUrl && this.cloudsMesh) {
      try {
        const cloudsTexture = await this.loadTexture(loader, this.cloudsTextureUrl);
        (this.cloudsMesh.material as THREE.MeshStandardMaterial).map = cloudsTexture;
        (this.cloudsMesh.material as THREE.MeshStandardMaterial).alphaMap = cloudsTexture;
        (this.cloudsMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
      } catch (e) {
        console.warn(`Failed to load clouds texture for ${this.name}`);
      }
    }
  }

  private loadTexture(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 16;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Update planet position, rotation, and atmosphere
   *
   * PRECONDITIONS:
   * - julianDate must be finite
   * - deltaTime must be finite and non-negative
   * - timeScale must be finite
   */
  update(julianDate: number, deltaTime: number, timeScale: number = 1): void {
    // Parent class validates preconditions
    super.update(julianDate, deltaTime, timeScale);

    // Rotate clouds at a different rate (accelerated by time scale)
    if (this.cloudsMesh) {
      const cloudRotation = 0.00003 * deltaTime * timeScale;
      assertFinite(cloudRotation, `${this.name} cloud rotation delta`);
      this.cloudsMesh.rotation.y += cloudRotation;
    }

    // Update atmosphere sun direction
    if (this.atmosphereMaterial) {
      // Sun is at origin, calculate direction to planet
      const sunDir = this.getPosition().clone().normalize().negate();

      // INVARIANT: Sun direction must be a valid unit vector or zero
      assertFinite(sunDir.x, `${this.name} sun direction x`);
      assertFinite(sunDir.y, `${this.name} sun direction y`);
      assertFinite(sunDir.z, `${this.name} sun direction z`);

      this.atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDir);
    }
  }

  /**
   * Get the physical data for this planet
   */
  getPhysicalData(): PhysicalProperties {
    return this.physicalData;
  }

  /**
   * Toggle atmosphere visibility
   */
  setAtmosphereVisible(visible: boolean): void {
    if (this.atmosphereMesh) {
      this.atmosphereMesh.visible = visible;
    }
  }

  /**
   * Toggle clouds visibility
   */
  setCloudsVisible(visible: boolean): void {
    if (this.cloudsMesh) {
      this.cloudsMesh.visible = visible;
    }
  }
}
