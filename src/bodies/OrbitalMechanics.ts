/**
 * OrbitalMechanics - Keplerian orbital calculations
 * Provides accurate position calculations for celestial bodies
 *
 * NEGATIVE SPACE: This module contains critical mathematical calculations.
 * Every calculation asserts that inputs are valid (finite, in-range) and
 * outputs are sane (finite, physically meaningful). Division by zero and
 * NaN propagation are caught immediately.
 */

import {
  invariant,
  assertPositive,
  assertNonNegative,
  assertFinite,
  assertBounds,
  postcondition
} from '../utils/invariant';

// Julian Date for J2000.0 epoch
const J2000_JD = 2451545.0;

/** Maximum iterations for Kepler equation solver */
const MAX_KEPLER_ITERATIONS = 100;

/** Tolerance for Kepler equation convergence */
const KEPLER_TOLERANCE = 1e-10;

/** Maximum reasonable semi-major axis (AU) - beyond Oort cloud */
const MAX_SEMI_MAJOR_AXIS = 100000;

/** Minimum reasonable semi-major axis (AU) - allows for close moons like Phobos (~9,000 km = 0.00006 AU) */
const MIN_SEMI_MAJOR_AXIS = 0.00001;

export interface OrbitalElements {
  // Semi-major axis (AU)
  semiMajorAxis: number;
  // Eccentricity (0-1)
  eccentricity: number;
  // Inclination (degrees)
  inclination: number;
  // Longitude of ascending node (degrees)
  longitudeOfAscendingNode: number;
  // Argument of perihelion (degrees)
  argumentOfPerihelion: number;
  // Mean anomaly at epoch (degrees)
  meanAnomaly: number;
  // Mean motion (degrees per day) - optional, calculated if not provided
  meanMotion?: number;
  // Epoch (Julian Date) - defaults to J2000.0
  epoch?: number;
}

export interface CartesianPosition {
  x: number; // AU
  y: number; // AU
  z: number; // AU
}

/**
 * Solve Kepler's equation using Newton-Raphson iteration
 * M = E - e * sin(E)
 *
 * PRECONDITIONS:
 * - meanAnomaly must be finite
 * - eccentricity must be in [0, 1)
 *
 * POSTCONDITIONS:
 * - Returns finite eccentric anomaly in radians
 *
 * INVARIANTS:
 * - Iteration must converge within MAX_KEPLER_ITERATIONS
 * - Each iteration step must be finite
 */
function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number,
  tolerance: number = KEPLER_TOLERANCE,
  maxIterations: number = MAX_KEPLER_ITERATIONS
): number {
  // PRECONDITIONS
  assertFinite(meanAnomaly, 'Mean anomaly for Kepler equation');
  assertFinite(eccentricity, 'Eccentricity for Kepler equation');
  assertBounds(eccentricity, 0, 1 - Number.EPSILON, 'Eccentricity');
  assertPositive(tolerance, 'Kepler tolerance');
  assertPositive(maxIterations, 'Max Kepler iterations');

  // Convert to radians
  const M = meanAnomaly * (Math.PI / 180);
  const e = eccentricity;

  // INVARIANT: M in radians must be finite
  assertFinite(M, 'Mean anomaly in radians');

  // Initial guess for eccentric anomaly
  let E = M;
  if (e > 0.8) {
    E = Math.PI;
  }

  // Newton-Raphson iteration
  let converged = false;
  for (let i = 0; i < maxIterations; i++) {
    // INVARIANT: Denominator must not be zero
    const denominator = 1 - e * Math.cos(E);
    invariant(
      Math.abs(denominator) > Number.EPSILON,
      'Kepler equation denominator must not be zero',
      { denominator, eccentricity: e, E }
    );

    const dE = (E - e * Math.sin(E) - M) / denominator;

    // INVARIANT: Step must be finite
    assertFinite(dE, `Kepler iteration step ${i}`);

    E -= dE;

    // INVARIANT: E must remain finite
    assertFinite(E, `Eccentric anomaly after iteration ${i}`);

    if (Math.abs(dE) < tolerance) {
      converged = true;
      break;
    }
  }

  // POSTCONDITION: Must have converged
  invariant(
    converged,
    'Kepler equation must converge',
    { meanAnomaly, eccentricity, finalE: E, maxIterations }
  );

  // POSTCONDITION: Result must be finite
  assertFinite(E, 'Final eccentric anomaly');

  return E; // Returns in radians
}

