export type FlowMode = "focus" | "escape" | "chill" | "energy" | "worship";

export type RecommendedSong = {
  title: string;
  artist: string;
  image?: string;
  score: number;
};

type SpotifyTrack = {
  album?: {
    images?: {
      url: string;
    }[];
  };
  artists?: {
    name: string;
  }[];
  duration_ms?: number;
  name: string;
  popularity?: number;
};

type SpotifyArtist = {
  genres?: string[];
  name: string;
};

const modeKeywords: Record<FlowMode, string[]> = {
  focus: ["instrumental", "ambient", "lofi", "study"],
  escape: ["cinematic", "soundtrack", "emotional", "alternative", "dream"],
  chill: ["acoustic", "rnb", "chill", "soft pop", "indie", "folk"],
  energy: ["dance", "edm", "electronic", "upbeat", "pop", "hip hop"],
  worship: ["christian", "gospel", "worship", "praise"],
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function trackGenres(track: SpotifyTrack, artists: SpotifyArtist[]): string[] {
  const trackArtistNames = new Set(
    (track.artists ?? []).map((artist) => artist.name.toLowerCase()),
  );

  return artists
    .filter((artist) => trackArtistNames.has(artist.name.toLowerCase()))
    .flatMap((artist) => artist.genres ?? [])
    .map((genre) => genre.toLowerCase());
}

function genreScore(genres: string[], mode: FlowMode): number {
  return genres.reduce((score, genre) => {
    const matches = modeKeywords[mode].filter((keyword) =>
      genre.includes(keyword),
    ).length;

    return score + matches * 18;
  }, 0);
}

function scoreTrack(
  track: SpotifyTrack,
  artists: SpotifyArtist[],
  mode: FlowMode,
): number {
  const popularity = track.popularity ?? 50;
  const durationMs = track.duration_ms ?? 210000;
  const durationMinutes = durationMs / 60000;
  const genres = trackGenres(track, artists);
  const genreMatchScore = genreScore(genres, mode);

  if (mode === "focus") {
    return clampScore(
      35 +
        genreMatchScore +
        Math.max(0, durationMinutes - 3) * 8 +
        (100 - popularity) * 0.22,
    );
  }

  if (mode === "escape") {
    return clampScore(
      34 + genreMatchScore + Math.max(0, durationMinutes - 3.5) * 7,
    );
  }

  if (mode === "chill") {
    return clampScore(
      36 +
        genreMatchScore +
        (popularity >= 35 && popularity <= 75 ? 10 : 0) +
        (durationMinutes >= 2.5 && durationMinutes <= 4.5 ? 8 : 0),
    );
  }

  if (mode === "energy") {
    return clampScore(
      30 +
        genreMatchScore +
        popularity * 0.32 +
        (durationMinutes > 0 && durationMinutes <= 3.5 ? 12 : 0),
    );
  }

  return clampScore(35 + genreMatchScore + (popularity <= 85 ? 8 : 0));
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

      return {
        title: track.name,
        artist: artist || "Unknown artist",
        image: track.album?.images?.[0]?.url,
        score: scoreTrack(track, artists, mode),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
