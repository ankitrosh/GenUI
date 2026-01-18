export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'error';

export type SpeechEvent =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string };
