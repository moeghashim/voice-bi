"use client";

import { useState } from "react";

import { DataIngestion } from "@/components/DataIngestion";
import { BusinessUiPanel } from "@/components/BusinessUiRenderer";
import { VoiceSession } from "@/components/VoiceSession";
import type { AnswerBusinessQueryOutput } from "@/lib/realtime/answer-business-query-contract";

export function VoiceBiWorkspace() {
  const [dataSessionId, setDataSessionId] = useState<string | null>(null);
  const [latestAnswer, setLatestAnswer] =
    useState<AnswerBusinessQueryOutput | null>(null);

  function handleDataReady(sessionId: string) {
    setDataSessionId(sessionId);
    setLatestAnswer(null);
  }

  return (
    <>
      <DataIngestion onDataReady={handleDataReady} />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
        <VoiceSession
          dataSessionId={dataSessionId}
          onBusinessAnswer={setLatestAnswer}
        />
        <BusinessUiPanel
          answer={
            latestAnswer
              ? {
                  specId: latestAnswer.spec_id,
                  spokenSummary: latestAnswer.spoken_summary,
                  uiSpec: latestAnswer.ui_spec,
                }
              : null
          }
        />
      </section>
    </>
  );
}
