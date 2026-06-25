"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type SpotifyProfile = {
  country?: string;
  display_name?: string;
  images?: {
    url: string;
  }[];
};

type SpotifyImage = {
  url: string;
};

type SpotifyTrack = {
  id: string;
  name: string;
  album: {
    images?: SpotifyImage[];
  };
  artists: {
    id: string;
    name: string;
  }[];
};

type SpotifyArtist = {
  id: string;
  name: string;
  images?: SpotifyImage[];
};

type SpotifyListResponse<T> = {
  items?: T[];
};

type SpotifyResource<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};

type TasteCategories = {
  focus: number;
  escape: number;
  chill: number;
  energy: number;
  worship: number;
};

type FlowMode = keyof TasteCategories;

type TasteResponse = {
  categories: TasteCategories;
  debug?: {
    tracks: {
      artist: string;
      title: string;
      vector: TasteCategories;
    }[];
  };
  dominantCategory: FlowMode;
};

type RecommendationResponse = {
  mode: FlowMode;
  songs: {
    artist: string;
    image?: string;
    reason: string;
    score: number;
    title: string;
  }[];
};

const flowCategories: {
  key: FlowMode;
  label: string;
}[] = [
  { key: "focus", label: "Focus" },
  { key: "escape", label: "Escape" },
  { key: "chill", label: "Chill" },
  { key: "energy", label: "Energy" },
  { key: "worship", label: "Worship" },
];

function useSpotifyResource<T>(
  endpoint: string,
  enabled: boolean,
): SpotifyResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isActive = true;

    async function loadResource() {
      setIsLoading(true);
      setData(null);
      setError(null);

      try {
        const response = await fetch(endpoint);
        const resourceData = await response.json();

        if (!response.ok) {
          throw new Error(resourceData.error ?? "Failed to load Spotify data");
        }

        if (isActive) {
          setData(resourceData);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load Spotify data",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadResource();

    return () => {
      isActive = false;
    };
  }, [enabled, endpoint]);

  return { data, error, isLoading };
}

