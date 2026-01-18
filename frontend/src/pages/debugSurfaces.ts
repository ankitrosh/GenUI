import type { ComponentNode, UIState } from '@/features/screen/types';

// Paste a components array or a surfaceUpdate JSON into this string for quick local rendering.
// Leave empty to keep using the live server UI.
export const debugComponentsJson = ``;

function unescapeJsonPointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveJsonPointer(data: Record<string, any> | null | undefined, pointer: string): any {
  if (!data || typeof data !== 'object' || pointer === undefined || pointer === null) return null;
  if (pointer === '/') return data;
  if (!pointer.startsWith('/')) return null;

  const tokens = pointer.slice(1).split('/');
  let current: any = data;

  for (const raw of tokens) {
    const token = unescapeJsonPointerToken(raw);
    if (Array.isArray(current)) {
      const idx = Number(token);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length) return null;
      current = current[idx];
    } else if (current && typeof current === 'object') {
      if (!(token in current)) return null;
      current = current[token];
    } else {
      return null;
    }
  }
  return current;
}

function resolveTextValue(value: any, dataModel: Record<string, any> | null | undefined): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return { literal: String(value) };
  if ('literalString' in value) return { literal: value.literalString };
  if ('literal' in value || !('path' in value)) return value;

  const resolved = resolveJsonPointer(dataModel, value.path);
  if (resolved === null || resolved === undefined) return value;
  return { literal: String(resolved) };
}

function resolveSourceValue(value: any, dataModel: Record<string, any> | null | undefined): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return { url: String(value) };
  if ('url' in value || !('path' in value)) return value;

  const resolved = resolveJsonPointer(dataModel, value.path);
  if (resolved === null || resolved === undefined) return value;
  return { url: String(resolved) };
}

function buildComponentTreeFromFlat(
  components: any[],
  dataModel: Record<string, any> | null | undefined,
): ComponentNode[] {
  const idToDef = new Map<string, any>();
  const referenced = new Set<string>();

  for (const comp of components) {
    const compId = comp?.id;
    const compDef = comp?.component;
    if (!compId || typeof compId !== 'string' || typeof compDef !== 'object' || compDef === null) continue;
    idToDef.set(compId, compDef);

    if (compDef.Column) {
      const children = compDef.Column.children ?? {};
      for (const childId of children.explicitList ?? []) if (childId) referenced.add(childId);
    }
    if (compDef.Row) {
      const children = compDef.Row.children ?? {};
      for (const childId of children.explicitList ?? []) if (childId) referenced.add(childId);
    }
    if (compDef.Card) {
      const child = compDef.Card.child;
      if (child) referenced.add(child);
    }
  }

  const buildNode = (nodeId: string, seen: Set<string>): ComponentNode | null => {
    if (seen.has(nodeId)) return null;
    const compDef = idToDef.get(nodeId);
    if (!compDef) return null;

    const nextSeen = new Set([...seen, nodeId]);
    if (compDef.Column) {
      const props = compDef.Column;
      const childIds = props.children?.explicitList ?? [];
      const children = childIds.map((cid: string) => buildNode(cid, nextSeen)).filter(Boolean) as ComponentNode[];
      return { id: nodeId, type: 'Column', props: { gap: props.gap, alignment: props.alignment }, children };
    }
    if (compDef.Row) {
      const props = compDef.Row;
      const childIds = props.children?.explicitList ?? [];
      const children = childIds.map((cid: string) => buildNode(cid, nextSeen)).filter(Boolean) as ComponentNode[];
      return { id: nodeId, type: 'Row', props: { gap: props.gap, alignment: props.alignment, distribution: props.distribution }, children };
    }
    if (compDef.Card) {
      const props = compDef.Card;
      const childNode = props.child ? buildNode(props.child, nextSeen) : null;
      const children = childNode ? [childNode] : [];
      return { id: nodeId, type: 'Card', props: {}, children };
    }
    if (compDef.Divider) {
      return { id: nodeId, type: 'Divider', props: {}, children: [] };
    }
    if (compDef.Text) {
      const props = compDef.Text;
      const resolvedText = resolveTextValue(props.text, dataModel);
      return { id: nodeId, type: 'Text', props: { text: resolvedText, usageHint: props.usageHint }, children: [] };
    }
    if (compDef.Icon) {
      const props = compDef.Icon;
      const resolvedSource = resolveSourceValue(props.source ?? props.url, dataModel);
      const resolvedName = resolveTextValue(props.name, dataModel);
      return { id: nodeId, type: 'Icon', props: { source: resolvedSource, name: resolvedName }, children: [] };
    }
    if (compDef.Image) {
      const props = compDef.Image;
      const resolvedSource = resolveSourceValue(props.source ?? props.url, dataModel);
      const resolvedAlt = resolveTextValue(props.altText, dataModel);
      return { id: nodeId, type: 'Image', props: { source: resolvedSource, altText: resolvedAlt }, children: [] };
    }
    return null;
  };

  const rootIds = Array.from(idToDef.keys()).filter((id) => !referenced.has(id));
  return rootIds.map((rid) => buildNode(rid, new Set())).filter(Boolean) as ComponentNode[];
}

function buildDebugSurfaces(): UIState['surfaces'] | null {
  if (!debugComponentsJson.trim()) return null;
  try {
    const parsed = JSON.parse(debugComponentsJson);

    // Accept either a raw components array or a surfaceUpdate JSON (or stream of messages)
    const looksLikeComponentList = (items: any[]) =>
      items.every((item) => item && typeof item === 'object' && 'component' in item);

    const surfaceEntries: Record<string, { components: any[]; dataModel: Record<string, any> | null }> = {};

    if (Array.isArray(parsed)) {
      if (looksLikeComponentList(parsed)) {
        surfaceEntries.Debug = { components: parsed, dataModel: null };
      } else {
        let currentDataModel: Record<string, any> | null = null;
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue;
          if (item.type === 'dataModelUpdate' && item.data && typeof item.data === 'object') {
            currentDataModel = item.data;
            continue;
          }
          if (item.type === 'surfaceUpdate' && Array.isArray(item.components)) {
            const surfaceName = item.surface ?? 'Debug';
            surfaceEntries[surfaceName] = { components: item.components, dataModel: currentDataModel };
          } else if (Array.isArray(item.components)) {
            surfaceEntries.Debug = { components: item.components, dataModel: currentDataModel };
          }
        }
      }
    } else if (parsed?.type === 'surfaceUpdate' && Array.isArray(parsed.components)) {
      surfaceEntries[parsed.surface ?? 'Debug'] = { components: parsed.components, dataModel: null };
    } else if (Array.isArray(parsed?.components)) {
      surfaceEntries.Debug = { components: parsed.components, dataModel: null };
    }

    const entries = Object.entries(surfaceEntries);
    if (entries.length === 0) return null;

    const built: UIState['surfaces'] = {};
    for (const [surfaceName, { components, dataModel }] of entries) {
      built[surfaceName] = buildComponentTreeFromFlat(components, dataModel);
    }
    return built;
  } catch (err) {
    console.error('Failed to parse debugComponentsJson', err);
    return null;
  }
}

export const debugSurfacesFromJson = buildDebugSurfaces();
