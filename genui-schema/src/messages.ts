/**
 * GenUI Schema v1.0 - Message Types
 * 
 * Message types for communicating UI structure, data, and rendering lifecycle.
 */

import type { Component } from "./components.js";

/**
 * Schema version identifier.
 * Must be "genui-1.0" for all messages in this version.
 */
export type SchemaVersion = "genui-1.0";

/**
 * Named render target for UI display.
 * Examples: "main", "header", "sidebar".
 * A page may have multiple surfaces.
 * Surfaces are not routes, pages, or iframes.
 */
export type SurfaceName = string;

/**
 * Surface update: declares UI structure for a surface.
 * 
 * Contains a flat list of components only - no data values.
 * Multiple surfaceUpdates for the same surface replace the previous structure entirely.
 * 
 * Component IDs must be unique within this surface.
 * Components cannot be referenced across surfaces.
 * Root components are those not referenced as children by any other component.
 */
export type SurfaceUpdate = {
  type: "surfaceUpdate";
  /**
   * Schema version identifier.
   * Must be "genui-1.0".
   */
  schemaVersion: SchemaVersion;
  /**
   * Named render target for this UI structure.
   */
  surface: SurfaceName;
  /**
   * Flat list of components defining the UI structure.
   * Parent-child relationships established via children.explicitList or child properties.
   */
  components: Component[];
};

/**
 * Data model update: provides nested JSON data for binding.
 * 
 * Replaces the entire data model (not a partial merge).
 * Contains no UI structure - only data values.
 * 
 * JSON pointer paths in component definitions reference values in this data model.
 * Same data path may be bound to multiple components.
 * Missing or invalid paths render as empty without errors.
 */
export type DataModelUpdate = {
  type: "dataModelUpdate";
  /**
   * Schema version identifier.
   * Must be "genui-1.0".
   */
  schemaVersion: SchemaVersion;
  /**
   * Nested JSON data object.
   * May contain objects, arrays, and primitives.
   * JSON pointer paths in components reference this structure.
   */
  data: Record<string, unknown>;
};

/**
 * Begin rendering: signals that a surface is ready to be rendered.
 * 
 * No structure or data changes.
 * Renderer should assemble components using parent-child relationships,
 * resolve data bindings via JSON pointer paths, and display the UI.
 * 
 * Valid message sequences include:
 * - surfaceUpdate → dataModelUpdate → beginRendering
 * - dataModelUpdate → surfaceUpdate → beginRendering
 */
export type BeginRendering = {
  type: "beginRendering";
  /**
   * Schema version identifier.
   * Must be "genui-1.0".
   */
  schemaVersion: SchemaVersion;
  /**
   * Named render target to begin rendering.
   */
  surface: SurfaceName;
};

/**
 * Union of all GenUI message types.
 * 
 * Used for type-safe message handling in both backend (generation/validation)
 * and frontend (rendering/interpretation).
 */
export type GenUIMessage = SurfaceUpdate | DataModelUpdate | BeginRendering;
