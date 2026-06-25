import {
  type FlowCategory,
  getTrackTasteVector,
  type SpotifyArtistForTaste,
  type SpotifyTrackForTaste,
} from "./classifyTaste";

export type FlowMode = FlowCategory;

export type RecommendedSong = {
  title: string;
  artist: string;
  image?: string;
  score: number;
  reason: string;
};

type SpotifyTrack = SpotifyTrackForTaste & {
  album?: {
    images?: {
      url: string;
    }[];
  };
};

type SpotifyArtist = SpotifyArtistForTaste;

const modeKeywords: Record<FlowMode, string[]> = {
  focus: ["instrumental", "ambient", "lofi", "study"],
  escape: ["cinematic", "soundtrack", "emotional", "alternative", "dream"],
  chill: ["acoustic", "rnb", "chill", "soft pop", "indie", "folk"],
  energy: ["dance", "edm", "electronic", "upbeat", "pop"],
  worship: ["christian", "gospel", "worship", "praise"],
};

const reasonTone: Record<FlowMode, string> = {
  focus: "focus-ready texture",
  escape: "cinematic escape preference",
  chill: "chill + emotional preference",
  energy: "energy-forward listening pattern",
  worship: "worship-centered taste",
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function matchedGenres(track: SpotifyTrack, artists: SpotifyArtist[]): string[] {
  const trackArtistNames = new Set(
    (track.artists ?? []).map((artist) => artist.name.toLowerCase()),
  );

  return artists
    .filter((artist) => trackArtistNames.has(artist.name.toLowerCase()))
    .flatMap((artist) => artist.genres ?? [])
    .map((genre) => genre.toLowerCase());
}

function durationSuitability(track: SpotifyTrack, mode: FlowMode): number {
  const durationMinutes = (track.duration_ms ?? 210000) / 60000;

  if (mode === "focus") {
    return durationMinutes >= 4 ? 100 : durationMinutes >= 3 ? 70 : 35;
  }

  if (mode === "escape") {
    return durationMinutes >= 4.5 ? 100 : durationMinutes >= 3.5 ? 75 : 45;
  }

  if (mode === "chill") {
    return durationMinutes >= 2.5 && durationMinutes <= 4.5 ? 100 : 55;
  }

  if (mode === "energy") {
    return durationMinutes > 0 && durationMinutes <= 3.5 ? 100 : 55;
  }

  return durationMinutes >= 3 && durationMinutes <= 5 ? 100 : 60;
}

function artistAffinity(track: SpotifyTrack, artists: SpotifyArtist[], mode: FlowMode) {
  const genres = matchedGenres(track, artists);
  const matchCount = genres.reduce((count, genre) => {
    const matches = modeKeywords[mode].filter((keyword) =>
      genre.includes(keyword),
    ).length;

    return count + matches;
  }, 0);

  return Math.min(100, matchCount * 34);
}

function reasonFor(mode: FlowMode, vectorScore: number, affinity: number) {
  if (affinity >= 60) {
    return `Matches your ${mode} taste through artist style and ${reasonTone[mode]}`;
  }

  if (vectorScore >= 55) {
    return `Matches your ${mode} taste and ${reasonTone[mode]}`;
  }

  return `Fits your ${mode} mode with a balanced listening pattern`;
}

function scoreTrack(
  track: SpotifyTrack,
  artists: SpotifyArtist[],
  mode: FlowMode,
): { reason: string; score: number } {
  const vector = getTrackTasteVector(track, artists);
  const categoryMatch = vector[mode];
  const popularity = track.popularity ?? 50;
  const duration = durationSuitability(track, mode);
  const affinity = artistAffinity(track, artists, mode);

  return {
    reason: reasonFor(mode, categoryMatch, affinity),
    score: clampScore(
      categoryMatch * 0.4 + popularity * 0.3 + duration * 0.2 + affinity * 0.1,
    ),
  };
}

export function recommendSongs(
  tracks: SpotifyTrack[] = [],
  artists: SpotifyArtist[] = [],
  mode: FlowMode,
): RecommendedSong[] {
  return tracks
    .map((track) => {
      const artist = (track.artists ?? [])
        .map((trackArtist) => trackArtist.name)
        .join(", ");
      const recommendation = scoreTrack(track, artists, mode);

      return {
        title: track.name,
        artist: artist || "Unknown artist",
        image: track.album?.images?.[0]?.url,
        ...recommendation,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
