import { useState, useRef, useEffect } from 'react';
import type { SpeechStatus } from '@/features/speech/types/SpeechTypes.ts';

type Props = {
  status: SpeechStatus;
  supported: boolean;
  onStart: () => void;
  onStop: () => void;
  transcript: string;
  interim: string;
};

export function FloatingMicButton({ status, supported, onStart, onStop, transcript, interim }: Props) {
  const [showTextBox, setShowTextBox] = useState(true);
  const [truncatedText, setTruncatedText] = useState('');
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listening = status === 'listening';
  const disabled = !supported || status === 'denied';
  const micLabel = listening ? 'Stop listening' : 'Start listening';
  const display = [transcript, interim].filter(Boolean).join(' ');
  const placeholder = 'Your transcript will appear here as you speak.';
  const hasContent = !!display;
  const isPlaceholder = !hasContent;

  // Calculate truncated text showing the most recent words that fit in 2 lines
  useEffect(() => {
    if (!display || !textRef.current || !containerRef.current) {
      setTruncatedText(display || placeholder);
      return;
    }

    const words = display.split(' ');
    
    // Estimate: roughly 50-60 characters per line for the box width (360-520px)
    // For 2 lines, we can fit approximately 100-120 characters
    const maxChars = 110;
    
    let result = display;
    let needsEllipsis = false;
    
    if (display.length > maxChars) {
      // Start from the end and work backwards
      let charCount = 0;
      const resultWords: string[] = [];
      
      for (let i = words.length - 1; i >= 0; i--) {
        const word = words[i];
        const wordWithSpace = resultWords.length > 0 ? ` ${word}` : word;
        
        if (charCount + wordWithSpace.length <= maxChars) {
          resultWords.unshift(word);
          charCount += wordWithSpace.length;
        } else {
          needsEllipsis = true;
          break;
        }
      }
      
      result = needsEllipsis ? `… ${resultWords.join(' ')}` : resultWords.join(' ');
    }
    
    setTruncatedText(result);
  }, [display, placeholder]);

  return (
    <>
      {/* Floating Transcript Box at bottom center - only when visible */}
      {showTextBox && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div 
            ref={containerRef}
            className="rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl ring-1 ring-slate-200/50 min-w-[360px] max-w-[520px] w-full overflow-hidden"
          >
            <div className="px-5 py-4 bg-gradient-to-br from-slate-50 to-slate-100/50 min-h-[4rem] flex items-center">
              <div 
                ref={textRef}
                className={`text-sm leading-snug line-clamp-2 w-full ${
                  isPlaceholder 
                    ? 'text-slate-400 font-normal' 
                    : 'text-slate-900 font-medium'
                }`}
              >
                {truncatedText || '\u00A0'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Right Controls */}
      <div className="fixed right-2 bottom-6 z-50 flex items-center gap-2">
        {/* Text Box Toggle Button */}
        <button
          onClick={() => setShowTextBox(!showTextBox)}
          className="flex items-center justify-center rounded-lg bg-white/90 p-2 text-slate-700 transition-colors hover:bg-white hover:text-slate-900 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={showTextBox ? 'Hide text box' : 'Show text box'}
          title={showTextBox ? 'Hide text box' : 'Show text box'}
          type="button"
        >
          {showTextBox ? (
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
          )}
        </button>
        
        {/* Floating Mic Button */}
        <button
          className={`group relative flex items-center justify-center rounded-full p-3 shadow-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 ring-1 ring-white/50 ${
            listening
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white'
              : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white'
          }`}
          onClick={listening ? onStop : onStart}
          disabled={disabled}
          aria-label={micLabel}
          title={micLabel}
        >
          {listening && (
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" aria-hidden />
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 relative z-10 ${listening ? 'animate-pulse' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          {listening && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" aria-hidden />
          )}
        </button>
      </div>
    </>
  );
}
