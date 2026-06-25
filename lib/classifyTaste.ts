export type FlowCategory =
  | "focus"
  | "escape"
  | "chill"
  | "energy"
  | "worship";

export type TasteCategories = Record<FlowCategory, number>;

export type TrackTasteVector = {
  artist: string;
  title: string;
  vector: TasteCategories;
};

export type SpotifyTrackForTaste = {
  artists?: {
    name: string;
  }[];
  duration_ms?: number;
  name: string;
  popularity?: number;
};

export type SpotifyArtistForTaste = {
  genres?: string[];
  name: string;
};

const categories: FlowCategory[] = [
  "focus",
  "escape",
  "chill",
  "energy",
  "worship",
];

const keywordWeights: Record<FlowCategory, string[]> = {
  focus: ["instrumental", "ambient", "study", "lofi"],
  escape: ["cinematic", "soundtrack", "dream", "alternative", "emotional"],
  chill: ["acoustic", "indie", "rnb", "chill", "soft pop", "folk"],
  energy: ["dance", "edm", "electronic", "pop", "upbeat"],
  worship: ["worship", "gospel", "christian", "praise"],
};

const titleKeywords: Record<FlowCategory, string[]> = {
  focus: ["study", "focus", "instrumental", "ambient", "lofi"],
  escape: ["dream", "night", "memory", "escape"],
  chill: ["slow", "easy", "calm", "quiet", "soft"],
  energy: ["party", "dance", "run", "move", "up"],
  worship: [
    "god",
    "jesus",
    "lord",
    "grace",
    "hallelujah",
    "church",
    "holy",
    "worship",
    "praise",
    "faith",
  ],
};

const worshipExcludedTitleKeywords = [
  "shit",
  "fuck",
  "sex",
  "hate",
  "kill",
  "party",
];

function createScores(value = 0): Record<FlowCategory, number> {
  return {
    focus: value,
    escape: value,
    chill: value,
    energy: value,
    worship: value,
  };
}

function normalizeScores(scores: Record<FlowCategory, number>): TasteCategories {
  const total = categories.reduce((sum, category) => sum + scores[category], 0);

  if (total <= 0) {
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

function matchedArtistGenres(
  track: SpotifyTrackForTaste,
  artists: SpotifyArtistForTaste[],
): string[] {
  const trackArtistNames = new Set(
    (track.artists ?? []).map((artist) => artist.name.toLowerCase()),
  );

  return artists
    .filter((artist) => trackArtistNames.has(artist.name.toLowerCase()))
    .flatMap((artist) => artist.genres ?? [])
    .map((genre) => genre.toLowerCase());
}

function keywordMatchRatio(text: string, keywords: string[]): number {
  const matches = keywords.filter((keyword) => text.includes(keyword)).length;

  return Math.min(1, matches / 2);
}

function durationConfidence(
  track: SpotifyTrackForTaste,
  category: FlowCategory,
): number {
  const durationMinutes = (track.duration_ms ?? 210000) / 60000;

  if (category === "focus") {
    if (durationMinutes >= 4) {
      return 100;
    }

    return durationMinutes >= 3 ? 70 : 25;
  }

  if (category === "escape") {
    if (durationMinutes >= 4.5) {
      return 100;
    }

    return durationMinutes >= 3.5 ? 75 : 35;
  }

  if (category === "chill") {
    return durationMinutes >= 2.5 && durationMinutes <= 4.5 ? 100 : 45;
  }

  if (category === "energy") {
    return durationMinutes > 0 && durationMinutes <= 3.5 ? 100 : 45;
  }

  return durationMinutes >= 3 && durationMinutes <= 5 ? 100 : 45;
}

function scoreKeywords(
  scores: Record<FlowCategory, number>,
  searchableText: string,
) {
  for (const category of categories) {
    for (const keyword of keywordWeights[category]) {
      if (searchableText.includes(keyword)) {
        scores[category] += 18;
      }
    }
  }
}

export function trackCategoryConfidence(
  track: SpotifyTrackForTaste,
  artists: SpotifyArtistForTaste[] = [],
  mode: FlowCategory,
): number {
  const title = track.name.toLowerCase();

  if (
    mode === "worship" &&
    worshipExcludedTitleKeywords.some((keyword) => title.includes(keyword))
  ) {
    return 0;
  }

  const genres = matchedArtistGenres(track, artists).join(" ");
  const genreScore = keywordMatchRatio(genres, keywordWeights[mode]) * 50;
  const titleScore = keywordMatchRatio(title, titleKeywords[mode]) * 30;
  const durationScore = (durationConfidence(track, mode) / 100) * 20;

  return Math.round(genreScore + titleScore + durationScore);
}

export function getTrackTasteVector(
  track: SpotifyTrackForTaste,
  artists: SpotifyArtistForTaste[] = [],
): TasteCategories {
  const scores = createScores(2);
  const popularity = track.popularity ?? 50;
  const durationMs = track.duration_ms ?? 210000;
  const durationMinutes = durationMs / 60000;
  const genres = matchedArtistGenres(track, artists);
  const searchableText = [track.name, ...genres].join(" ").toLowerCase();

  scoreKeywords(scores, searchableText);

  for (const category of categories) {
    scores[category] += trackCategoryConfidence(track, artists, category) * 0.45;
  }

  scores.energy += popularity * 0.22;
  scores.focus += (100 - popularity) * 0.12;

  if (durationMinutes > 0 && durationMinutes <= 3) {
    scores.energy += 14;
  }

  if (durationMinutes >= 3 && durationMinutes <= 4.5) {
    scores.chill += 12;
  }

  if (durationMinutes >= 4.5) {
    scores.focus += 12;
    scores.escape += 10;
  }

  if (durationMinutes >= 3.5 && durationMinutes <= 5.5) {
    scores.escape += 6;
  }

  return normalizeScores(scores);
}

export function getTrackTasteVectors(
  tracks: SpotifyTrackForTaste[] = [],
  artists: SpotifyArtistForTaste[] = [],
): TrackTasteVector[] {
  return tracks.map((track) => ({
    artist:
      track.artists?.map((artist) => artist.name).join(", ") ??
      "Unknown artist",
    title: track.name,
    vector: getTrackTasteVector(track, artists),
  }));
}

export function classifyTaste(
  tracks: SpotifyTrackForTaste[] = [],
  artists: SpotifyArtistForTaste[] = [],
): TasteCategories {
  const aggregate = createScores();
  const vectors = getTrackTasteVectors(tracks, artists);

  for (const { vector } of vectors) {
    for (const category of categories) {
      aggregate[category] += vector[category];
    }
  }

  return normalizeScores(aggregate);
}
