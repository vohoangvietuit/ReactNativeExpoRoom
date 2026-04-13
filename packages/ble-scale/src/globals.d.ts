/**
 * atob is available globally in Hermes (RN 0.73+) and JSC,
 * but is not included in TypeScript's "ESNext" lib (it's in "DOM").
 * Declaring it here avoids pulling in all DOM types for a RN package.
 */
declare function atob(data: string): string;
