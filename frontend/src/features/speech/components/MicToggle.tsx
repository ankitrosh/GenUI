import type { SpeechStatus } from '@/features/speech/types/SpeechTypes.ts';

type Props = {
  status: SpeechStatus;
  supported: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function MicToggle({ status, supported, onStart, onStop }: Props) {
  const listening = status === 'listening';
  const disabled = !supported || status === 'denied';
  const statusTone = listening
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : status === 'denied'
      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
      : status === 'error'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  const buttonTone = listening
    ? 'from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white'
    : 'from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white';
  const micLabel = listening ? 'Stop listening' : 'Start listening';

  return (
    <div className="card-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Microphone</p>
          <p className="text-xs text-slate-600">Control recording and check browser support.</p>
        </div>
        <span className={`pill ${statusTone}`}>
          <span
            className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_6px_rgba(0,0,0,0.06)] ${
              listening
                ? 'bg-emerald-500 animate-pulse'
                : status === 'denied' || status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
            }`}
            aria-hidden
          />
          {listening ? 'listening' : status}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <button
          className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r px-5 py-3 text-sm font-semibold shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 ${buttonTone}`}
          onClick={listening ? onStop : onStart}
          disabled={disabled}
        >
          <span
            className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100"
            aria-hidden
          />
          <span
            className={`relative h-3 w-3 rounded-full ${
              listening ? 'bg-white/90 ring-4 ring-emerald-300/50' : 'bg-white/90 ring-4 ring-white/40'
            }`}
            aria-hidden
          />
          <span className="relative">{micLabel}</span>
        </button>
        {!supported && (
          <p className="text-sm font-medium text-rose-600">
            Web Speech API not supported in this browser.
          </p>
        )}
        {status === 'denied' && (
          <p className="text-sm font-medium text-rose-600">Microphone permission denied.</p>
        )}
      </div>
    </div>
  );
}