/**
 * Calculate true anomaly from eccentric anomaly
 *
 * PRECONDITIONS:
 * - eccentricAnomaly must be finite
 * - eccentricity must be in [0, 1)
 *
 * POSTCONDITIONS:
 * - Returns finite true anomaly in radians
 */
function trueAnomalyFromEccentric(
  eccentricAnomaly: number,
  eccentricity: number
): number {
  // PRECONDITIONS
  assertFinite(eccentricAnomaly, 'Eccentric anomaly');
  assertFinite(eccentricity, 'Eccentricity');
  assertBounds(eccentricity, 0, 1 - Number.EPSILON, 'Eccentricity for true anomaly');

  const e = eccentricity;
  const E = eccentricAnomaly;

  // Calculate true anomaly
  // INVARIANT: (1-e) must be positive for the sqrt
  const denominator = 1 - e;
  invariant(
    denominator > 0,
    'Denominator (1-e) must be positive',
    { eccentricity: e, denominator }
  );

  const sqrtTerm = Math.sqrt((1 + e) / denominator);
  assertFinite(sqrtTerm, 'Sqrt term in true anomaly calculation');

  const tanHalfNu = sqrtTerm * Math.tan(E / 2);
  assertFinite(tanHalfNu, 'Tan half nu');

  const nu = 2 * Math.atan(tanHalfNu);

  // POSTCONDITION: Result must be finite
  assertFinite(nu, 'True anomaly');

  return nu; // Returns in radians
}

/**
 * Calculate heliocentric distance from orbital elements
 *
 * PRECONDITIONS:
 * - semiMajorAxis must be positive
 * - eccentricity must be in [0, 1)
 * - trueAnomaly must be finite
 *
 * POSTCONDITIONS:
 * - Returns positive, finite distance
 */
function calculateHeliocentricDistance(
  semiMajorAxis: number,
  eccentricity: number,
  trueAnomaly: number
): number {
  // PRECONDITIONS
  assertPositive(semiMajorAxis, 'Semi-major axis for distance');
  assertFinite(eccentricity, 'Eccentricity for distance');
  assertBounds(eccentricity, 0, 1 - Number.EPSILON, 'Eccentricity for distance');
  assertFinite(trueAnomaly, 'True anomaly for distance');

  const a = semiMajorAxis;
  const e = eccentricity;
  const nu = trueAnomaly;

  // INVARIANT: Denominator must be positive
  const denominator = 1 + e * Math.cos(nu);
  invariant(
    denominator > 0,
    'Heliocentric distance denominator must be positive',
    { denominator, eccentricity: e, trueAnomaly: nu }
  );

  const numerator = a * (1 - e * e);
  assertFinite(numerator, 'Heliocentric distance numerator');

  const r = numerator / denominator;

  // POSTCONDITION: Distance must be positive and finite
  assertFinite(r, 'Heliocentric distance');
  assertPositive(r, 'Heliocentric distance');

  return r;
}

/**
 * Calculate Cartesian position from orbital elements
 *
 * PRECONDITIONS:
 * - elements.semiMajorAxis must be positive
 * - elements.eccentricity must be in [0, 1)
 * - All angle elements must be finite
 * - julianDate must be finite
 *
 * POSTCONDITIONS:
 * - Returns finite x, y, z coordinates in AU
 */
