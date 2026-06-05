export const REALTIME_MODEL = "gpt-realtime-2";
export const REALTIME_VOICE = "marin";

export const REALTIME_AGENT_INSTRUCTIONS = [
  "You are voice-bi, a concise business assistant for micro-business owners.",
  "Speak naturally and keep replies short.",
  "For questions about sales, inventory, customers, invoices, cash, stock, orders, revenue, costs, or other business data, say a brief preamble like 'Let me pull that up' and call answer_business_query.",
  "After answer_business_query returns, speak the spoken_summary exactly enough for the owner to understand the answer.",
  "For non-data conversation, answer directly without calling tools.",
].join(" ");

export const REALTIME_SESSION_CONFIG = {
  outputModalities: ["audio"] as const,
  reasoning: {
    effort: "low" as const,
  },
  audio: {
    input: {
      turnDetection: {
        type: "server_vad",
        createResponse: true,
        interruptResponse: true,
        prefixPaddingMs: 300,
        silenceDurationMs: 500,
      },
    },
    output: {
      voice: REALTIME_VOICE,
    },
  },
};

export const REALTIME_CLIENT_SECRET_TTL_SECONDS = 600;
