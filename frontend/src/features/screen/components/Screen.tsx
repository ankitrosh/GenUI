import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import type { ComponentNode, UIState } from '@/features/screen/types';
import { renderComponent } from '@/features/screen/components/registry';
import { FloatingMicButton } from '@/features/speech/components/FloatingMicButton.tsx';
import type { SpeechStatus } from '@/features/speech/types/SpeechTypes.ts';

type Props = {
  surfaces: UIState['surfaces'];
  micStatus: SpeechStatus;
  micSupported: boolean;
  onMicStart: () => void;
  onMicStop: () => void;
  transcript: string;
  interim: string;
};

export function Screen({ surfaces, micStatus, micSupported, onMicStart, onMicStop, transcript, interim }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [measurements, setMeasurements] = useState<Record<string, { width: number; height: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRefs = useRef<Record<string, HTMLElement | null>>({});
  const prevSurfacesRef = useRef<Record<string, ComponentNode[]>>({});
  const updateOrderRef = useRef<Record<string, number>>({});
  const updateTickRef = useRef(0);

  const renderNode = (current: ComponentNode): ReactElement => renderComponent(current, renderNode);
  const surfaceEntries = useMemo(() => Object.entries(surfaces ?? {}), [surfaces]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isFullscreen) return;

    const element = containerRef.current;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    updateSize();

    return () => resizeObserver.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    surfaceEntries.forEach(([name, nodes]) => {
      const prevNodes = prevSurfacesRef.current[name];
      if (!prevNodes || prevNodes !== nodes) {
        updateTickRef.current += 1;
        updateOrderRef.current[name] = updateTickRef.current;
      }
    });

    Object.keys(prevSurfacesRef.current).forEach((name) => {
      if (!surfaces || !(name in surfaces)) {
        delete updateOrderRef.current[name];
      }
    });

    prevSurfacesRef.current = Object.fromEntries(surfaceEntries);
  }, [surfaceEntries, surfaces]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        const element = containerRef.current;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (element as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        } else if ((element as unknown as { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) {
          await (element as unknown as { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen();
        } else if ((element as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
          await (element as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        } else if ((document as unknown as { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen) {
          await (document as unknown as { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen();
        } else if ((document as unknown as { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
          await (document as unknown as { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const minColumnWidth = 420;
  const verticalGap = 16;

  const viewportWidth = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
  const viewportHeight = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight : 0);
  const columnCount = Math.max(1, Math.floor(viewportWidth / minColumnWidth));

  useEffect(() => {
    if (!isFullscreen) {
      setMeasurements({});
      return;
    }

    const raf = requestAnimationFrame(() => {
      const next: Record<string, { width: number; height: number }> = {};
      surfaceEntries.forEach(([name]) => {
        const el = measurementRefs.current[name];
        if (el) {
          const rect = el.getBoundingClientRect();
          next[name] = { width: rect.width, height: rect.height };
        }
      });
      setMeasurements(next);
    });

    return () => cancelAnimationFrame(raf);
  }, [containerSize, isFullscreen, surfaceEntries]);

  const layoutVisibleSurfaces = useMemo(() => {
    if (!isFullscreen) return surfaceEntries;
    if (!viewportWidth || !viewportHeight) return [];

    const eligible = surfaceEntries.filter(([name]) => {
      const m = measurements[name];
      if (!m) return false;
      if (m.width > viewportWidth) return false;
      if (m.height > viewportHeight) return false;
      return true;
    });

    const orderedByUpdate = [...eligible].sort(
      ([aName], [bName]) => (updateOrderRef.current[aName] ?? 0) - (updateOrderRef.current[bName] ?? 0)
    );

    const fits = (entries: typeof orderedByUpdate) => {
      const heights = Array(columnCount).fill(0);
      for (const [name] of entries) {
        const m = measurements[name];
        if (!m) return false;
        const target = heights.indexOf(Math.min(...heights));
        const nextHeight = heights[target] + m.height + verticalGap;
        if (nextHeight > viewportHeight) return false;
        heights[target] = nextHeight;
      }
      return true;
    };

    const visible: typeof orderedByUpdate = [];

    for (const entry of orderedByUpdate) {
      visible.push(entry);
      while (visible.length > 0 && !fits(visible)) {
        visible.shift();
      }
      if (!fits(visible)) {
        visible.pop();
      }
    }

    return visible;
  }, [columnCount, isFullscreen, measurements, surfaceEntries, viewportHeight, viewportWidth, verticalGap]);

  const visibleSurfaces = useMemo(() => {
    if (!isFullscreen) return surfaceEntries;
    return layoutVisibleSurfaces;
  }, [isFullscreen, layoutVisibleSurfaces, surfaceEntries]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${isFullscreen ? 'min-h-screen' : ''}`}
    >
      {isFullscreen && (
        <FloatingMicButton
          status={micStatus}
          supported={micSupported}
          onStart={onMicStart}
          onStop={onMicStop}
          transcript={transcript}
          interim={interim}
        />
      )}
      <button
        onClick={toggleFullscreen}
        className="absolute right-2 top-2 z-50 flex items-center justify-center rounded-lg bg-white/90 p-2 text-slate-700 transition-colors hover:bg-white hover:text-slate-900 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        type="button"
      >
        {isFullscreen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        )}
      </button>
      <div
        className="gap-4"
        style={{
          columnGap: `${verticalGap}px`,
          columnWidth: `${minColumnWidth}px`,
        }}
      >
        {surfaceEntries.length === 0 && (
          <div className="card-surface mb-4 p-5 sm:p-6 text-sm text-slate-700 w-full max-w-3xl break-inside-avoid">
            Please talk something to see something
          </div>
        )}
        {visibleSurfaces.map(([name, nodes]) => (
          <section
            key={name}
            className="card-surface mb-4 space-y-3 p-5 sm:p-6 w-full max-w-3xl break-inside-avoid"
          >
            <div className="space-y-4">
              {nodes.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  No components in this surface yet.
                </div>
              )}
              {nodes.map((node) => (
                <div key={node.id}>{renderNode(node)}</div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {isFullscreen && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-[-9999px] top-0 -z-10 opacity-0"
          style={{
            width: viewportWidth ? `${viewportWidth}px` : '100vw',
            columnGap: `${verticalGap}px`,
            columnWidth: `${minColumnWidth}px`,
          }}
        >
          {surfaceEntries.map(([name, nodes]) => (
            <section
              key={`measure-${name}`}
              ref={(el) => {
                measurementRefs.current[name] = el;
              }}
              className="card-surface mb-4 space-y-3 p-5 sm:p-6 w-full max-w-3xl break-inside-avoid"
            >
              <div className="space-y-4">
                {nodes.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    No components in this surface yet.
                  </div>
                )}
                {nodes.map((node) => (
                  <div key={`measure-${name}-${node.id}`}>{renderNode(node)}</div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
