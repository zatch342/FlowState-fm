export type FlowCategory =
  | "focus"
  | "escape"
  | "chill"
  | "energy"
  | "worship";

export type TasteCategories = Record<FlowCategory, number>;

type SpotifyTrack = {
  duration_ms?: number;
  popularity?: number;
};

type SpotifyArtist = {
  genres?: string[];
};

const categories: FlowCategory[] = [
  "focus",
  "escape",
  "chill",
  "energy",
  "worship",
];

const genreWeights: Record<FlowCategory, string[]> = {
  focus: ["lofi", "ambient", "study", "instrumental"],
  energy: ["dance", "electronic", "edm", "hip hop", "pop"],
  chill: ["indie", "acoustic", "folk", "rnb", "chill"],
  escape: ["soundtrack", "cinematic", "alternative", "dream"],
  worship: ["worship", "gospel", "christian", "praise"],
};

function createScores(): Record<FlowCategory, number> {
  return {
    focus: 1,
    escape: 1,
    chill: 1,
    energy: 1,
    worship: 1,
  };
}

function normalizeScores(scores: Record<FlowCategory, number>): TasteCategories {
  const total = categories.reduce((sum, category) => sum + scores[category], 0);

  if (total === 0) {
    return {
      focus: 20,
      escape: 20,
      chill: 20,
      energy: 20,
      worship: 20,
    };
  }

  const normalized = categories.reduce((result, category) => {
    result[category] = Math.round((scores[category] / total) * 100);
    return result;
  }, {} as TasteCategories);
  const roundedTotal = categories.reduce(
    (sum, category) => sum + normalized[category],
    0,
  );
  const dominantCategory = categories.reduce((current, category) =>
    normalized[category] > normalized[current] ? category : current,
  );

  normalized[dominantCategory] += 100 - roundedTotal;

  return normalized;
}

export function classifyTaste(
  tracks: SpotifyTrack[] = [],
  artists: SpotifyArtist[] = [],
): TasteCategories {
  const scores = createScores();

  for (const track of tracks) {
    const popularity = track.popularity ?? 0;
    const durationMs = track.duration_ms ?? 0;

    scores.energy += (popularity / 100) * 2.5;

    if (durationMs >= 300000) {
      scores.escape += 2;
      scores.focus += 0.5;
    } else if (durationMs > 0 && durationMs <= 180000) {
      scores.energy += 1.5;
    } else if (durationMs >= 240000) {
      scores.escape += 0.75;
    }
  }

  for (const artist of artists) {
    for (const genre of artist.genres ?? []) {
      const normalizedGenre = genre.toLowerCase();

      for (const category of categories) {
        if (
          genreWeights[category].some((keyword) =>
            normalizedGenre.includes(keyword),
          )
        ) {
          scores[category] += 4;
        }
      }
    }
  }

  return normalizeScores(scores);
}
