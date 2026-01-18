import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SpeechPanel } from '@/features/speech/components/SpeechPanel.tsx';
import { Screen } from '@/features/screen/components/Screen.tsx';
import { SessionLog } from '@/features/log/components/SessionLog.tsx';
import { useWebSpeech } from '@/features/speech/hooks/useWebSpeech.ts';
import type { SessionState, UIState } from '@/features/screen/types';
import { debugSurfacesFromJson } from './debugSurfaces';

const API_BASE = 'http://localhost:8000';

export function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const micState = useWebSpeech('en-US', sessionId);
  const [uiState, setUIState] = useState<UIState | null>(null);
  const [events, setEvents] = useState<SessionState['events']>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const lastSeqRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;

    const loadSession = () => {
      fetch(`${API_BASE}/session/${sessionId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          const data: SessionState = await res.json();
          const nextSeq = Math.max(0, ...((data.events ?? []).map((event) => event.seq)));
          if (isMounted && lastSeqRef.current === nextSeq) {
            return;
          }
          if (isMounted) {
            lastSeqRef.current = nextSeq;
            setUIState(data.ui);
            setEvents(data.events ?? []);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load session.');
            setLoading(false);
          }
        });
    };

    loadSession();
    const interval = window.setInterval(loadSession, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:py-16">
        <div className="card-surface p-5 sm:p-6">
          <p className="text-sm font-semibold text-rose-600">Invalid Session</p>
          <p className="text-sm text-slate-700">Session ID is missing.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700">
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  const liveSurfaces = uiState?.surfaces ?? {};
  const surfacesToRender = debugSurfacesFromJson ?? liveSurfaces;
  const hasSurfaces = Object.keys(surfacesToRender).length > 0;
  const showLoading = loading && !hasSurfaces;
  const showError = error && !hasSurfaces;

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-aurora opacity-40 blur-3xl"
        aria-hidden
      />
      <div className="mb-4">
        <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
          ← Back to Sessions
        </Link>
      </div>
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
          Voice workspace
        </p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl text-slate-900">
          Speech capture with Web Speech
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Start and stop dictation, monitor microphone status, and see interim transcripts update in real time.
        </p>
      </section>
      <div className="mt-8">
        <SpeechPanel {...micState} />
      </div>
      <div className="mt-10 space-y-2">
        {showLoading && (
          <div className="card-surface p-5 sm:p-6">
            <p className="text-sm text-slate-700">Loading server UI spec…</p>
          </div>
        )}
        {showError && (
          <div className="card-surface p-5 sm:p-6">
            <p className="text-sm font-semibold text-rose-600">Failed to load server UI</p>
            <p className="text-sm text-slate-700">{error}</p>
          </div>
        )}
        {hasSurfaces && (
          <>
            {uiState && <SessionLog events={events} />}
            <Screen
              surfaces={surfacesToRender}
              micStatus={micState.status}
              micSupported={micState.supported}
              onMicStart={micState.start}
              onMicStop={micState.stop}
              transcript={micState.transcript}
              interim={micState.interim}
            />
          </>
        )}
      </div>
    </main>
  );
}
