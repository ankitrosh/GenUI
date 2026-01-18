import type { ComponentType, JSX, ReactElement } from 'react';
import type {
  Alignment,
  Distribution,
  GapSize,
  ObjectFit,
  SourceValue,
  UsageHint,
  ImageUsageHint,
} from 'genui-schema';
import type {
  CardNode,
  ColumnNode,
  ComponentNode,
  DividerNode,
  IconNode,
  ImageNode,
  LooseTextValue,
  RowNode,
  TextNode,
} from '@/features/screen/types';
import { icons } from 'lucide-react';

type RenderChild = (node: ComponentNode) => ReactElement;
type RendererMap = {
  Column: (node: ColumnNode, renderChild: RenderChild) => ReactElement;
  Row: (node: RowNode, renderChild: RenderChild) => ReactElement;
  Card: (node: CardNode, renderChild: RenderChild) => ReactElement;
  Divider: (node: DividerNode) => ReactElement;
  Text: (node: TextNode) => ReactElement;
  Icon: (node: IconNode) => ReactElement;
  Image: (node: ImageNode) => ReactElement;
};

const gapClasses: Record<GapSize, string> = {
  none: 'gap-0',
  xsmall: 'gap-1',
  small: 'gap-2',
  medium: 'gap-4',
  large: 'gap-6',
};

const alignmentClasses: Record<Alignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const distributionClasses: Record<Distribution, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  spaceBetween: 'justify-between',
  spaceAround: 'justify-around',
  spaceEvenly: 'justify-evenly',
};

const usageHintClasses: Record<UsageHint, string> = {
  h1: 'text-3xl font-semibold leading-tight',
  h2: 'text-2xl font-semibold leading-tight',
  h3: 'text-xl font-semibold leading-tight',
  body: 'text-base text-slate-800',
  caption: 'text-xs text-slate-500',
  label: 'text-xs font-semibold uppercase tracking-[0.18em] text-slate-600',
  monospace: 'font-mono text-sm text-slate-800',
};

const usageHintTags: Record<UsageHint, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  caption: 'p',
  label: 'p',
  monospace: 'p',
};

const imageUsageClasses: Record<ImageUsageHint, string> = {
  icon: 'h-10 w-10',
  avatar: 'h-12 w-12',
  smallFeature: 'w-40 max-w-xs aspect-[4/3]',
  mediumFeature: 'w-full max-w-xl aspect-[4/3]',
  largeFeature: 'w-full max-w-5xl aspect-video',
  header: 'w-full aspect-[21/9]',
};

const objectFitClasses: Record<ObjectFit, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

function resolveText(value?: LooseTextValue | null): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if ('literal' in value) return value.literal;
  if ('literalString' in value) return value.literalString;
  if ('path' in value) return value.path;
  return '';
}

function resolveSourceUrl(source?: SourceValue | null): string | null {
  if (!source) return null;
  if (typeof source === 'string') return source;
  if ('url' in source && typeof source.url === 'string') return source.url;
  return null;
}

function resolveSourcePath(source?: SourceValue | null): string | null {
  if (!source) return null;
  if ('path' in source && typeof source.path === 'string') return source.path;
  return null;
}

function normalizeIconName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const pascalCased = trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join('');
  return pascalCased || trimmed;
}

type LucideIconComponent = ComponentType<{ className?: string }>;

function resolveLucideIcon(name: string | null): LucideIconComponent | null {
  const normalized = normalizeIconName(name);
  if (!normalized) return null;
  const candidates = [normalized, normalized.replace(/Icon$/i, '')];
  for (const candidate of candidates) {
    const icon = (icons as Record<string, LucideIconComponent | undefined>)[candidate];
    if (icon) return icon;
  }
  return null;
}

