import type { FlowCategory } from "./classifyTaste";

export type MoodParseResult = {
  mode: FlowCategory | null;
  confidence: number;
  detectedMood: string | null;
  matchedKeywords: string[];
};

type WeightedKeyword = {
  exactMode?: boolean;
  term: string;
  weight: number;
};

const modes: FlowCategory[] = [
  "focus",
  "escape",
  "chill",
  "energy",
  "worship",
];

const moodKeywords: Record<FlowCategory, WeightedKeyword[]> = {
  focus: [
    { term: "focus", weight: 7, exactMode: true },
    { term: "deep work", weight: 4 },
    { term: "need to focus", weight: 4 },
    { term: "lock in", weight: 3 },
    { term: "focused", weight: 5 },
    { term: "concentrate", weight: 5 },
    { term: "productive", weight: 3 },
    { term: "coding", weight: 3 },
    { term: "study", weight: 5 },
    { term: "work", weight: 2 },
    { term: "exam", weight: 2 },
    { term: "read", weight: 2 },
  ],
  escape: [
    { term: "escape", weight: 7, exactMode: true },
    { term: "tired of everything", weight: 5 },
    { term: "need a break", weight: 6 },
    { term: "burned out", weight: 4 },
    { term: "burnt out", weight: 4 },
    { term: "overwhelmed", weight: 5 },
    { term: "stressed", weight: 5 },
    { term: "burnout", weight: 3 },
    { term: "pressure", weight: 2 },
    { term: "i wanna escape", weight: 5 },
  ],
  chill: [
    { term: "chill", weight: 7, exactMode: true },
    { term: "slow down", weight: 4 },
    { term: "chilled", weight: 5 },
    { term: "exhausted", weight: 5 },
    { term: "drained", weight: 5 },
    { term: "peaceful", weight: 3 },
    { term: "relaxed", weight: 5 },
    { term: "relax", weight: 5 },
    { term: "I wanna chill", weight: 4 },
    { term: "sleepy", weight: 2 },
    { term: "tired", weight: 5 },
    { term: "calm", weight: 5 },
    { term: "quiet", weight: 2 },
  ],
  energy: [
    { term: "energy", weight: 7, exactMode: true },
    { term: "wake up", weight: 4 },
    { term: "I want energy", weight: 4 },
    { term: "workout", weight: 5 },
    { term: "motivated", weight: 5 },
    { term: "energetic", weight: 5 },
    { term: "power", weight: 3 },
    { term: "dance", weight: 3 },
    { term: "gym", weight: 5 },
    { term: "hype", weight: 5 },
    { term: "run", weight: 2 },
  ],
  worship: [
    { term: "worship", weight: 8, exactMode: true },
    { term: "holy spirit", weight: 5 },
    { term: "read the bible", weight: 5 },
    { term: "prayer", weight: 7 },
    { term: "jesus", weight: 7 },
    { term: "praise", weight: 6 },
    { term: "church", weight: 4 },
    { term: "bible", weight: 6 },
    { term: "pray", weight: 7 },
    { term: "faith", weight: 4 },
    { term: "god", weight: 7 },
  ],
};

function normalizeTranscript(transcript: string) {
  return transcript
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text: string, term: string) {
  const normalizedTerm = normalizeTranscript(term);
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}($|\\s)`);

  return pattern.test(text);
}

export function parseMood(transcript: string): MoodParseResult {
  const normalizedTranscript = normalizeTranscript(transcript);

  if (!normalizedTranscript) {
    return {
      mode: null,
      confidence: 0,
      detectedMood: null,
      matchedKeywords: [],
    };
  }

  const scores = modes.reduce(
    (result, mode) => {
      result[mode] = {
        hasExactModeMatch: false,
        hasPhraseMatch: false,
        matchedKeywords: [],
        score: 0,
      };

      return result;
    },
    {} as Record<
      FlowCategory,
      {
        hasExactModeMatch: boolean;
        hasPhraseMatch: boolean;
        matchedKeywords: string[];
        score: number;
      }
    >,
  );

  modes.forEach((mode) => {
    moodKeywords[mode].forEach((keyword) => {
      if (keywordMatches(normalizedTranscript, keyword.term)) {
        const normalizedTerm = normalizeTranscript(keyword.term);
        const isPhrase = normalizedTerm.includes(" ");

        scores[mode].score += keyword.weight + (isPhrase ? 1 : 0);
        scores[mode].hasExactModeMatch =
          scores[mode].hasExactModeMatch ||
          Boolean(keyword.exactMode && normalizedTranscript === normalizedTerm);
        scores[mode].hasPhraseMatch =
          scores[mode].hasPhraseMatch || isPhrase;
        scores[mode].matchedKeywords.push(keyword.term);
      }
    });
  });

  const rankedModes = [...modes].sort(
    (a, b) => scores[b].score - scores[a].score,
  );
  const topMode = rankedModes[0];
  const secondMode = rankedModes[1];
  const topScore = scores[topMode].score;
  const secondScore = scores[secondMode].score;
  const matchedKeywords = scores[topMode].matchedKeywords;
  const worshipClearlyMatched =
    topMode !== "worship" || scores.worship.score >= 6;
  const hasMeaningfulMatch = topScore > 0;
  const hasClearWinner = topScore > secondScore || scores[topMode].hasExactModeMatch;
  const confidence = scores[topMode].hasExactModeMatch
    ? 0.95
    : Math.min(
        0.92,
        0.55 +
          topScore * 0.04 +
          (scores[topMode].hasPhraseMatch ? 0.08 : 0),
      );

  if (!hasMeaningfulMatch || !hasClearWinner || !worshipClearlyMatched) {
    return {
      mode: null,
      confidence,
      detectedMood: normalizedTranscript,
      matchedKeywords: matchedKeywords,
    };
  }

  return {
    mode: topMode,
    confidence,
    detectedMood: normalizedTranscript,
    matchedKeywords,
  };
}

export const parseMoodDebugExamples = [
  { expectedMode: "chill", transcript: "chill" },
  { expectedMode: "chill", transcript: "I feel chill" },
  { expectedMode: "chill", transcript: "I am tired" },
  { expectedMode: "focus", transcript: "focus" },
  { expectedMode: "focus", transcript: "I need to study" },
  { expectedMode: "escape", transcript: "I am stressed" },
  { expectedMode: "energy", transcript: "I need energy" },
  { expectedMode: "worship", transcript: "I want to worship" },
] as const;

export function getParseMoodDebugResults() {
  return parseMoodDebugExamples.map((example) => ({
    ...example,
    result: parseMood(example.transcript),
  }));
}
