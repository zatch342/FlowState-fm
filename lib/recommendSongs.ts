import {
  type FlowCategory,
  getTrackTasteVector,
  type SpotifyArtistForTaste,
  type SpotifyTrackForTaste,
  trackCategoryConfidence,
} from "./classifyTaste";

export type FlowMode = FlowCategory;

export type RecommendedSong = {
  title: string;
  artist: string;
  image?: string;
  score: number;
  reason: string;
  spotifyUri?: string;
  spotifyUrl?: string;
  trackId?: string;
};

type SpotifyTrack = SpotifyTrackForTaste & {
  album?: {
    images?: {
      url: string;
    }[];
  };
  external_urls?: {
    spotify?: string;
  };
  id?: string;
  uri?: string;
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

const worshipExcludedTitleKeywords = [
  "shit",
  "fuck",
  "sex",
  "hate",
  "kill",
  "party",
];

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

function artistAffinity(
  track: SpotifyTrack,
  artists: SpotifyArtist[],
  mode: FlowMode,
) {
  const genres = matchedGenres(track, artists);
  const matchCount = genres.reduce((count, genre) => {
    const matches = modeKeywords[mode].filter((keyword) =>
      genre.includes(keyword),
    ).length;

    return count + matches;
  }, 0);

  return Math.min(100, matchCount * 34);
}

function titleHasWorshipExclusion(track: SpotifyTrack): boolean {
  const title = track.name.toLowerCase();

  return worshipExcludedTitleKeywords.some((keyword) => title.includes(keyword));
}

export function isValidRecommendation(
  track: SpotifyTrack,
  artists: SpotifyArtist[],
  mode: FlowMode,
  score?: number,
): boolean {
  const confidence = trackCategoryConfidence(track, artists, mode);

  if (mode === "worship") {
    return !titleHasWorshipExclusion(track) && confidence >= 60;
  }

  if (mode === "energy") {
    return confidence >= 40;
  }

  if (mode === "focus") {
    return (track.duration_ms ?? 0) >= 120000;
  }

  if (mode === "chill" || mode === "escape") {
    return score === undefined ? confidence >= 35 : score >= 35;
  }

  return true;
}

function reasonFor(
  mode: FlowMode,
  confidence: number,
  vectorScore: number,
  affinity: number,
) {
  if (affinity >= 60) {
    return `Artist genre and track signals strongly match ${mode} listening`;
  }

  if (confidence >= 60) {
    return `Track title, genre, and duration strongly match ${mode} listening`;
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
  const confidence = trackCategoryConfidence(track, artists, mode);
  const popularityScore = mode === "focus" ? 100 - popularity : popularity;

  return {
    reason: reasonFor(mode, confidence, categoryMatch, affinity),
    score: clampScore(
      confidence * 0.4 + popularityScore * 0.3 + duration * 0.2 + affinity * 0.1,
    ),
  };
}

export function recommendSongs(
  tracks: SpotifyTrack[] = [],
  artists: SpotifyArtist[] = [],
  mode: FlowMode,
): RecommendedSong[] {
  return tracks
    .filter((track) => isValidRecommendation(track, artists, mode))
    .map((track) => {
      const artist = (track.artists ?? [])
        .map((trackArtist) => trackArtist.name)
        .join(", ");
      const recommendation = scoreTrack(track, artists, mode);

      return {
        title: track.name,
        artist: artist || "Unknown artist",
        image: track.album?.images?.[0]?.url,
        spotifyUri: track.uri,
        spotifyUrl: track.external_urls?.spotify,
        track,
        trackId: track.id,
        ...recommendation,
      };
    })
    .filter((song) => isValidRecommendation(song.track, artists, mode, song.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((song) => ({
      artist: song.artist,
      image: song.image,
      reason: song.reason,
      score: song.score,
      spotifyUri: song.spotifyUri,
      spotifyUrl: song.spotifyUrl,
      title: song.title,
      trackId: song.trackId,
    }));
}