export function calculatePosition(
  elements: OrbitalElements,
  julianDate: number
): CartesianPosition {
  // PRECONDITIONS
  invariant(
    elements !== null && elements !== undefined,
    'Orbital elements must be defined'
  );
  assertFinite(julianDate, 'Julian date for position');

  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: omega,
    argumentOfPerihelion: w,
    meanAnomaly: M0,
    epoch = J2000_JD
  } = elements;

  // Validate orbital elements
  assertPositive(a, 'Semi-major axis');
  assertBounds(a, MIN_SEMI_MAJOR_AXIS, MAX_SEMI_MAJOR_AXIS, 'Semi-major axis');
  assertFinite(e, 'Eccentricity');
  assertBounds(e, 0, 1 - Number.EPSILON, 'Eccentricity');
  assertFinite(i, 'Inclination');
  assertFinite(omega, 'Longitude of ascending node');
  assertFinite(w, 'Argument of perihelion');
  assertFinite(M0, 'Mean anomaly at epoch');
  assertFinite(epoch, 'Epoch');

  // Calculate mean motion if not provided (degrees per day)
  const n = elements.meanMotion || (360 / (Math.sqrt(a * a * a) * 365.25));
  assertFinite(n, 'Mean motion');
  assertPositive(n, 'Mean motion');

  // Calculate days since epoch
  const daysSinceEpoch = julianDate - epoch;
  assertFinite(daysSinceEpoch, 'Days since epoch');

  // Calculate current mean anomaly
  let M = (M0 + n * daysSinceEpoch) % 360;
  // Handle negative modulo
  if (M < 0) M += 360;
  assertFinite(M, 'Current mean anomaly');

  // Solve Kepler's equation
  const E = solveKeplerEquation(M, e);
  assertFinite(E, 'Eccentric anomaly from Kepler');

  // Calculate true anomaly
  const nu = trueAnomalyFromEccentric(E, e);
  assertFinite(nu, 'True anomaly');

  // Calculate heliocentric distance
  const r = calculateHeliocentricDistance(a, e, nu);
  assertFinite(r, 'Heliocentric distance');
  assertPositive(r, 'Heliocentric distance');

  // Convert angles to radians
  const iRad = i * (Math.PI / 180);
  const omegaRad = omega * (Math.PI / 180);
  const wRad = w * (Math.PI / 180);

  assertFinite(iRad, 'Inclination in radians');
  assertFinite(omegaRad, 'Longitude of ascending node in radians');
  assertFinite(wRad, 'Argument of perihelion in radians');

  // Calculate position in orbital plane
  const x_orbital = r * Math.cos(nu);
  const y_orbital = r * Math.sin(nu);

  assertFinite(x_orbital, 'Orbital plane x');
  assertFinite(y_orbital, 'Orbital plane y');

  // Rotate to ecliptic coordinates
  const cosW = Math.cos(wRad);
  const sinW = Math.sin(wRad);
  const cosOmega = Math.cos(omegaRad);
  const sinOmega = Math.sin(omegaRad);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);

  // Rotation matrix components
  const x = (cosW * cosOmega - sinW * sinOmega * cosI) * x_orbital +
            (-sinW * cosOmega - cosW * sinOmega * cosI) * y_orbital;

  const y = (cosW * sinOmega + sinW * cosOmega * cosI) * x_orbital +
            (-sinW * sinOmega + cosW * cosOmega * cosI) * y_orbital;

  const z = (sinW * sinI) * x_orbital + (cosW * sinI) * y_orbital;

  // POSTCONDITIONS: All coordinates must be finite
  assertFinite(x, 'Final position x');
  assertFinite(y, 'Final position y');
  assertFinite(z, 'Final position z');

  return { x, y, z };
}

/**
 * Calculate orbital period in days
 *
 * PRECONDITIONS:
 * - semiMajorAxis must be positive
 *
 * POSTCONDITIONS:
 * - Returns positive period in days
 */
export function calculateOrbitalPeriod(semiMajorAxis: number): number {
  // PRECONDITION
  assertPositive(semiMajorAxis, 'Semi-major axis for period');

  // Kepler's third law: T² = a³ (in years when a is in AU)
  const periodYears = Math.sqrt(semiMajorAxis * semiMajorAxis * semiMajorAxis);
  assertFinite(periodYears, 'Period in years');
  assertPositive(periodYears, 'Period in years');

  const periodDays = periodYears * 365.25;

  // POSTCONDITION
  assertFinite(periodDays, 'Orbital period');
  assertPositive(periodDays, 'Orbital period');

  return periodDays;
}

