"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

import FlowScene from "@/components/FlowScene";
import VoiceMoodButton from "@/components/VoiceMoodButton";
import { useFlowSession } from "@/hooks/useFlowSession";
import type { MoodParseResult } from "@/lib/parseMood";

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
  icon: string;
  key: FlowMode;
  label: string;
}[] = [
  { icon: "🎯", key: "focus", label: "Focus" },
  { icon: "🌊", key: "escape", label: "Escape" },
  { icon: "🌙", key: "chill", label: "Chill" },
  { icon: "⚡", key: "energy", label: "Energy" },
  { icon: "✝", key: "worship", label: "Worship" },
];

const robotMessages: Record<FlowMode, string> = {
  focus:
    "I’ll keep the atmosphere calm and prioritize tracks that support deep work.",
  escape:
    "You seem like you need distance from the noise. I’ll shape the room softer.",
  chill:
    "Let’s slow everything down and make the music easier to breathe with.",
  energy: "I’ll raise the intensity and bring forward songs with more drive.",
  worship: "I’ll keep this space peaceful and centered on worship.",
};

const voiceRobotMessages: Record<FlowMode, string> = {
  focus:
    "You sound ready to lock in. I’ll keep the atmosphere steady and support deep work.",
  escape:
    "You sound like you need some distance from the noise. I’ll soften the space.",
  chill:
    "You sound drained. Let’s slow the room down and make the music easier to breathe with.",
  energy:
    "You sound ready for movement. I’ll raise the intensity and keep the momentum alive.",
  worship:
    "You sound like you want to center your heart. I’ll keep this space peaceful and worshipful.",
};

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
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {flowCategories.map((category) => {
        const isSelected = selectedMode === category.key;

        return (
          <button
            key={category.key}
            aria-label={`Select ${category.label} mode`}
            aria-pressed={isSelected}
            onClick={() => onSelectMode(category.key)}
            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300 ${
              isSelected
                ? "border-green-300 bg-green-300 text-black shadow-[0_0_28px_rgba(74,222,128,0.18)]"
                : "border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <span aria-hidden="true" className="mr-2">
              {category.icon}
            </span>
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
  const [selectedModeSource, setSelectedModeSource] = useState<
    "manual" | "voice" | null
  >(null);
  const [lastVoiceMoodInput, setLastVoiceMoodInput] = useState<string | null>(
    null,
  );
  const [isResumeBadgeDismissed, setIsResumeBadgeDismissed] = useState(false);
  const [shouldPersistFlowSession, setShouldPersistFlowSession] =
    useState(true);
  const {
    clearSession,
    isReady: isFlowSessionReady,
    saveSession,
    session: flowSession,
  } = useFlowSession();
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
  const restoredMode =
    flowSession?.selectedMode ??
    flowSession?.lastRecommendationMode ??
    flowSession?.lastScene ??
    null;
  const activeMode =
    selectedMode ?? restoredMode ?? taste?.dominantCategory ?? "focus";
  const shouldShowResumeBadge =
    isAuthenticated && !isResumeBadgeDismissed && restoredMode !== null;
  const recommendationState = useSpotifyResource<RecommendationResponse>(
    `/api/spotify/recommend?mode=${activeMode}`,
    isAuthenticated && isFlowSessionReady,
  );
  const recommendedSongs = recommendationState.data?.songs ?? [];

  const displayName =
    profile?.display_name ?? session?.user?.name ?? "listener";
  const profileImage =
    profile?.images?.[0]?.url ?? session?.user?.image ?? undefined;
  const robotMessage =
    selectedModeSource === "voice" && selectedMode === activeMode
      ? voiceRobotMessages[activeMode]
      : robotMessages[activeMode];

  useEffect(() => {
    if (
      !isAuthenticated ||
      !isFlowSessionReady ||
      !shouldPersistFlowSession
    ) {
      return;
    }

    const modeToPersist = selectedMode ?? restoredMode ?? taste?.dominantCategory;

    if (!modeToPersist) {
      return;
    }

    saveSession({
      ...(selectedModeSource === "voice" && lastVoiceMoodInput
        ? { lastMoodInput: lastVoiceMoodInput }
        : {}),
      lastRecommendationMode: modeToPersist,
      lastScene: modeToPersist,
      selectedMode: modeToPersist,
    });
  }, [
    isAuthenticated,
    isFlowSessionReady,
    restoredMode,
    saveSession,
    selectedMode,
    selectedModeSource,
    shouldPersistFlowSession,
    lastVoiceMoodInput,
    taste?.dominantCategory,
  ]);

  function selectFlowMode(mode: FlowMode) {
    setShouldPersistFlowSession(true);
    setSelectedMode(mode);
    setSelectedModeSource("manual");
    setIsResumeBadgeDismissed(true);
  }

  const selectVoiceMood = useCallback((result: MoodParseResult) => {
    if (!result.mode) {
      return;
    }

    setShouldPersistFlowSession(true);
    setSelectedMode(result.mode);
    setSelectedModeSource("voice");
    setLastVoiceMoodInput(result.detectedMood);
    setIsResumeBadgeDismissed(true);
  }, []);

  function resumeFlow() {
    if (restoredMode) {
      setSelectedMode(restoredMode);
    }

    setShouldPersistFlowSession(true);
    setSelectedModeSource(null);
    setIsResumeBadgeDismissed(true);
  }

  function resetFlowSession() {
    clearSession();
    setSelectedMode(null);
    setSelectedModeSource(null);
    setLastVoiceMoodInput(null);
    setShouldPersistFlowSession(false);
    setIsResumeBadgeDismissed(true);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-14 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center">

      <h1 className="text-6xl font-bold mb-4">
        FlowState.fm
      </h1>

      <p className="text-zinc-400 mb-10">
        Enter flow state instantly.
      </p>

      {session ? (
        <div className="flex w-full flex-col items-center gap-8">
          {!isFlowSessionReady ? (
            <p className="text-sm text-zinc-500">Restoring Flow session...</p>
          ) : null}

          {shouldShowResumeBadge && restoredMode ? (
            <section className="w-full rounded-lg border border-green-300/20 bg-green-300/10 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
                    Resume Flow
                  </p>
                  <p className="mt-2 text-zinc-200">Welcome back.</p>
                  <p className="text-sm text-zinc-400">
                    Last mode:{" "}
                    <span className="font-semibold uppercase text-green-300">
                      {restoredMode}
                    </span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-green-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
                    onClick={resumeFlow}
                  >
                    Resume
                  </button>
                  <button
                    className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
                    onClick={resetFlowSession}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {isFlowSessionReady ? (
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] lg:items-start">
            <div className="flex flex-col gap-5">
              <section className="w-full">
                <h3 className="mb-4 text-xl font-semibold">Voice Mood</h3>
                <VoiceMoodButton onMoodDetected={selectVoiceMood} />
              </section>

              <section className="w-full">
                <h3 className="mb-4 text-xl font-semibold">Flow Modes</h3>
                <ModeButtons
                  selectedMode={activeMode}
                  onSelectMode={selectFlowMode}
                />
              </section>

              <FlowScene mode={activeMode} />

              <section className="rounded-lg border border-zinc-800 bg-zinc-950/85 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-green-300/30 bg-green-300/10 text-lg">
                    {
                      flowCategories.find(
                        (category) => category.key === activeMode,
                      )?.icon
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
                      Robot note
                    </p>
                    <p className="mt-2 text-zinc-300">
                      {robotMessage}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="flex w-full flex-col gap-6 rounded-lg border border-zinc-900 bg-zinc-950/45 p-5">
              <div className="flex items-center gap-4">
                <ImageBubble
                  label={`${displayName} Spotify profile`}
                  size="lg"
                  url={profileImage}
                />

                <div>
                  <h2 className="text-2xl font-semibold">Hi {displayName} 👋</h2>
                  <p className="mt-2 font-medium text-green-400">
                    Connected to Spotify
                  </p>
                </div>
              </div>

              {profileState.isLoading ? (
                <p className="text-sm text-zinc-500">
                  Loading Spotify profile...
                </p>
              ) : profileState.error ? (
                <p className="text-sm text-red-400">{profileState.error}</p>
              ) : (
                <p className="text-zinc-400">
                  Country: {profile?.country ?? "Unknown"}
                </p>
              )}

              <section className="w-full">
                <h3 className="mb-4 text-xl font-semibold">Flow Profile</h3>
                <SectionState
                  emptyText="No FlowState profile yet."
                  error={tasteState.error}
                  isEmpty={!taste}
                  isLoading={tasteState.isLoading}
                />

                {taste ? (
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className="text-sm text-zinc-500">Current vibe</p>
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
            </aside>
          </div>
          ) : null}

          {isFlowSessionReady ? (
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
          ) : null}

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
