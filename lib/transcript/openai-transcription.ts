const TRANSCRIPTION_MODEL = "gpt-4o-transcribe";

export async function transcribeAudioWithOpenAI(audio: Blob) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const formData = new FormData();
  formData.append("model", TRANSCRIPTION_MODEL);
  formData.append("file", audio, getAudioFilename(audio));

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to transcribe session audio.");
  }

  const data = (await response.json()) as { text?: unknown };

  if (typeof data.text !== "string" || data.text.trim().length === 0) {
    throw new Error("Transcription response did not include text.");
  }

  return data.text;
}

function getAudioFilename(audio: Blob) {
  if ("name" in audio && typeof audio.name === "string") {
    return audio.name;
  }

  if (audio.type.includes("mp4")) {
    return "session-audio.mp4";
  }

  if (audio.type.includes("mpeg")) {
    return "session-audio.mp3";
  }

  return "session-audio.webm";
}