const renderers = {
  Column: (node: ColumnNode, renderChild: RenderChild) => {
    const children = node.children ?? [];
    const gap = node.props.gap ?? 'none';
    const alignment = node.props.alignment ?? 'start';

    return (
      <div className={`flex flex-col ${gapClasses[gap]} ${alignmentClasses[alignment]}`}>
        {children.map((child) => (
          <div key={child.id} className="w-full">
            {renderChild(child)}
          </div>
        ))}
      </div>
    );
  },
  Row: (node: RowNode, renderChild: RenderChild) => {
    const children = node.children ?? [];
    const gap = node.props.gap ?? 'none';
    const alignment = node.props.alignment ?? 'start';
    const distribution = node.props.distribution ?? 'start';

    return (
      <div className={`flex flex-row flex-wrap ${gapClasses[gap]} ${alignmentClasses[alignment]} ${distributionClasses[distribution]}`}>
        {children.map((child) => (
          <div key={child.id} className="flex min-w-0 flex-1 basis-0">
            {renderChild(child)}
          </div>
        ))}
      </div>
    );
  },
  Card: (node: CardNode, renderChild: RenderChild) => {
    const child = node.children?.[0];
    return (
      <div className="card-surface p-4 sm:p-5">
        {child ? (
          renderChild(child)
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Empty card
          </div>
        )}
      </div>
    );
  },
  Divider: (node: DividerNode) => {
    void node;
    return <div className="my-2 h-px w-full bg-slate-200" role="separator" aria-hidden />;
  },
  Text: (node: TextNode) => {
    const content = resolveText(node.props.text);
    const hint = node.props.usageHint ?? 'body';
    const Tag = usageHintTags[hint] ?? 'p';
    const className = usageHintClasses[hint] ?? usageHintClasses.body;

    return <Tag className={className}>{content}</Tag>;
  },
  Icon: (node: IconNode) => {
    const src = resolveSourceUrl(node.props.source);
    const dataPath = resolveSourcePath(node.props.source);
    const iconName = resolveText(node.props.name);
    const LucideIcon = resolveLucideIcon(iconName);

    return (
      <div className="inline-flex items-center gap-2 text-slate-700">
        {LucideIcon ? (
          <LucideIcon className="h-5 w-5 text-indigo-600" aria-hidden />
        ) : src ? (
          <img src={src} alt="Icon" className="h-6 w-6 object-contain" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Icon
          </span>
        )}
        {iconName && !LucideIcon && (
          <span className="text-xs text-slate-500">Name: {iconName}</span>
        )}
        {dataPath && !src && !LucideIcon && <span className="text-xs text-slate-500">Path: {dataPath}</span>}
      </div>
    );
  },
  Image: (node: ImageNode) => {
    const src = resolveSourceUrl(node.props.source);
    const dataPath = resolveSourcePath(node.props.source);
    const altText = resolveText(node.props.altText) || 'GenUI image';
    const hint = node.props.usageHint;
    const fit = (node.props.fit as ObjectFit | undefined) ?? 'cover';
    const fitClass = objectFitClasses[fit] ?? objectFitClasses.cover;
    const sizeClass = hint ? imageUsageClasses[hint] ?? 'w-full' : 'w-full aspect-video';
    const shapeClass = hint === 'avatar' ? 'rounded-full' : hint === 'icon' ? 'rounded-lg' : 'rounded-xl';
    const frameClass = `overflow-hidden border border-slate-200 bg-white shadow-sm ${sizeClass} ${shapeClass}`;

    return (
      <figure className={frameClass}>
        {src ? (
          <img src={src} alt={altText} className={`h-full w-full ${fitClass}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
            {dataPath ? `Image path: ${dataPath}` : 'Image source missing'}
          </div>
        )}
      </figure>
    );
  },
} satisfies RendererMap;

export function renderComponent(
  node: ComponentNode,
  renderChild: RenderChild,
): ReactElement {
  switch (node.type) {
    case 'Column':
      return renderers.Column(node, renderChild);
    case 'Row':
      return renderers.Row(node, renderChild);
    case 'Card':
      return renderers.Card(node, renderChild);
    case 'Divider':
      return renderers.Divider(node);
    case 'Text':
      return renderers.Text(node);
    case 'Icon':
      return renderers.Icon(node);
    case 'Image':
      return renderers.Image(node);
    default: {
      // Should be unreachable; fallback for unexpected data
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Unsupported component
        </div>
      );
    }
  }
}
