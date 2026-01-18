import type { InputEvent } from '@/features/screen/types';

type Props = {
  events: InputEvent[];
};

export function SessionLog({ events }: Props) {
  if (!events.length) {
    return (
      <div className="card-surface p-4 sm:p-5 text-sm text-slate-700">
        No events recorded for this session yet.
      </div>
    );
  }

  const ordered = [...events].sort((a, b) => b.seq - a.seq);

  return (
    <div className="card-surface space-y-3 p-4 sm:p-5 text-sm text-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">Session events</p>
      <div className="max-h-80 space-y-2 overflow-auto">
        {ordered.map((evt) => {
          const text = evt.payload.text as string | undefined;
          const llmResponse = evt.payload.llm_response as unknown;
          const validationStatus = evt.payload.validation_status as string | undefined;
          const validationError = evt.payload.validation_error as string | undefined;
          const hasLLMResponse = llmResponse !== undefined;
          const isValid = validationStatus === 'passed';

          const copyPayload = hasLLMResponse ? llmResponse : evt;

          return (
            <details
              key={evt.event_id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <summary className="cursor-pointer text-xs font-semibold text-indigo-700 flex items-center gap-2">
                <span>#{evt.seq}</span>
                {text && (
                  <span className="text-slate-600 font-normal truncate max-w-xs">
                    "{text}"
                  </span>
                )}
                {hasLLMResponse && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
                    isValid 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {isValid ? 'LLM ✓ Valid' : 'LLM ✗ Invalid'}
                  </span>
                )}
              </summary>
              <div className="mt-3 space-y-3">
                {text && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Input Text:</p>
                    <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                      {text}
                    </p>
                  </div>
                )}
                {hasLLMResponse && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-xs font-semibold ${
                        isValid ? 'text-green-700' : 'text-red-700'
                      }`}>
                        LLM Response (GenUI JSON):
                      </p>
                      {validationStatus && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isValid 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isValid ? '✓ Validated' : '✗ Validation Failed'}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ml-auto rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          navigator.clipboard.writeText(JSON.stringify(copyPayload, null, 2));
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {validationError && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs font-semibold text-red-700 mb-1">Validation Error:</p>
                        <p className="text-xs text-red-600">{validationError}</p>
                      </div>
                    )}
                    <pre className={`text-xs text-slate-700 bg-white p-3 rounded border overflow-auto max-h-96 ${
                      isValid ? 'border-green-200' : 'border-red-200'
                    }`}>
                      {JSON.stringify(llmResponse, null, 2)}
                    </pre>
                  </div>
                )}
                {!hasLLMResponse && (
                  <div className="text-xs text-slate-500 italic">
                    No LLM response yet
                  </div>
                )}
                <details className="text-xs">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                    View full event JSON
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    {JSON.stringify(evt, null, 2)}
                  </pre>
                </details>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
