/**
 * GenUI Schema v1.0 - Component Definitions
 * 
 * Read-only component types for visual structure and content display.
 */

import type { GapSize, Alignment, Distribution, UsageHint, ImageUsageHint, ObjectFit } from "./enums.js";
import type { TextValue, SourceValue } from "./binding.js";

/**
 * Column layout: children stacked vertically.
 * Children are arranged from top to bottom in explicitList order.
 */
export type ColumnComponent = {
  Column: {
    /**
     * Ordered list of child component IDs.
     * Components are stacked vertically in this order.
     * Omit if no children (empty column).
     */
    children?: {
      explicitList: string[];
    };
    /**
     * Vertical spacing between children.
     * Default: "none" if omitted.
     */
    gap?: GapSize;
    /**
     * Horizontal alignment of children.
     * Default: "start" if omitted.
     */
    alignment?: Alignment;
  };
};

/**
 * Row layout: children arranged horizontally.
 * Children are arranged from left to right in explicitList order.
 */
export type RowComponent = {
  Row: {
    /**
     * Ordered list of child component IDs.
     * Components are arranged horizontally in this order.
     * Omit if no children (empty row).
     */
    children?: {
      explicitList: string[];
    };
    /**
     * Horizontal spacing between children.
     * Default: "none" if omitted.
     */
    gap?: GapSize;
    /**
     * Vertical alignment of children.
     * Default: "start" if omitted.
     */
    alignment?: Alignment;
    /**
     * Main-axis distribution of children along the row.
     * Only valid for Row components.
     * Default: "start" if omitted.
     */
    distribution?: Distribution;
  };
};

/**
 * Card: visual container wrapping a single child component.
 * Provides visual grouping and emphasis.
 */
export type CardComponent = {
  Card: {
    /**
     * Single child component ID.
     * Omit if empty card.
     */
    child?: string;
  };
};

/**
 * Divider: visual separator with no children.
 * Used to visually separate sections.
 */
export type DividerComponent = {
  Divider: Record<string, never>;
};

/**
 * Text: displays text content with optional typography hint.
 * Text value must be either fully literal or fully data-bound.
 */
export type TextComponent = {
  Text: {
    /**
     * Text content: literal string or JSON pointer to data model.
     * Cannot mix literal and path binding.
     */
    text: TextValue;
    /**
     * Semantic typography hint for rendering.
     * Renderer determines exact styling based on this hint.
     */
    usageHint?: UsageHint;
  };
};

/**
 * Icon: displays an icon from a URL or data model path.
 */
export type IconComponent = {
  Icon: {
    /**
     * Icon source: literal URL or JSON pointer to data model.
     */
    source: SourceValue;
  };
};

/**
 * Image: displays an image from a URL or data model path.
 */
export type ImageComponent = {
  Image: {
    /**
     * Image source: literal URL or JSON pointer to data model.
     */
    source?: SourceValue;
    /**
     * Alias for image source.
     * Accepts literal URL string or JSON pointer.
     */
    url?: SourceValue;
    /**
     * Alternative text for accessibility.
     */
    altText?: TextValue;
    /**
     * Semantic sizing hint for the renderer.
     */
    usageHint?: ImageUsageHint;
    /**
     * CSS object-fit behavior controlling how the image fills its container.
     */
    fit?: ObjectFit;
  };
};

/**
 * Union of all valid component types.
 * Each component object must have exactly one of these keys.
 */
export type ComponentDefinition =
  | ColumnComponent
  | RowComponent
  | CardComponent
  | DividerComponent
  | TextComponent
  | IconComponent
  | ImageComponent;

/**
 * Component entry in the flat component list.
 * 
 * Each component must have a unique ID within its surface.
 * Parent-child relationships are established via children.explicitList or child properties
 * that reference other component IDs.
 * 
 * A component may have zero or one parent (cannot have multiple parents).
 * Root components are those not referenced as children by any other component.
 */
export type Component = {
  /**
   * Unique identifier within the surface.
   * Used for parent-child references via children.explicitList or child properties.
   * Must be unique per surface (cannot reference components across surfaces).
   */
  id: string;
  /**
   * Component definition: exactly one component type per node.
   */
  component: ComponentDefinition;
};
