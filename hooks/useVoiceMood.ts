"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  item(index: number): SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type SpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  const voiceWindow = window as VoiceWindow;

  return (
    voiceWindow.SpeechRecognition ??
    voiceWindow.webkitSpeechRecognition ??
    null
  );
}

function getReadableSpeechError(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone permission was denied.";
  }

  if (error === "no-speech") {
    return "I did not catch anything. Try again.";
  }

  if (error === "audio-capture") {
    return "No microphone was found.";
  }

  return "Voice input stopped unexpectedly.";
}

export function useVoiceMood() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supported = Boolean(getSpeechRecognitionConstructor());

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let nextTranscript = "";
      let hasFinalTranscript = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results.item(index);
        const alternative = result.item(0);

        nextTranscript = `${nextTranscript} ${alternative.transcript}`.trim();

        if (result.isFinal) {
          hasFinalTranscript = true;
        }
      }

      if (nextTranscript) {
        setTranscript(nextTranscript);
      }

      if (hasFinalTranscript) {
        recognition.stop();
        setListening(false);
      }
    };
    recognition.onerror = (event) => {
      setError(getReadableSpeechError(event.error));
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setError(null);
    setListening(true);

    try {
      recognition.start();
    } catch {
      setError("Voice input could not start.");
      setListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return {
    error,
    listening,
    resetTranscript,
    startListening,
    stopListening,
    supported,
    transcript,
  };
}
