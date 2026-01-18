import { useEffect, useRef, useState } from 'react';

import type { SpeechStatus } from '@/features/speech/types/SpeechTypes.ts';

const getRecognition = (): SpeechRecognition | null => {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;
  return new SpeechRecognitionCtor();
};

type UseWebSpeech = {
  supported: boolean;
  status: SpeechStatus;
  transcript: string;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
};

const EVENTS_ENDPOINT = 'http://localhost:8000/events/text';
const MAX_CHARS_PER_CHUNK = 80; // size cap before splitting
const SILENCE_GAP_MS = 700; // flush on pause
const PUNCTUATION_SPLIT = /[.!?]+/;

export function useWebSpeech(lang: string = 'en-US', sessionId?: string): UseWebSpeech {
  const [supported, setSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interim, setInterim] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef<string>(''); // committed text shown in transcript
  const chunkRef = useRef<string>(''); // buffered chunk we intend to commit
  const silenceTimerRef = useRef<number | null>(null);

  const sendCommittedEvent = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionId) return;
    try {
      await fetch(EVENTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, session_id: sessionId }),
      });
    } catch (err) {
      // swallow network errors for now; UI still updates locally
      console.error('Failed to post event', err);
    }
  };

  const splitAndSend = (text: string) => {
    let remaining = text.trim();
    // split on punctuation first
    const segments: string[] = [];
    remaining.split(PUNCTUATION_SPLIT).forEach((part) => {
      const seg = part.trim();
      if (seg) segments.push(seg);
    });
    // further split oversized segments
    const output: string[] = [];
    segments.forEach((seg) => {
      if (seg.length <= MAX_CHARS_PER_CHUNK) {
        output.push(seg);
      } else {
        // naive chunk by space within size cap
        let buf = '';
        seg.split(/\s+/).forEach((word) => {
          const next = buf ? `${buf} ${word}` : word;
          if (next.length > MAX_CHARS_PER_CHUNK) {
            if (buf) output.push(buf);
            buf = word;
          } else {
            buf = next;
          }
        });
        if (buf) output.push(buf);
      }
    });
    output.forEach((seg) => {
      finalRef.current = `${finalRef.current}${seg} `.trim() + ' ';
      void sendCommittedEvent(seg);
    });
    setTranscript(finalRef.current.trim());
  };

  const flushChunkOnSilence = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (!chunkRef.current.trim()) return;
    splitAndSend(chunkRef.current);
    chunkRef.current = '';
  };

  useEffect(() => {
    const recog = getRecognition();
    if (!recog) {
      setSupported(false);
      setStatus('error');
      setError('Web Speech API is not supported in this browser.');
      return;
    }
    setSupported(true);
    recognitionRef.current = recog;
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const setupHandlers = (recog: SpeechRecognition) => {
    recog.lang = lang;
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      setStatus('listening');
      setError(null);
    };

    recog.onresult = (event) => {
      let interimText = '';
      const finalChunks: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalChunks.push(text.trim());
        } else {
          interimText += `${text} `;
        }
      }
      if (finalChunks.length) {
        const chunk = finalChunks.join(' ').trim();
        if (chunk) {
          chunkRef.current = `${chunkRef.current} ${chunk}`.trim();
          splitAndSend(chunkRef.current);
          chunkRef.current = '';
        }
      }
      // reset silence timer for interim; if silence occurs, flush the buffer
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = window.setTimeout(() => {
        flushChunkOnSilence();
      }, SILENCE_GAP_MS);
      setInterim(interimText.trim());
    };

    recog.onerror = (event) => {
      const message = event.message || event.error || 'Speech recognition error';
      setError(message);
      setStatus(event.error === 'not-allowed' ? 'denied' : 'error');
    };

    recog.onend = () => {
      flushChunkOnSilence();
      if (status === 'listening') {
        setStatus('idle');
      }
    };
  };

  const start = () => {
    if (!supported) return;
    const recog = getRecognition();
    if (!recog) {
      setSupported(false);
      setError('Web Speech API is not supported in this browser.');
      return;
    }
    recognitionRef.current = recog;
    finalRef.current = '';
    setTranscript('');
    setInterim('');
    setupHandlers(recog);
    try {
      recog.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recognition.');
      setStatus('error');
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setStatus('idle');
  };

  return { supported, status, transcript, interim, error, start, stop };
}
