/**
 * Invariant Module - Negative Space Programming Assertions
 *
 * This module provides assertion functions that crash loudly when invariants
 * are violated, converting catastrophic correctness bugs into obvious failures.
 *
 * Philosophy: "See your program like a hacker. Imagine not how your code
 * should work, but how it should NOT work." - Joran Dirk Greef, TigerBeetle
 *
 * Based on NASA's Power of 10 Rule #5: "The assertion density of the code
 * should average to a minimum of two assertions per function."
 */

/**
 * Core invariant assertion function.
 * Crashes the program immediately if the condition is false.
 * TypeScript narrows types after this call (asserts condition).
 *
 * @param condition - Must be true for program to continue
 * @param message - Describes what invariant was violated
 * @param context - Optional object with relevant debugging data
 */
export function invariant(
  condition: unknown,
  message: string,
  context?: Record<string, unknown>
): asserts condition {
  if (!condition) {
    const contextStr = context
      ? `\nContext: ${JSON.stringify(context, null, 2)}`
      : '';
    const error = new Error(`INVARIANT VIOLATED: ${message}${contextStr}`);
    error.name = 'InvariantError';

    // Log to console with high visibility
    console.error('=====================================');
    console.error('INVARIANT VIOLATION');
    console.error('=====================================');
    console.error('Message:', message);
    if (context) {
      console.error('Context:', context);
    }
    console.error('Stack:', error.stack);
    console.error('=====================================');

    throw error;
  }
}

/**
 * Assert a value is not null or undefined.
 * Returns the value with null/undefined removed from type.
 *
 * Use this instead of TypeScript's non-null assertion operator (!)
 * which lies to the compiler without runtime checks.
 *
 * @param value - Value that should be defined
 * @param name - Name of the value for error messages
 * @returns The value, guaranteed to be non-null/undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string
): T {
  invariant(
    value !== null && value !== undefined,
    `${name} must be defined`,
    { actual: value === null ? 'null' : 'undefined', expected: 'defined value' }
  );
  return value;
}

/**
 * Assert a number is within expected bounds (inclusive).
 *
 * @param value - The number to check
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param name - Name of the value for error messages
 */
export function assertBounds(
  value: number,
  min: number,
  max: number,
  name: string
): void {
  invariant(
    !Number.isNaN(value),
    `${name} must be a valid number, got NaN`
  );
  invariant(
    Number.isFinite(value),
    `${name} must be finite`,
    { actual: value }
  );
  invariant(
    value >= min && value <= max,
    `${name} must be between ${min} and ${max}`,
    { actual: value, min, max }
  );
}

/**
 * Assert a number is positive (> 0).
 *
 * @param value - The number to check
 * @param name - Name of the value for error messages
 */
export function assertPositive(value: number, name: string): void {
  invariant(
    !Number.isNaN(value),
    `${name} must be a valid number, got NaN`
  );
  invariant(
    Number.isFinite(value),
    `${name} must be finite`,
    { actual: value }
  );
  invariant(
    value > 0,
    `${name} must be positive (> 0)`,
    { actual: value }
  );
}

/**
 * Assert a number is non-negative (>= 0).
 *
 * @param value - The number to check
 * @param name - Name of the value for error messages
 */
export function assertNonNegative(value: number, name: string): void {
  invariant(
    !Number.isNaN(value),
    `${name} must be a valid number, got NaN`
  );
  invariant(
    Number.isFinite(value),
    `${name} must be finite`,
    { actual: value }
  );
  invariant(
    value >= 0,
    `${name} must be non-negative (>= 0)`,
    { actual: value }
  );
}

/**
 * Assert a number is finite (not NaN, not Infinity).
 *
 * @param value - The number to check
 * @param name - Name of the value for error messages
 */
export function assertFinite(value: number, name: string): void {
  invariant(
    !Number.isNaN(value),
    `${name} must be a valid number, got NaN`
  );
  invariant(
    Number.isFinite(value),
    `${name} must be finite`,
    { actual: value }
  );
}

/**
 * Assert an array is not empty.
 *
 * @param arr - The array to check
 * @param name - Name of the array for error messages
 */
