"use client";

import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession,
  tool,
  type RealtimeItem,
} from "@openai/agents/realtime";
import { useCallback, useEffect, useRef, useState } from "react";

import { answerBusinessQueryInputSchema } from "@/lib/realtime/answer-business-query-stub";
import {
  REALTIME_AGENT_INSTRUCTIONS,
  REALTIME_MODEL,
  REALTIME_SESSION_CONFIG,
  REALTIME_VOICE,
} from "@/lib/realtime/config";

type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error";

type ToolCallLog = {
  id: string;
  query: string;
  summary: string;
  at: string;
};

type RealtimeSessionResponse = {
  client_secret: {
    value: string;
    expires_at: number;
  };
  session_id: string | null;
  model: string;
};

type AnswerBusinessQueryResponse = {
  spoken_summary: string;
  ui_spec: null;
  spec_id: null;
};

type VoiceSessionProps = {
  dataSessionId: string | null;
};

const statusText: Record<ConnectionStatus, string> = {
  idle: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  disconnecting: "Disconnecting",
  error: "Connection error",
};

async function fetchRealtimeClientSecret(): Promise<RealtimeSessionResponse> {
  const response = await fetch("/api/realtime/session", { method: "POST" });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? "Unable to start realtime session.");
  }

  return (await response.json()) as RealtimeSessionResponse;
}

async function executeAnswerBusinessQuery(
  query: string,
  dataSessionId: string | null,
): Promise<AnswerBusinessQueryResponse> {
  const response = await fetch("/api/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      ...(dataSessionId ? { data_session_id: dataSessionId } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("The business query tool failed.");
  }

  return (await response.json()) as AnswerBusinessQueryResponse;
}

function parseToolQuery(rawArguments: string | undefined): string {
  if (!rawArguments) {
    return "business data question";
  }

  try {
    const parsedArguments = JSON.parse(rawArguments) as { query?: unknown };
    return typeof parsedArguments.query === "string" &&
      parsedArguments.query.trim().length > 0
      ? parsedArguments.query
      : "business data question";
  } catch {
    return "business data question";
  }
}

export function VoiceSession({ dataSessionId }: VoiceSessionProps) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const dataSessionIdRef = useRef<string | null>(dataSessionId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<RealtimeItem[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    setStatus((current) =>
      current === "idle" ? current : "disconnecting",
    );
    sessionRef.current?.close();
    sessionRef.current = null;
    setIsMuted(false);
    setIsSpeaking(false);
    setStatus("idle");
  }, []);

  useEffect(() => disconnect, [disconnect]);
  useEffect(() => {
    dataSessionIdRef.current = dataSessionId;
  }, [dataSessionId]);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") {
      return;
    }

    setError(null);
    setStatus("connecting");

    try {
      const { client_secret: clientSecret } = await fetchRealtimeClientSecret();

      const answerBusinessQuery = tool({
        name: "answer_business_query",
        description:
          "Use this for questions about the owner's business data, including sales, inventory, customers, invoices, revenue, stock, orders, cash, or costs. Say a short preamble before calling it.",
        parameters: answerBusinessQueryInputSchema,
        execute: async ({ query }) => {
          const output = await executeAnswerBusinessQuery(
            query,
            dataSessionIdRef.current,
          );
          setToolCalls((current) => [
            {
              id: crypto.randomUUID(),
              query,
              summary: output.spoken_summary,
              at: new Date().toLocaleTimeString(),
            },
            ...current,
          ]);
          return JSON.stringify(output);
        },
      });

      const agent = new RealtimeAgent({
        name: "voice-bi",
        instructions: REALTIME_AGENT_INSTRUCTIONS,
        voice: REALTIME_VOICE,
        tools: [answerBusinessQuery],
      });

      const transport = new OpenAIRealtimeWebRTC({
        audioElement: audioRef.current ?? undefined,
      });

      const session = new RealtimeSession(agent, {
        transport,
        model: REALTIME_MODEL,
        config: REALTIME_SESSION_CONFIG,
      });

      session.on("history_updated", setHistory);
      session.on("audio_start", () => setIsSpeaking(true));
      session.on("audio_stopped", () => setIsSpeaking(false));
      session.on("agent_tool_start", (_context, _agent, _tool, details) => {
        const rawArguments =
          "arguments" in details.toolCall ? details.toolCall.arguments : "{}";
        const query = parseToolQuery(rawArguments);

        setToolCalls((current) => [
          {
            id: crypto.randomUUID(),
            query,
            summary: "Tool call started.",
            at: new Date().toLocaleTimeString(),
          },
          ...current,
        ]);
      });
      session.on("error", ({ error: sessionError }) => {
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Realtime session error.",
        );
        setStatus("error");
      });

      sessionRef.current = session;
      await session.connect({ apiKey: clientSecret.value });
      setStatus("connected");
    } catch (connectError) {
      sessionRef.current?.close();
      sessionRef.current = null;
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to start realtime session.",
      );
      setStatus("error");
    }
  }, [status]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    sessionRef.current?.mute(nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted]);

  const sendToolTest = useCallback(() => {
    sessionRef.current?.sendMessage({
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "What does my revenue look like today?",
        },
      ],
    });
  }, []);

  const canConnect = status === "idle" || status === "error";
  const canDisconnect = status === "connected" || status === "connecting";

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <audio ref={audioRef} className="hidden" />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Live voice session</h2>
            <p className="mt-1 text-sm text-slate-600">
              {statusText[status]}
              {isSpeaking ? " · Agent speaking" : ""}
              {isMuted ? " · Mic muted" : ""}
            </p>
          </div>
          <div
            className={`h-3 w-3 rounded-full ${
              status === "connected"
                ? "bg-emerald-500"
                : status === "connecting"
                  ? "bg-amber-500"
                  : status === "error"
                    ? "bg-red-500"
                    : "bg-slate-300"
            }`}
            aria-label={statusText[status]}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={connect}
            disabled={!canConnect}
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Connect
          </button>
          <button
            type="button"
            onClick={disconnect}
            disabled={!canDisconnect}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Disconnect
          </button>
          <button
            type="button"
            onClick={toggleMute}
            disabled={status !== "connected"}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={sendToolTest}
            disabled={status !== "connected"}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Test data question
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Session activity</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Tool calls
            </h3>
            <div className="mt-2 space-y-2">
              {toolCalls.length === 0 ? (
                <p className="text-sm text-slate-500">No data tool calls yet.</p>
              ) : (
                toolCalls.slice(0, 4).map((call) => (
                  <div
                    key={call.id}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <p className="text-xs text-slate-500">{call.at}</p>
                    <p className="mt-1 text-sm font-medium">{call.query}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {call.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700">History</h3>
            <div className="mt-2 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Conversation history appears after connection.
                </p>
              ) : (
                history.slice(-4).map((item, index) => (
                  <div
                    key={`${item.itemId ?? "item"}-${index}`}
                    className="rounded-md border border-slate-200 p-3 text-sm text-slate-600"
                  >
                    {item.type}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
