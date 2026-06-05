"use client";

import { useState } from "react";

import { DataIngestion } from "@/components/DataIngestion";
import { VoiceSession } from "@/components/VoiceSession";

export function VoiceBiWorkspace() {
  const [dataSessionId, setDataSessionId] = useState<string | null>(null);

  function handleDataReady(sessionId: string) {
    setDataSessionId(sessionId);
  }

  return (
    <>
      <DataIngestion onDataReady={handleDataReady} />
      <VoiceSession dataSessionId={dataSessionId} />
    </>
  );
}
