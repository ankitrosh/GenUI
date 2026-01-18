/**
 * GenUI Schema v1.0 - Type Definitions Package
 * 
 * Shared TypeScript types for GenUI read-only UI generation schema.
 * 
 * This package defines the language of GenUI, not its execution.
 * Safe for use in:
 * - Backend LLM output typing & validation
 * - Frontend renderer interpretation
 * 
 * Schema principles:
 * - Read-only UI: no inputs, buttons, actions, or events
 * - Visual & informational only: browsing and visualization
 * - Declarative structure: components defined as flat list
 * - Separation of concerns: UI structure separate from data
 * - Data binding via JSON pointers referencing nested data model
 */

// Enumerated types
export type {
 GapSize,
 Alignment,
 Distribution,
 UsageHint,
  ImageUsageHint,
  ObjectFit,
} from "./enums.js";

// Data binding types
export type {
  JSONPointer,
  TextValue,
  StringValue,
  SourceValue,
} from "./binding.js";

// Component definitions
export type {
  ColumnComponent,
  RowComponent,
  CardComponent,
  DividerComponent,
  TextComponent,
  IconComponent,
  ImageComponent,
  ComponentDefinition,
  Component,
} from "./components.js";

// Message types
export type {
  SchemaVersion,
  SurfaceName,
  SurfaceUpdate,
  DataModelUpdate,
  BeginRendering,
  GenUIMessage,
} from "./messages.js";
