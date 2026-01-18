/**
 * GenUI Schema v1.0 - Data Binding Types
 * 
 * Types for referencing data model values via JSON pointers.
 */

/**
 * JSON Pointer path referencing a value in the data model.
 * Format: "/path/to/value" or "/array/0/item" for array indices.
 * Missing or invalid paths render as empty without errors.
 * 
 * @example "/user/name"
 * @example "/users/0/email"
 */
export type JSONPointer = string;

/**
 * String content value: either literal string or data-bound via JSON pointer.
 * Useful for URL-like values that aren't rendered as text.
 */
export type StringValue =
  | { literal: string }
  | { path: JSONPointer }
  | string;

/**
 * Text content value: either literal string or data-bound via JSON pointer.
 * Cannot mix literal and path binding in the same component.
 */
export type TextValue =
  | { literal: string }
  | { path: JSONPointer }
  | string;

/**
 * Source value for Image or Icon: either literal URL or data-bound via JSON pointer.
 */
export type SourceValue =
  | { url: string }
  | { path: JSONPointer }
  | string;
