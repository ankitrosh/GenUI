import type {
  Alignment,
  Distribution,
  GapSize,
  ObjectFit,
  SourceValue,
  TextValue,
  UsageHint,
  ImageUsageHint,
} from 'genui-schema';

export type ComponentType = 'Column' | 'Row' | 'Card' | 'Divider' | 'Text' | 'Icon' | 'Image';

type BaseNode<Type extends ComponentType, Props extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  type: Type;
  props: Props;
  children?: ComponentNode[];
};

export type LooseTextValue = TextValue | { literalString: string };

export type ColumnNode = BaseNode<'Column', { gap?: GapSize; alignment?: Alignment }>;
export type RowNode = BaseNode<'Row', { gap?: GapSize; alignment?: Alignment; distribution?: Distribution }>;
export type CardNode = BaseNode<'Card', Record<string, never>>;
export type DividerNode = BaseNode<'Divider', Record<string, never>>;
export type TextNode = BaseNode<'Text', { text: LooseTextValue; usageHint?: UsageHint }>;
export type IconNode = BaseNode<'Icon', { source?: SourceValue | null; name?: LooseTextValue }>;
export type ImageNode = BaseNode<'Image', { source?: SourceValue | null; altText?: LooseTextValue | null; usageHint?: ImageUsageHint; fit?: ObjectFit }>;

export type ComponentNode =
  | ColumnNode
  | RowNode
  | CardNode
  | DividerNode
  | TextNode
  | IconNode
  | ImageNode;

export type SurfaceName = string;

export type UIState = {
  surfaces: Record<SurfaceName, ComponentNode[]>;
};

export type InputEvent = {
  event_id: string;
  session_id: string;
  seq: number;
  payload: Record<string, unknown>;
};

export type SessionState = {
  session_id: string;
  events: InputEvent[];
  ui: UIState;
};