function ImageBubble({
  label,
  size = "md",
  url,
}: {
  label: string;
  size?: "sm" | "md" | "lg";
  url?: string;
}) {
  const sizeClass = {
    sm: "h-14 w-14 text-lg",
    md: "h-16 w-16 text-xl",
    lg: "h-24 w-24 text-3xl",
  }[size];

  if (url) {
    return (
      <div
        role="img"
        aria-label={label}
        className={`${sizeClass} shrink-0 rounded-full bg-cover bg-center`}
        style={{ backgroundImage: `url(${url})` }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-300`}
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

function SectionState({
  emptyText,
  error,
  isEmpty,
  isLoading,
}: {
  emptyText: string;
  error: string | null;
  isEmpty: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (isEmpty) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  return null;
}

function ModeButtons({
  selectedMode,
  onSelectMode,
}: {
  selectedMode: FlowMode;
  onSelectMode: (mode: FlowMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {flowCategories.map((category) => {
        const isSelected = selectedMode === category.key;

        return (
          <button
            key={category.key}
            onClick={() => onSelectMode(category.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isSelected
                ? "bg-green-400 text-black"
                : "border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

function FlowBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span>{label}</span>
        <span className="text-zinc-500">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-green-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const [selectedMode, setSelectedMode] = useState<FlowMode | null>(null);
  const profileState = useSpotifyResource<SpotifyProfile>(
    "/api/spotify/me",
    isAuthenticated,
  );
  const topTracksState = useSpotifyResource<SpotifyListResponse<SpotifyTrack>>(
    "/api/spotify/top-tracks",
    isAuthenticated,
  );
  const topArtistsState = useSpotifyResource<SpotifyListResponse<SpotifyArtist>>(
    "/api/spotify/top-artists",
    isAuthenticated,
  );
  const tasteState = useSpotifyResource<TasteResponse>(
    "/api/spotify/taste",
    isAuthenticated,
  );
  const profile = profileState.data;
  const topTracks = topTracksState.data?.items ?? [];
  const topArtists = topArtistsState.data?.items ?? [];
  const taste = tasteState.data;
  const activeMode = selectedMode ?? taste?.dominantCategory ?? "focus";
  const recommendationState = useSpotifyResource<RecommendationResponse>(
    `/api/spotify/recommend?mode=${activeMode}`,
    isAuthenticated,
  );
  const recommendedSongs = recommendationState.data?.songs ?? [];

  const displayName =
    profile?.display_name ?? session?.user?.name ?? "listener";
  const profileImage =
    profile?.images?.[0]?.url ?? session?.user?.image ?? undefined;

  return (
    <main className="min-h-screen bg-black px-6 py-14 text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center">

      <h1 className="text-6xl font-bold mb-4">
        FlowState.fm
      </h1>

      <p className="text-zinc-400 mb-10">
        Enter flow state instantly.
      </p>

      {session ? (
        <div className="flex w-full flex-col items-center gap-8">
          <ImageBubble
            label={`${displayName} Spotify profile`}
            size="lg"
            url={profileImage}
          />

          <div className="text-center">
            <h2 className="text-2xl font-semibold">Hi {displayName} 👋</h2>
            <p className="mt-2 text-green-400 font-medium">
              Connected to Spotify
            </p>
          </div>

          {profileState.isLoading ? (
            <p className="text-sm text-zinc-500">Loading Spotify profile...</p>
          ) : profileState.error ? (
            <p className="text-sm text-red-400">{profileState.error}</p>
          ) : (
            <p className="text-zinc-400">
              Country: {profile?.country ?? "Unknown"}
            </p>
          )}

          <section className="w-full">
            <h3 className="mb-4 text-xl font-semibold">Your FlowState</h3>
            <SectionState
              emptyText="No FlowState profile yet."
              error={tasteState.error}
              isEmpty={!taste}
              isLoading={tasteState.isLoading}
            />

            {taste ? (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm text-zinc-500">Current vibe:</p>
                  <p className="text-3xl font-bold uppercase tracking-normal text-green-400">
                    {taste.dominantCategory}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {flowCategories.map((category) => (
                    <FlowBar
                      key={category.key}
                      label={category.label}
                      value={taste.categories[category.key]}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="w-full">
            <h3 className="mb-4 text-xl font-semibold">Flow Modes</h3>
            <ModeButtons
              selectedMode={activeMode}
              onSelectMode={setSelectedMode}
            />
          </section>

          <section className="w-full">
            <h3 className="mb-4 text-xl font-semibold">Recommended Now</h3>
            <SectionState
              emptyText="No strong matches found. Try another Flow Mode."
              error={recommendationState.error}
              isEmpty={recommendedSongs.length === 0}
              isLoading={recommendationState.isLoading}
            />

            {recommendedSongs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recommendedSongs.map((song) => (
                  <div
                    key={`${song.title}-${song.artist}`}
                    className="flex items-center gap-4"
                  >
                    <ImageBubble
                      label={`${song.title} cover`}
                      size="sm"
                      url={song.image}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{song.title}</p>
                      <p className="truncate text-sm text-zinc-400">
                        {song.artist}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Why this? {song.reason}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-green-400">
                      {song.score}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {taste?.debug ? (
            <section className="w-full">
              <h3 className="mb-4 text-xl font-semibold">Debug Taste Values</h3>
              <div className="flex flex-col gap-4">
                {taste.debug.tracks.map((track) => (
                  <div key={`${track.title}-${track.artist}`}>
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-zinc-500">{track.artist}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-400 sm:grid-cols-5">
                      {flowCategories.map((category) => (
                        <p key={category.key}>
                          {category.label}: {track.vector[category.key]}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="w-full">
            <h3 className="mb-4 text-xl font-semibold">Your Top Tracks</h3>
            <SectionState
              emptyText="No top tracks found yet."
              error={topTracksState.error}
              isEmpty={topTracks.length === 0}
              isLoading={topTracksState.isLoading}
            />

            {topTracks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topTracks.map((track) => {
                  const artistName =
                    track.artists.map((artist) => artist.name).join(", ") ||
                    "Unknown artist";

                  return (
                    <div key={track.id} className="flex items-center gap-4">
                      <ImageBubble
                        label={`${track.name} album cover`}
                        size="sm"
                        url={track.album.images?.[0]?.url}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{track.name}</p>
                        <p className="truncate text-sm text-zinc-400">
                          {artistName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="w-full">
            <h3 className="mb-4 text-xl font-semibold">Your Top Artists</h3>
            <SectionState
              emptyText="No top artists found yet."
              error={topArtistsState.error}
              isEmpty={topArtists.length === 0}
              isLoading={topArtistsState.isLoading}
            />

            {topArtists.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topArtists.map((artist) => (
                  <div key={artist.id} className="flex items-center gap-4">
                    <ImageBubble
                      label={`${artist.name} artist image`}
                      size="sm"
                      url={artist.images?.[0]?.url}
                    />
                    <p className="min-w-0 truncate font-medium">
                      {artist.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <button
            onClick={() => signOut()}
            className="border border-zinc-700 px-6 py-3 rounded-full font-semibold text-zinc-200 hover:bg-zinc-900 transition"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("spotify", { callbackUrl: "/" })}
          disabled={isLoading}
          className="bg-green-500 px-6 py-3 rounded-full font-semibold text-black hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 transition"
        >
          {isLoading ? "Checking Spotify..." : "Login with Spotify"}
        </button>
      )}

      </div>
    </main>
  );
}