/**
 * Calculate orbital velocity at a given position
 *
 * PRECONDITIONS:
 * - semiMajorAxis must be positive
 * - eccentricity must be in [0, 1)
 * - trueAnomaly must be finite
 *
 * POSTCONDITIONS:
 * - Returns non-negative velocity in AU/day
 */
export function calculateOrbitalVelocity(
  semiMajorAxis: number,
  eccentricity: number,
  trueAnomaly: number
): number {
  // PRECONDITIONS
  assertPositive(semiMajorAxis, 'Semi-major axis for velocity');
  assertBounds(eccentricity, 0, 1 - Number.EPSILON, 'Eccentricity for velocity');
  assertFinite(trueAnomaly, 'True anomaly for velocity');

  const a = semiMajorAxis;
  const e = eccentricity;
  const nu = trueAnomaly;

  const r = calculateHeliocentricDistance(a, e, nu);

  // INVARIANT: r must be positive (guaranteed by calculateHeliocentricDistance)
  assertPositive(r, 'Distance for velocity');

  // Vis-viva equation: v² = GM(2/r - 1/a)
  // For our purposes, we use units where GM = 4π² AU³/year²
  const GM = 4 * Math.PI * Math.PI; // AU³/year²

  // INVARIANT: The term (2/r - 1/a) must be non-negative for bound orbits
  const visVivaArg = GM * (2 / r - 1 / a);
  assertFinite(visVivaArg, 'Vis-viva argument');

  // For bound orbits (e < 1), this should always be positive
  invariant(
    visVivaArg >= 0,
    'Vis-viva argument must be non-negative for bound orbits',
    { visVivaArg, r, a, e }
  );

  const v = Math.sqrt(visVivaArg);
  assertFinite(v, 'Orbital velocity in AU/year');

  // Convert to AU/day
  const vPerDay = v / 365.25;

  // POSTCONDITION
  assertFinite(vPerDay, 'Orbital velocity');
  assertNonNegative(vPerDay, 'Orbital velocity');

  return vPerDay;
}

/**
 * Calculate distance between two bodies
 *
 * PRECONDITIONS:
 * - Both positions must have finite coordinates
 *
 * POSTCONDITIONS:
 * - Returns non-negative distance
 */
export function calculateDistance(
  pos1: CartesianPosition,
  pos2: CartesianPosition
): number {
  // PRECONDITIONS
  assertFinite(pos1.x, 'Position 1 x');
  assertFinite(pos1.y, 'Position 1 y');
  assertFinite(pos1.z, 'Position 1 z');
  assertFinite(pos2.x, 'Position 2 x');
  assertFinite(pos2.y, 'Position 2 y');
  assertFinite(pos2.z, 'Position 2 z');

  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;

  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // POSTCONDITION
  assertFinite(distance, 'Distance between bodies');
  assertNonNegative(distance, 'Distance between bodies');

  return distance;
}

/**
 * Convert AU to kilometers
 *
 * PRECONDITIONS:
 * - au must be finite
 *
 * POSTCONDITIONS:
 * - Returns finite km value
 */
export function auToKm(au: number): number {
  assertFinite(au, 'AU value');
  const km = au * 149597870.7;
  assertFinite(km, 'Kilometers');
  return km;
}

/**
 * Convert kilometers to AU
 *
 * PRECONDITIONS:
 * - km must be finite
 *
 * POSTCONDITIONS:
 * - Returns finite AU value
 */
export function kmToAu(km: number): number {
  assertFinite(km, 'Kilometers value');
  const au = km / 149597870.7;
  assertFinite(au, 'AU');
  return au;
}

/**
 * Get current Julian Date
 *
 * POSTCONDITIONS:
 * - Returns valid Julian Date (positive, reasonable range)
 */
export function getCurrentJulianDate(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const second = now.getUTCSeconds();

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  const JD = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             day + B - 1524.5 +
             (hour + minute / 60 + second / 3600) / 24;

  // POSTCONDITIONS
  assertFinite(JD, 'Julian Date');
  // JD should be around 2451545 for J2000.0, currently around 2460000+
  invariant(
    JD > 2400000 && JD < 3000000,
    'Julian Date should be in reasonable range',
    { JD, currentYear: year }
  );

  return JD;
}
