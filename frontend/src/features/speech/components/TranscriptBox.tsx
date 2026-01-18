type Props = {
  transcript: string;
  interim: string;
  error: string | null;
};

export function TranscriptBox({ transcript, interim, error }: Props) {
  const display = [transcript, interim].filter(Boolean).join(' ');
  const placeholder = 'Your transcript will appear here as you speak.';

  return (
    <div className="card-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Transcript</p>
          <p className="text-xs text-slate-600">Interim results update live while you speak.</p>
        </div>
        <span
          className={`pill ${
            display
              ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          {display ? 'live stream' : 'waiting'}
        </span>
      </div>
      <div className="mt-4 min-h-[200px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-relaxed text-slate-800 shadow-inner">
        {display || placeholder}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  );
}