export function assertNonEmpty<T>(arr: readonly T[], name: string): void {
  invariant(
    Array.isArray(arr),
    `${name} must be an array`,
    { actual: typeof arr }
  );
  invariant(
    arr.length > 0,
    `${name} must not be empty`,
    { length: arr.length }
  );
}

/**
 * Assert an array has an expected length.
 *
 * @param arr - The array to check
 * @param expectedLength - Expected length
 * @param name - Name of the array for error messages
 */
export function assertLength<T>(
  arr: readonly T[],
  expectedLength: number,
  name: string
): void {
  invariant(
    Array.isArray(arr),
    `${name} must be an array`,
    { actual: typeof arr }
  );
  invariant(
    arr.length === expectedLength,
    `${name} must have length ${expectedLength}`,
    { actual: arr.length, expected: expectedLength }
  );
}

/**
 * Assert an array length is within bounds.
 *
 * @param arr - The array to check
 * @param maxLength - Maximum allowed length
 * @param name - Name of the array for error messages
 */
export function assertMaxLength<T>(
  arr: readonly T[],
  maxLength: number,
  name: string
): void {
  invariant(
    Array.isArray(arr),
    `${name} must be an array`,
    { actual: typeof arr }
  );
  invariant(
    arr.length <= maxLength,
    `${name} exceeds maximum length`,
    { actual: arr.length, max: maxLength }
  );
}

/**
 * Assert two values are equal (using ===).
 *
 * @param actual - The actual value
 * @param expected - The expected value
 * @param name - Description of what's being compared
 */
export function assertEqual<T>(
  actual: T,
  expected: T,
  name: string
): void {
  invariant(
    actual === expected,
    `${name} must equal expected value`,
    { actual, expected }
  );
}

/**
 * Assert two values are not equal (using !==).
 *
 * @param actual - The actual value
 * @param forbidden - The forbidden value
 * @param name - Description of what's being compared
 */
export function assertNotEqual<T>(
  actual: T,
  forbidden: T,
  name: string
): void {
  invariant(
    actual !== forbidden,
    `${name} must not equal forbidden value`,
    { actual, forbidden }
  );
}

/**
 * Assert a string is not empty.
 *
 * @param value - The string to check
 * @param name - Name of the string for error messages
 */
export function assertNonEmptyString(value: string, name: string): void {
  invariant(
    typeof value === 'string',
    `${name} must be a string`,
    { actual: typeof value }
  );
  invariant(
    value.length > 0,
    `${name} must not be an empty string`
  );
}

/**
 * Assert a key exists in an object/record.
 *
 * @param obj - The object to check
 * @param key - The key that must exist
 * @param name - Name of the object for error messages
 */
export function assertKeyExists<T extends object>(
  obj: T,
  key: string | number | symbol,
  name: string
): void {
  invariant(
    typeof obj === 'object' && obj !== null,
    `${name} must be an object`,
    { actual: typeof obj }
  );
  invariant(
    key in obj,
    `${name} must contain key "${String(key)}"`,
    { availableKeys: Object.keys(obj) }
  );
}

/**
 * Assert a value is an instance of a class.
 *
 * @param value - The value to check
 * @param constructor - The class constructor
 * @param name - Name of the value for error messages
 */
export function assertInstanceOf<T>(
  value: unknown,
  constructor: new (...args: unknown[]) => T,
  name: string
): asserts value is T {
  invariant(
    value instanceof constructor,
    `${name} must be an instance of ${constructor.name}`,
    { actualType: value?.constructor?.name ?? typeof value }
  );
}

/**
 * Assert a DOM element exists.
 *
 * @param element - The element from getElementById/querySelector
 * @param selector - The selector used to find the element
 * @returns The element, guaranteed to be non-null
 */
export function assertElement<T extends Element>(
  element: T | null,
  selector: string
): T {
  invariant(
    element !== null,
    `DOM element must exist`,
    { selector, hint: 'Check that the element exists in the HTML' }
  );
  return element;
}

/**
 * Assert a DOM element is an HTMLElement (not SVG, etc).
 *
 * @param element - The element to check
 * @param selector - The selector used to find the element
 * @returns The element as HTMLElement
 */
