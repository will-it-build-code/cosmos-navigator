/**
 * Sun - The star at the center of our solar system
 * Features animated surface, corona, and light emission
 *
 * NEGATIVE SPACE: This class asserts that materials and geometry are created,
 * that light parameters are valid, and that update calculations are finite.
 */

import * as THREE from 'three';
import { CelestialBody, CelestialBodyConfig } from './CelestialBody';
import { SUN_DATA } from '../data/PhysicalData';
import {
  invariant,
  assertPositive,
  assertFinite,
  assertNonNegative,
  assertDefined,
  postcondition
} from '../utils/invariant';

// Shader for animated sun surface
const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float uTime;
  uniform sampler2D uTexture;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    // Animated position for noise
    vec3 pos = vPosition * 2.0;
    pos += vec3(uTime * 0.05);

    // Multi-octave noise for granulation
    float noise1 = fbm(pos * 3.0);
    float noise2 = fbm(pos * 6.0 + vec3(uTime * 0.1));
    float noise3 = fbm(pos * 12.0 + vec3(uTime * 0.2));

    // Combine noise layers
    float noise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;

    // Base sun colors (yellow to orange to red)
    vec3 yellow = vec3(1.0, 0.95, 0.5);
    vec3 orange = vec3(1.0, 0.6, 0.2);
    vec3 red = vec3(1.0, 0.3, 0.1);

    // Mix colors based on noise
    vec3 baseColor = mix(yellow, orange, noise * 0.5 + 0.5);
    baseColor = mix(baseColor, red, pow(noise, 2.0) * 0.3);

    // Limb darkening effect
    float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limbDarkening = pow(1.0 - fresnel, 0.5);

    // Add sunspot-like features
    float spots = smoothstep(0.3, 0.4, noise2);
    baseColor = mix(baseColor, red * 0.6, spots * 0.3);

    // Apply limb darkening
    baseColor *= limbDarkening * 0.3 + 0.7;

    // High emission for bloom
    float emission = 2.0 + noise * 0.5;

    gl_FragColor = vec4(baseColor * emission, 1.0);
  }
`;

// Corona shader
const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const coronaFragmentShader = `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    // Remove abs() - fresnel should only apply to the limb, not back side
    // The corona uses BackSide rendering, so we want the outer edges
    float dotProduct = dot(vNormal, viewDir);
    float fresnel = 1.0 - clamp(dotProduct, 0.0, 1.0);

    // Corona glow - stronger falloff at edges
    float glow = pow(fresnel, 2.5);

    // Animated rays emanating outward
    float angle = atan(vNormal.y, vNormal.x);
    float rays = sin(angle * 12.0 + uTime * 0.5) * 0.5 + 0.5;
    rays *= sin(angle * 7.0 - uTime * 0.3) * 0.5 + 0.5;

    // Rays are more visible at the limb
    glow *= 1.0 + rays * 0.4 * fresnel;

    vec3 coronaColor = vec3(1.0, 0.85, 0.5) * glow;

    gl_FragColor = vec4(coronaColor, glow * 0.7);
  }
