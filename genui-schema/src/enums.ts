/**
 * GenUI Schema v1.0 - Enumerated Types
 * 
 * Layout and typography constants used throughout the schema.
 */

/**
 * Vertical or horizontal spacing between child components.
 */
export type GapSize = "none" | "xsmall" | "small" | "medium" | "large";

/**
 * Cross-axis alignment of children within a layout container.
 */
export type Alignment = "start" | "center" | "end" | "stretch";

/**
 * Main-axis distribution of children within a Row layout.
 * Only valid for Row components.
 */
export type Distribution = "start" | "center" | "end" | "spaceBetween" | "spaceAround" | "spaceEvenly";

/**
 * Semantic typography hint for text rendering.
 * Controls visual presentation without specifying exact styles.
 */
export type UsageHint = "h1" | "h2" | "h3" | "body" | "caption" | "label" | "monospace";

/**
 * Semantic sizing hint for image rendering.
 * Renderers choose dimensions based on this hint.
 */
export type ImageUsageHint = "icon" | "avatar" | "smallFeature" | "mediumFeature";

/**
 * CSS object-fit values controlling how images fill their container.
 */
export type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down";
