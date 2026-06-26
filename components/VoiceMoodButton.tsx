"use client";

import { useEffect, useMemo, useRef } from "react";

import { useVoiceMood } from "@/hooks/useVoiceMood";
import { parseMood, type MoodParseResult } from "@/lib/parseMood";

type VoiceMoodButtonProps = {
  onMoodDetected: (result: MoodParseResult) => void;
};

function formatMode(mode: MoodParseResult["mode"]) {
  if (!mode) {
    return null;
  }

  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export default function VoiceMoodButton({
  onMoodDetected,
}: VoiceMoodButtonProps) {
  const {
    error,
    listening,
    resetTranscript,
    startListening,
    stopListening,
    supported,
    transcript,
  } = useVoiceMood();
  const lastDetectedTranscriptRef = useRef<string | null>(null);
  const moodResult = useMemo(() => parseMood(transcript), [transcript]);
  const detectedMode = formatMode(moodResult.mode);

  useEffect(() => {
    if (
      listening ||
      !transcript ||
      !moodResult.mode ||
      lastDetectedTranscriptRef.current === transcript
    ) {
      return;
    }

    lastDetectedTranscriptRef.current = transcript;
    onMoodDetected(moodResult);
  }, [listening, moodResult, onMoodDetected, transcript]);

  if (!supported) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
        <button
          aria-label="Voice mood input unavailable"
          className="cursor-not-allowed rounded-full border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-500"
          disabled
          type="button"
        >
          Voice unavailable
        </button>
        <p className="text-sm text-zinc-400">
          Voice mood works best in Google Chrome. This browser does not fully
          support speech recognition yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-label={listening ? "Stop voice mood input" : "Start voice mood input"}
          className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300 ${
            listening
              ? "border-green-300 bg-green-300 text-black"
              : "border-zinc-700 bg-black text-zinc-200 hover:border-green-300 hover:text-white"
          }`}
          onClick={listening ? stopListening : startListening}
          type="button"
        >
          {listening ? "Listening..." : "🎤 Speak mood"}
        </button>

        {transcript || error ? (
          <button
            aria-label="Reset voice mood transcript"
            className="rounded-full border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            onClick={() => {
              lastDetectedTranscriptRef.current = null;
              resetTranscript();
            }}
            type="button"
          >
            Reset
          </button>
        ) : null}
      </div>

      {listening ? (
        <p className="text-sm text-green-300" role="status">
          Listening for your mood.
        </p>
      ) : null}

      {transcript ? (
        <div className="text-sm text-zinc-300">
          <p className="text-zinc-500">Heard:</p>
          <p className="mt-1">&ldquo;{transcript}&rdquo;</p>
          <p className="mt-2 text-zinc-400">
            {detectedMode
              ? `Detected ${detectedMode} mood (${Math.round(
                  moodResult.confidence * 100,
                )}% confidence).`
              : "No clear Flow mode detected yet."}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
