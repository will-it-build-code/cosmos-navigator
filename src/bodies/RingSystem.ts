/**
 * RingSystem - Planetary ring system (e.g., Saturn's rings)
 * Creates beautiful ring effects with proper lighting
 *
 * NEGATIVE SPACE: This class asserts that ring radii are valid (outer > inner),
 * that geometry segments are within bounds, and that shader uniforms are finite.
 */

import * as THREE from 'three';
import {
  invariant,
  assertPositive,
  assertFinite,
  assertBounds,
  assertDefined,
  postcondition
} from '../utils/invariant';

/** Maximum allowed ring segments */
const MAX_RING_SEGMENTS = 512;

export interface RingConfig {
  innerRadius: number; // In AU units (scaled)
  outerRadius: number; // In AU units (scaled)
  textureUrl?: string;
  tilt?: number; // Degrees
  opacity?: number;
  segments?: number;
}

// Ring shader for proper lighting and transparency
const ringVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  uniform sampler2D uRingTexture;
  uniform vec3 uSunPosition;
  uniform vec3 uPlanetPosition;
  uniform float uPlanetRadius;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    // Calculate radial distance from center
    float dist = length(vPosition.xz);
    float normalizedDist = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);

    // Discard if outside ring bounds
    if (normalizedDist < 0.0 || normalizedDist > 1.0) {
      discard;
    }

    // Sample ring texture (1D lookup based on radial distance)
    vec4 ringColor = texture2D(uRingTexture, vec2(normalizedDist, 0.5));

    // Calculate sun lighting
    vec3 toSun = normalize(uSunPosition - vWorldPosition);
    float sunLight = max(0.2, abs(dot(vNormal, toSun)));

    // Calculate shadow from planet
    vec3 toPlanet = uPlanetPosition - vWorldPosition;
    float distToPlanet = length(toPlanet);
    vec3 toPlanetDir = toPlanet / distToPlanet;

    // Check if we're in the planet's shadow
    float shadowFactor = 1.0;
    float dotSunPlanet = dot(toSun, -toPlanetDir);
    if (dotSunPlanet > 0.0) {
      // We might be in shadow
      float shadowDistance = distToPlanet * dotSunPlanet;
      float shadowRadius = uPlanetRadius * (1.0 - shadowDistance * 0.001);
      float perpDistance = length(cross(toSun, toPlanet));

      if (perpDistance < shadowRadius && shadowDistance > 0.0) {
        shadowFactor = smoothstep(shadowRadius * 0.8, shadowRadius, perpDistance);
      }
    }

    // Apply lighting
    vec3 color = ringColor.rgb * sunLight * shadowFactor;

    // Fade edges of rings
    float edgeFade = smoothstep(0.0, 0.05, normalizedDist) * smoothstep(1.0, 0.95, normalizedDist);

    // View angle fade (rings more transparent when viewed edge-on)
    float viewAngle = abs(dot(vNormal, normalize(-vWorldPosition)));
    float angleFade = smoothstep(0.0, 0.1, viewAngle);

    float alpha = ringColor.a * uOpacity * edgeFade * angleFade;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class RingSystem {
  private ringMesh: THREE.Mesh;
  private ringMaterial: THREE.ShaderMaterial;
  private innerRadius: number;
  private outerRadius: number;

  /**
   * Create a new RingSystem
   *
   * PRECONDITIONS:
   * - innerRadius must be positive
   * - outerRadius must be greater than innerRadius
   * - segments (if provided) must be within bounds
   * - opacity (if provided) must be between 0 and 1
   *
   * POSTCONDITIONS:
   * - Ring mesh and material are created
   */
  constructor(config: RingConfig) {
    // PRECONDITIONS
    assertPositive(config.innerRadius, 'Ring inner radius');
    assertPositive(config.outerRadius, 'Ring outer radius');
    invariant(
      config.outerRadius > config.innerRadius,
      'Ring outer radius must exceed inner radius',
      { innerRadius: config.innerRadius, outerRadius: config.outerRadius }
    );

    const segments = config.segments || 128;
    assertBounds(segments, 3, MAX_RING_SEGMENTS, 'Ring segments');

    if (config.opacity !== undefined) {
      assertBounds(config.opacity, 0, 1, 'Ring opacity');
    }

    this.innerRadius = config.innerRadius;
    this.outerRadius = config.outerRadius;

    // Create ring geometry (a flat ring/annulus)
    const geometry = this.createRingGeometry(
      config.innerRadius,
      config.outerRadius,
      segments
    );

    // POSTCONDITION: Geometry created
    postcondition(
      geometry !== null,
      'Ring geometry must be created'
    );

    // Create shader material
    this.ringMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uRingTexture: { value: this.createDefaultRingTexture() },
        uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
        uPlanetPosition: { value: new THREE.Vector3(0, 0, 0) },
        uPlanetRadius: { value: 1 },
        uInnerRadius: { value: config.innerRadius },
        uOuterRadius: { value: config.outerRadius },
        uOpacity: { value: config.opacity ?? 0.9 }
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    // POSTCONDITION: Material created
    postcondition(
      this.ringMaterial !== null,
      'Ring material must be created'
    );

    this.ringMesh = new THREE.Mesh(geometry, this.ringMaterial);
    this.ringMesh.name = 'ring_system';

    // POSTCONDITION: Mesh created
    postcondition(
      this.ringMesh !== null,
      'Ring mesh must be created'
    );

    // Apply tilt
    if (config.tilt) {
      assertFinite(config.tilt, 'Ring tilt');
      this.ringMesh.rotation.x = THREE.MathUtils.degToRad(config.tilt);
    }
  }

  /**
   * Create ring geometry
   *
   * PRECONDITIONS:
   * - innerRadius must be positive
   * - outerRadius must exceed innerRadius
   * - segments must be positive
   *
   * INVARIANTS:
   * - Generated vertex positions must be finite
   */
  private createRingGeometry(innerRadius: number, outerRadius: number, segments: number): THREE.BufferGeometry {
    // PRECONDITIONS
    assertPositive(innerRadius, 'createRingGeometry innerRadius');
    assertPositive(outerRadius, 'createRingGeometry outerRadius');
    invariant(
      outerRadius > innerRadius,
      'createRingGeometry: outer radius must exceed inner radius'
    );
    assertPositive(segments, 'createRingGeometry segments');

    const thetaSegments = segments;
    const phiSegments = 1;

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Generate vertices
    for (let i = 0; i <= phiSegments; i++) {
      const v = i / phiSegments;
      const radius = innerRadius + (outerRadius - innerRadius) * v;

      for (let j = 0; j <= thetaSegments; j++) {
        const u = j / thetaSegments;
        const theta = u * Math.PI * 2;

        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;

        vertices.push(x, 0, z);
        normals.push(0, 1, 0);
        uvs.push(v, u);
      }
    }

    // Generate indices
    for (let i = 0; i < phiSegments; i++) {
      for (let j = 0; j < thetaSegments; j++) {
        const a = i * (thetaSegments + 1) + j;
        const b = a + thetaSegments + 1;

        indices.push(a, a + 1, b);
        indices.push(b, a + 1, b + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }

  /**
   * Create procedural ring texture
   *
   * POSTCONDITIONS:
   * - Canvas context is available
   * - Texture is created
   */
  private createDefaultRingTexture(): THREE.Texture {
    // Create a procedural ring texture with bands
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 32;
    const ctx = assertDefined(
      canvas.getContext('2d'),
      'Ring texture canvas 2D context must be available'
    );

    // Create gradient for ring bands
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);

    // Saturn-like ring structure
    // C Ring (innermost, dim)
    gradient.addColorStop(0.0, 'rgba(120, 110, 100, 0.3)');
    gradient.addColorStop(0.1, 'rgba(130, 120, 110, 0.4)');

    // B Ring (bright)
    gradient.addColorStop(0.15, 'rgba(200, 190, 170, 0.9)');
    gradient.addColorStop(0.35, 'rgba(220, 210, 190, 0.95)');

    // Cassini Division (gap)
    gradient.addColorStop(0.4, 'rgba(50, 50, 50, 0.1)');
    gradient.addColorStop(0.42, 'rgba(50, 50, 50, 0.1)');

    // A Ring
    gradient.addColorStop(0.45, 'rgba(180, 170, 150, 0.8)');
    gradient.addColorStop(0.55, 'rgba(190, 180, 160, 0.85)');

    // Encke Gap
    gradient.addColorStop(0.6, 'rgba(100, 100, 90, 0.3)');
    gradient.addColorStop(0.62, 'rgba(160, 150, 140, 0.7)');

    // Outer A Ring
    gradient.addColorStop(0.7, 'rgba(170, 160, 145, 0.75)');

    // F Ring (outer, faint)
    gradient.addColorStop(0.85, 'rgba(50, 50, 50, 0.1)');
    gradient.addColorStop(0.9, 'rgba(140, 130, 120, 0.4)');
    gradient.addColorStop(1.0, 'rgba(100, 90, 80, 0.2)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some subtle noise/variation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
  }

  getMesh(): THREE.Mesh {
    return this.ringMesh;
  }

  /**
   * Update ring shader uniforms
   *
   * PRECONDITIONS:
   * - sunPosition must have finite components
   * - planetPosition must have finite components
   * - planetRadius must be positive
   */
  update(sunPosition: THREE.Vector3, planetPosition: THREE.Vector3, planetRadius: number): void {
    // PRECONDITIONS
    assertFinite(sunPosition.x, 'Ring update sunPosition.x');
    assertFinite(sunPosition.y, 'Ring update sunPosition.y');
    assertFinite(sunPosition.z, 'Ring update sunPosition.z');
    assertFinite(planetPosition.x, 'Ring update planetPosition.x');
    assertFinite(planetPosition.y, 'Ring update planetPosition.y');
    assertFinite(planetPosition.z, 'Ring update planetPosition.z');
    assertPositive(planetRadius, 'Ring update planetRadius');

    this.ringMaterial.uniforms.uSunPosition.value.copy(sunPosition);
    this.ringMaterial.uniforms.uPlanetPosition.value.copy(planetPosition);
    this.ringMaterial.uniforms.uPlanetRadius.value = planetRadius;
  }

  /**
   * Set ring opacity
   *
   * PRECONDITIONS:
   * - opacity must be between 0 and 1
   */
  setOpacity(opacity: number): void {
    assertBounds(opacity, 0, 1, 'Ring opacity');
    this.ringMaterial.uniforms.uOpacity.value = opacity;
  }

  async loadTexture(loader: THREE.TextureLoader, url: string): Promise<void> {
    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      this.ringMaterial.uniforms.uRingTexture.value = texture;
    } catch (e) {
      console.warn('Failed to load ring texture, using procedural');
    }
  }

  dispose(): void {
    this.ringMesh.geometry.dispose();
    this.ringMaterial.dispose();
  }
}