`;

export class Sun extends CelestialBody {
  private sunMaterial: THREE.ShaderMaterial;
  private coronaMaterial: THREE.ShaderMaterial;
  private light: THREE.PointLight;
  private corona: THREE.Mesh;

  // Sun uses a special size - not the same scale as planets
  // In reality Sun is 109x Earth's diameter, but we scale it down for visibility
  private static readonly SUN_VISUAL_RADIUS = 15; // Visual radius in scene units

  /**
   * Create the Sun
   *
   * POSTCONDITIONS:
   * - sunMaterial is created
   * - coronaMaterial is created
   * - light source is created
   */
  constructor() {
    // PRECONDITION: SUN_DATA must be valid
    invariant(
      SUN_DATA !== null && SUN_DATA !== undefined,
      'SUN_DATA must be defined'
    );
    assertPositive(SUN_DATA.radius, 'SUN_DATA.radius');

    const config: CelestialBodyConfig = {
      name: 'Sun',
      type: 'star',
      radius: SUN_DATA.radius,
      mass: SUN_DATA.mass,
      rotationPeriod: SUN_DATA.rotationPeriod,
      axialTilt: SUN_DATA.axialTilt
    };
    super(config);

    // Create materials
    this.sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: null }
      },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      side: THREE.FrontSide
    });

    // POSTCONDITION: Sun material created
    postcondition(
      this.sunMaterial !== null,
      'Sun material must be created'
    );

    this.coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    // POSTCONDITION: Corona material created
    postcondition(
      this.coronaMaterial !== null,
      'Corona material must be created'
    );

    // Create light source
    this.light = new THREE.PointLight(0xfffaf0, 3, 0, 2);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;

    // POSTCONDITION: Light source created
    postcondition(
      this.light !== null,
      'Sun light source must be created'
    );

    // Create corona mesh (placeholder)
    this.corona = new THREE.Mesh();
  }

  // Override to use special Sun size
  getScaledRadius(): number {
    return Sun.SUN_VISUAL_RADIUS;
  }

  /**
   * Create the Sun's visual mesh
   *
   * POSTCONDITIONS:
   * - Sun mesh is created
   * - Corona mesh is created
   * - Light is added to group
   * - Glow sprite is created
   */
  createMesh(): THREE.Group {
    const group = new THREE.Group();

    // Sun sphere - use special visual radius
    const radius = Sun.SUN_VISUAL_RADIUS;
    assertPositive(radius, 'Sun visual radius');

    const geometry = new THREE.IcosahedronGeometry(radius, 64);
    const sunMesh = new THREE.Mesh(geometry, this.sunMaterial);
    sunMesh.name = 'sun_surface';
    group.add(sunMesh);
    this.mesh = sunMesh;

    // POSTCONDITION: Sun mesh created
    postcondition(
      this.mesh !== null,
      'Sun mesh must be created'
    );

    // Corona (outer glow)
    const coronaRadius = radius * 1.3;

    // INVARIANT: Corona must be larger than sun
    invariant(
      coronaRadius > radius,
      'Corona radius must exceed sun radius',
      { coronaRadius, sunRadius: radius }
    );

    const coronaGeometry = new THREE.IcosahedronGeometry(coronaRadius, 32);
    this.corona = new THREE.Mesh(coronaGeometry, this.coronaMaterial);
    this.corona.name = 'sun_corona';
    group.add(this.corona);

    // POSTCONDITION: Corona created
    postcondition(
      this.corona !== null,
      'Corona mesh must be created'
    );

    // Add point light at sun center
    this.light.position.set(0, 0, 0);
    group.add(this.light);

    // Add glow sprite for extra bloom effect
    const glowTexture = this.createGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffdd88,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.set(radius * 4, radius * 4, 1);
    group.add(glowSprite);

    return group;
  }

  /**
   * Create glow texture for sun bloom effect
   *
   * POSTCONDITIONS:
   * - Canvas and context are created
   * - Texture is generated
   */
  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = assertDefined(
      canvas.getContext('2d'),
      'Canvas 2D context must be available'
    );

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 180, 50, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Update sun animation and rotation
   *
   * PRECONDITIONS:
   * - deltaTime must be finite and non-negative
   * - timeScale must be finite
   *
   * INVARIANTS:
   * - Shader time values must be finite
   */
  update(julianDate: number, deltaTime: number, timeScale: number = 1): void {
    super.update(julianDate, deltaTime, timeScale);

    // Update shader time uniforms
    const time = performance.now() * 0.001;
    assertFinite(time, 'Sun shader time');

    this.sunMaterial.uniforms.uTime.value = time;
    this.coronaMaterial.uniforms.uTime.value = time;

    // Slow rotation (accelerated by time scale)
    // Corona rotates with the sun but slightly slower to create visual interest
    if (this.mesh) {
      const rotationDelta = 0.0001 * deltaTime * timeScale;
      assertFinite(rotationDelta, 'Sun rotation delta');
      this.mesh.rotation.y += rotationDelta;
    }
    if (this.corona) {
      const coronaRotation = 0.00008 * deltaTime * timeScale;
      assertFinite(coronaRotation, 'Corona rotation delta');
      this.corona.rotation.y += coronaRotation;
    }
  }

  getLight(): THREE.PointLight {
    return this.light;
  }

  /**
   * Set light intensity
   *
   * PRECONDITIONS:
   * - intensity must be non-negative
   */
  setLightIntensity(intensity: number): void {
    assertNonNegative(intensity, 'Light intensity');
    this.light.intensity = intensity;
  }
}
