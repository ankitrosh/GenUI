import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

type SessionSummary = {
  session_id: string;
  event_count: number;
};

export function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      if (!response.ok) throw new Error('Failed to load sessions');
      const data: SessionSummary[] = await response.json();
      setSessions(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCreateSession = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to create session');
      const data: { session_id: string } = await response.json();
      navigate(`/session/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete button
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete session');
      // Reload sessions after deletion
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-aurora opacity-40 blur-3xl"
        aria-hidden
      />
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
          Sessions
        </p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl text-slate-900">
          Your Sessions
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Create a new session or select an existing one to continue working.
        </p>
      </section>

      <div className="mt-8">
        <button
          onClick={handleCreateSession}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Create New Session
        </button>
      </div>

      <div className="mt-10">
        {loading && (
          <div className="card-surface p-5 sm:p-6">
            <p className="text-sm text-slate-700">Loading sessions…</p>
          </div>
        )}

        {error && (
          <div className="card-surface p-5 sm:p-6">
            <p className="text-sm font-semibold text-rose-600">Error</p>
            <p className="text-sm text-slate-700">{error}</p>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="card-surface p-5 sm:p-6">
            <p className="text-sm text-slate-700">No sessions yet. Create your first session to get started.</p>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
              Existing Sessions
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="card-surface p-4 sm:p-5 relative group"
                >
                  <button
                    onClick={() => handleSessionClick(session.session_id)}
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-slate-500 truncate">
                        {session.session_id}
                      </p>
                      <p className="text-sm text-slate-700">
                        {session.event_count} {session.event_count === 1 ? 'event' : 'events'}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(session.session_id, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 text-xs font-semibold"
                    aria-label="Delete session"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
