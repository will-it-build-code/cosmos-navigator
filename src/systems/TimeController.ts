/**
 * TimeController - Simulation time management
 * Handles time scales, Julian dates, and astronomical time calculations
 *
 * NEGATIVE SPACE: This class asserts that all time values remain valid,
 * that Julian dates stay in reasonable astronomical ranges, and that
 * time calculations don't produce NaN or Infinity.
 */

import {
  invariant,
  assertFinite,
  assertNonNegative,
  assertBounds,
  postcondition
} from '../utils/invariant';

export interface TimeState {
  julianDate: number;
  simulationTime: number;
  calendarDate: Date;
  timeScale: number;
  isPaused: boolean;
  isReversed: boolean;
}

// Julian Date for J2000.0 epoch (January 1, 2000, 12:00 TT)
const J2000_JD = 2451545.0;

// Milliseconds per day
const MS_PER_DAY = 86400000;

/** Maximum allowed time scale (1 million x real time) */
const MAX_TIME_SCALE = 10000000;

/** Minimum Julian date (4713 BC) */
const MIN_JULIAN_DATE = 0;

/** Maximum reasonable Julian date (year ~30000 AD) */
const MAX_JULIAN_DATE = 20000000;

export class TimeController {
  private julianDate: number;
  private timeScale: number = 1;
  private isPaused: boolean = false;
  private accumulatedTime: number = 0;

  // Time scale presets (multipliers)
  static readonly TIME_SCALES = {
    REALTIME: 1,
    FAST_1: 10,
    FAST_2: 100,
    FAST_3: 1000,
    FAST_4: 10000,
    FAST_5: 100000,
    FAST_6: 1000000
  };

  private listeners: Set<(state: TimeState) => void> = new Set();

  /**
   * Create a new TimeController
   *
   * POSTCONDITIONS:
   * - julianDate is set to current time
   * - julianDate is in valid range
   */
  constructor() {
    // Initialize to current date/time
    this.julianDate = this.dateToJulian(new Date());

    // POSTCONDITION: Initial date must be valid
    assertFinite(this.julianDate, 'Initial Julian date');
    invariant(
      this.julianDate > MIN_JULIAN_DATE && this.julianDate < MAX_JULIAN_DATE,
      'Initial Julian date must be in valid range',
      { julianDate: this.julianDate, min: MIN_JULIAN_DATE, max: MAX_JULIAN_DATE }
    );
  }

  /**
   * Update simulation time
   *
   * PRECONDITIONS:
   * - deltaSeconds must be finite and non-negative
   *
   * INVARIANTS:
   * - julianDate must remain in valid range
   * - accumulatedTime must remain non-negative
   */
  update(deltaSeconds: number): void {
    if (this.isPaused) return;

    // PRECONDITION
    assertFinite(deltaSeconds, 'Delta seconds');
    assertNonNegative(deltaSeconds, 'Delta seconds');

    // Convert delta to days and apply time scale
    const deltaDays = (deltaSeconds * this.timeScale) / 86400;
    assertFinite(deltaDays, 'Delta days');

    this.julianDate += deltaDays;
    this.accumulatedTime += deltaSeconds * 1000;

    // INVARIANT: Julian date must remain valid
    assertFinite(this.julianDate, 'Julian date after update');
    invariant(
      this.julianDate > MIN_JULIAN_DATE && this.julianDate < MAX_JULIAN_DATE,
      'Julian date must remain in valid range after update',
      { julianDate: this.julianDate, deltaDays, timeScale: this.timeScale }
    );

    // INVARIANT: Accumulated time must be non-negative
    assertNonNegative(this.accumulatedTime, 'Accumulated time');

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Convert Date to Julian Date
   *
   * PRECONDITIONS:
   * - date must be a valid Date object
   *
   * POSTCONDITIONS:
   * - Returns finite Julian date in valid range
   */
  dateToJulian(date: Date): number {
    // PRECONDITION
    invariant(
      date instanceof Date && !isNaN(date.getTime()),
      'date must be a valid Date object'
    );

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    // Algorithm from Astronomical Algorithms by Jean Meeus
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

    // POSTCONDITION
    assertFinite(JD, 'Calculated Julian date');

    return JD;
  }

  /**
   * Convert Julian Date to calendar Date
   *
   * PRECONDITIONS:
   * - jd must be finite and in valid range
   *
   * POSTCONDITIONS:
   * - Returns valid Date object
   */
  julianToDate(jd: number): Date {
    // PRECONDITION
    assertFinite(jd, 'Julian date for conversion');
    invariant(
      jd > MIN_JULIAN_DATE && jd < MAX_JULIAN_DATE,
      'Julian date must be in valid range for conversion',
      { jd, min: MIN_JULIAN_DATE, max: MAX_JULIAN_DATE }
    );

    const Z = Math.floor(jd + 0.5);
    const F = jd + 0.5 - Z;

    let A: number;
    if (Z < 2299161) {
      A = Z;
    } else {
      const alpha = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + alpha - Math.floor(alpha / 4);
    }

    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);

    const day = B - D - Math.floor(30.6001 * E);
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;

    const fracDay = F * 24;
    const hour = Math.floor(fracDay);
    const fracHour = (fracDay - hour) * 60;
    const minute = Math.floor(fracHour);
    const second = Math.floor((fracHour - minute) * 60);

    const result = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    // POSTCONDITION: Must produce valid Date
    postcondition(
      result instanceof Date && !isNaN(result.getTime()),
      'julianToDate must produce valid Date',
      { jd, resultTime: result.getTime() }
    );

    return result;
  }