export function assertHTMLElement(
  element: Element | null,
  selector: string
): HTMLElement {
  invariant(
    element !== null,
    `DOM element must exist`,
    { selector }
  );
  invariant(
    element instanceof HTMLElement,
    `Element must be an HTMLElement`,
    { selector, actualType: element.constructor.name }
  );
  return element;
}

/**
 * Assert we have a valid 2D rendering context.
 *
 * @param ctx - The context from getContext('2d')
 * @param canvasName - Name of the canvas for error messages
 * @returns The context, guaranteed to be non-null
 */
export function assertCanvasContext2D(
  ctx: CanvasRenderingContext2D | null,
  canvasName: string
): CanvasRenderingContext2D {
  invariant(
    ctx !== null,
    `Canvas 2D context must be available`,
    { canvas: canvasName, hint: 'The browser may not support canvas 2D' }
  );
  return ctx;
}

/**
 * Unreachable code marker.
 * If this function executes, something is fundamentally wrong.
 *
 * Use this in switch statements to handle exhaustive checks:
 * ```typescript
 * switch (value) {
 *   case 'a': return 1;
 *   case 'b': return 2;
 *   default: unreachable(`Unknown value: ${value}`);
 * }
 * ```
 *
 * @param message - Description of how we got here
 */
export function unreachable(message: string = 'Reached unreachable code'): never {
  const error = new Error(`UNREACHABLE: ${message}`);
  error.name = 'UnreachableError';

  console.error('=====================================');
  console.error('UNREACHABLE CODE EXECUTED');
  console.error('=====================================');
  console.error('Message:', message);
  console.error('Stack:', error.stack);
  console.error('=====================================');

  throw error;
}

/**
 * Assert a condition that should hold after an operation (postcondition).
 * Semantically identical to invariant, but documents intent.
 *
 * @param condition - Must be true after the operation
 * @param message - Describes what postcondition failed
 * @param context - Optional debugging data
 */
export function postcondition(
  condition: unknown,
  message: string,
  context?: Record<string, unknown>
): asserts condition {
  invariant(condition, `POSTCONDITION FAILED: ${message}`, context);
}

/**
 * Assert a condition that should hold before an operation (precondition).
 * Semantically identical to invariant, but documents intent.
 *
 * @param condition - Must be true before the operation
 * @param message - Describes what precondition failed
 * @param context - Optional debugging data
 */
export function precondition(
  condition: unknown,
  message: string,
  context?: Record<string, unknown>
): asserts condition {
  invariant(condition, `PRECONDITION FAILED: ${message}`, context);
}

/**
 * Assert that a numeric value is a valid angle in degrees.
 *
 * @param value - The angle value
 * @param name - Name of the angle for error messages
 */
export function assertValidAngle(value: number, name: string): void {
  assertFinite(value, name);
  // Angles can be any real number, but should be finite
}

/**
 * Assert that a numeric value is a valid angle in degrees (0-360).
 *
 * @param value - The angle value
 * @param name - Name of the angle for error messages
 */
export function assertNormalizedAngle(value: number, name: string): void {
  assertFinite(value, name);
  assertBounds(value, 0, 360, name);
}

/**
 * Assert that an eccentricity value is valid (0 <= e < 1 for closed orbits).
 *
 * @param value - The eccentricity value
 * @param name - Name for error messages
 */
export function assertValidEccentricity(value: number, name: string): void {
  assertFinite(value, name);
  assertBounds(value, 0, 1 - Number.EPSILON, name);
}

/**
 * Assert a value is a valid Julian Date.
 * Julian dates should be positive and within reasonable astronomical range.
 *
 * @param value - The Julian date
 * @param name - Name for error messages
 */
export function assertValidJulianDate(value: number, name: string): void {
  assertFinite(value, name);
  // JD 0 is noon on January 1, 4713 BC
  // Valid range: anything from JD 0 to far future
  assertNonNegative(value, name);
  // Sanity check: should be less than JD 10,000,000 (year 22666 AD)
  assertBounds(value, 0, 10000000, name);
}
