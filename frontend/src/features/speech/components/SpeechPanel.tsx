import { MicToggle } from '@/features/speech/components/MicToggle.tsx';
import { TranscriptBox } from '@/features/speech/components/TranscriptBox.tsx';
import type { SpeechStatus } from '@/features/speech/types/SpeechTypes.ts';

type Props = {
  supported: boolean;
  status: SpeechStatus;
  transcript: string;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
};

export function SpeechPanel({ supported, status, transcript, interim, error, start, stop }: Props) {
  return (
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <MicToggle
        status={status}
        supported={supported}
        onStart={start}
        onStop={stop}
      />
      <TranscriptBox
        transcript={transcript}
        interim={interim}
        error={error}
      />
    </section>
  );
}