  /**
   * Get centuries since J2000.0 (useful for orbital calculations)
   *
   * POSTCONDITIONS:
   * - Result is finite
   */
  getCenturiesSinceJ2000(): number {
    const result = (this.julianDate - J2000_JD) / 36525;
    assertFinite(result, 'Centuries since J2000');
    return result;
  }

  /**
   * Get days since J2000.0
   *
   * POSTCONDITIONS:
   * - Result is finite
   */
  getDaysSinceJ2000(): number {
    const result = this.julianDate - J2000_JD;
    assertFinite(result, 'Days since J2000');
    return result;
  }

  // Get simulation time (for animations, etc.)
  getSimulationTime(): number {
    return this.accumulatedTime;
  }

  getJulianDate(): number {
    return this.julianDate;
  }

  getCalendarDate(): Date {
    return this.julianToDate(this.julianDate);
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  getState(): TimeState {
    return {
      julianDate: this.julianDate,
      simulationTime: this.accumulatedTime,
      calendarDate: this.getCalendarDate(),
      timeScale: this.timeScale,
      isPaused: this.isPaused,
      isReversed: this.timeScale < 0
    };
  }

  /**
   * Set the time scale multiplier
   *
   * PRECONDITIONS:
   * - scale must be finite
   * - absolute scale must not exceed MAX_TIME_SCALE
   */
  setTimeScale(scale: number): void {
    // PRECONDITIONS
    assertFinite(scale, 'Time scale');
    assertBounds(Math.abs(scale), 0, MAX_TIME_SCALE, 'Absolute time scale');

    this.timeScale = scale;
    this.notifyListeners();
  }

  pause(): void {
    this.isPaused = true;
    this.notifyListeners();
  }

  resume(): void {
    this.isPaused = false;
    this.notifyListeners();
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
    this.notifyListeners();
  }

  reverse(): void {
    this.timeScale = -Math.abs(this.timeScale);
    this.notifyListeners();
  }

  forward(): void {
    this.timeScale = Math.abs(this.timeScale);
    this.notifyListeners();
  }

  /**
   * Set the simulation date
   *
   * PRECONDITIONS:
   * - date must be a valid Date object
   */
  setDate(date: Date): void {
    // PRECONDITION
    invariant(
      date instanceof Date && !isNaN(date.getTime()),
      'setDate requires valid Date object'
    );

    this.julianDate = this.dateToJulian(date);
    this.notifyListeners();
  }

  /**
   * Set the Julian Date directly
   *
   * PRECONDITIONS:
   * - jd must be finite and in valid range
   */
  setJulianDate(jd: number): void {
    // PRECONDITIONS
    assertFinite(jd, 'Julian date for setJulianDate');
    invariant(
      jd > MIN_JULIAN_DATE && jd < MAX_JULIAN_DATE,
      'Julian date must be in valid range',
      { jd, min: MIN_JULIAN_DATE, max: MAX_JULIAN_DATE }
    );

    this.julianDate = jd;
    this.notifyListeners();
  }

  // Jump to specific events
  jumpToNow(): void {
    this.julianDate = this.dateToJulian(new Date());
    this.notifyListeners();
  }

  jumpToJ2000(): void {
    this.julianDate = J2000_JD;
    this.notifyListeners();
  }

  /**
   * Add days to current time
   *
   * PRECONDITIONS:
   * - days must be finite
   *
   * INVARIANTS:
   * - Julian date must remain in valid range after addition
   */
  addDays(days: number): void {
    // PRECONDITION
    assertFinite(days, 'Days to add');

    const newJd = this.julianDate + days;

    // INVARIANT: Result must be in valid range
    invariant(
      newJd > MIN_JULIAN_DATE && newJd < MAX_JULIAN_DATE,
      'Julian date must remain in valid range after adding days',
      { currentJd: this.julianDate, daysAdded: days, newJd }
    );

    this.julianDate = newJd;
    this.notifyListeners();
  }

  // Format date for display
  formatDate(): string {
    const date = this.getCalendarDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  // Listener management
  addListener(callback: (state: TimeState) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (state: TimeState) => void): void {
    this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(callback => callback(state));
  }
}
