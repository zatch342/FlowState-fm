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

type TasteResponse = {
  categories: TasteCategories;
  dominantCategory: string;
};

const flowCategories: {
  key: keyof TasteCategories;
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
