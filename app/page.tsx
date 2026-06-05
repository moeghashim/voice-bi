import { VoiceSession } from "@/components/VoiceSession";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <p className="text-sm font-medium uppercase text-slate-500">
            Milestone 1
          </p>
          <h1 className="mt-2 text-3xl font-semibold">voice-bi live voice</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Speech-to-speech business assistance with a server-side data tool
            boundary.
          </p>
        </div>
        <VoiceSession />
      </section>
    </main>
  );
}
