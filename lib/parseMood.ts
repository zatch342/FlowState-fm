import type { FlowCategory } from "./classifyTaste";

export type MoodParseResult = {
  mode: FlowCategory | null;
  confidence: number;
  detectedMood: string | null;
  matchedKeywords: string[];
};

type WeightedKeyword = {
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
    { term: "deep work", weight: 4 },
    { term: "need to focus", weight: 4 },
    { term: "lock in", weight: 3 },
    { term: "concentrate", weight: 3 },
    { term: "productive", weight: 3 },
    { term: "coding", weight: 3 },
    { term: "study", weight: 2 },
    { term: "work", weight: 2 },
    { term: "exam", weight: 2 },
    { term: "read", weight: 2 },
    { term: "focus", weight: 2 },
  ],
  escape: [
    { term: "tired of everything", weight: 5 },
    { term: "need a break", weight: 4 },
    { term: "burned out", weight: 4 },
    { term: "burnt out", weight: 4 },
    { term: "overwhelmed", weight: 4 },
    { term: "stressed", weight: 3 },
    { term: "burnout", weight: 3 },
    { term: "escape", weight: 3 },
    { term: "pressure", weight: 2 },
  ],
  chill: [
    { term: "slow down", weight: 4 },
    { term: "exhausted", weight: 3 },
    { term: "drained", weight: 3 },
    { term: "peaceful", weight: 3 },
    { term: "relax", weight: 3 },
    { term: "sleepy", weight: 2 },
    { term: "tired", weight: 2 },
    { term: "calm", weight: 2 },
    { term: "quiet", weight: 2 },
  ],
  energy: [
    { term: "wake up", weight: 4 },
    { term: "workout", weight: 3 },
    { term: "motivated", weight: 3 },
    { term: "energetic", weight: 3 },
    { term: "power", weight: 3 },
    { term: "dance", weight: 3 },
    { term: "gym", weight: 2 },
    { term: "hype", weight: 2 },
    { term: "run", weight: 2 },
  ],
  worship: [
    { term: "holy spirit", weight: 5 },
    { term: "read the bible", weight: 5 },
    { term: "worship", weight: 5 },
    { term: "prayer", weight: 5 },
    { term: "jesus", weight: 5 },
    { term: "praise", weight: 4 },
    { term: "church", weight: 4 },
    { term: "bible", weight: 4 },
    { term: "pray", weight: 4 },
    { term: "faith", weight: 4 },
    { term: "god", weight: 4 },
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
        matchedKeywords: [],
        score: 0,
      };

      return result;
    },
    {} as Record<FlowCategory, { matchedKeywords: string[]; score: number }>,
  );

  modes.forEach((mode) => {
    moodKeywords[mode].forEach((keyword) => {
      if (keywordMatches(normalizedTranscript, keyword.term)) {
        scores[mode].score += keyword.weight;
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
    topMode !== "worship" || scores.worship.score >= 4;
  const hasEnoughScore = topScore >= 2 && topScore - secondScore >= 1;
  const confidence = topScore > 0 ? Math.min(0.98, topScore / (topScore + 3)) : 0;

  if (!hasEnoughScore || confidence < 0.4 || !worshipClearlyMatched) {
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
