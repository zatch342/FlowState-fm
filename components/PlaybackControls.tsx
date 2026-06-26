"use client";

import { useState } from "react";

import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";

export type PlayableRecommendation = {
  artist: string;
  image?: string;
  spotifyUri?: string;
  spotifyUrl?: string;
  title: string;
  trackId?: string;
};

type PlaybackControlsProps = {
  accessToken?: string;
  selectedTrack: PlayableRecommendation | null;
};

async function sendSpotifyRequest(
  endpoint: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.ok) {
    return;
  }

  if (response.status === 401) {
    throw new Error("Spotify session expired. Sign out and connect Spotify again.");
  }

  if (response.status === 403) {
    throw new Error("Spotify Premium is required for in-app playback.");
  }

  if (response.status === 404) {
    throw new Error("No active Spotify device was found.");
  }

  throw new Error("Spotify playback could not complete that request.");
}

export default function PlaybackControls({
  accessToken,
  selectedTrack,
}: PlaybackControlsProps) {
  const {
    connect,
    currentTrack,
    deviceId,
    error: playerError,
    isPaused,
    isReady,
    player,
  } = useSpotifyPlayer(accessToken);
  const [isLoading, setIsLoading] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const displayedTrack = currentTrack
    ? {
        artist: currentTrack.artists.map((artist) => artist.name).join(", "),
        title: currentTrack.name,
      }
    : selectedTrack;

  async function playSelectedTrack() {
    if (!accessToken) {
      setControlError("Spotify session expired. Sign out and connect Spotify again.");
      return;
    }

    if (!selectedTrack?.spotifyUri) {
      setControlError("This recommendation is missing a Spotify playback URI.");
      return;
    }

    setIsLoading(true);
    setControlError(null);

    try {
      const connection = await connect();
      const activeDeviceId = connection?.deviceId ?? deviceId;

      if (!activeDeviceId) {
        throw new Error("Spotify playback is still connecting. Try again in a moment.");
      }

      await sendSpotifyRequest("/me/player", accessToken, {
        body: JSON.stringify({
          device_ids: [activeDeviceId],
          play: false,
        }),
        method: "PUT",
      });
      await sendSpotifyRequest(`/me/player/play?device_id=${activeDeviceId}`, accessToken, {
        body: JSON.stringify({
          uris: [selectedTrack.spotifyUri],
        }),
        method: "PUT",
      });
    } catch (playError) {
      setControlError(
        playError instanceof Error
          ? playError.message
          : "Spotify playback could not start.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function togglePlayback() {
    if (!player) {
      return;
    }

    setIsLoading(true);
    setControlError(null);

    try {
      if (isPaused) {
        await player.resume();
      } else {
        await player.pause();
      }
    } catch {
      setControlError("Spotify playback controls are temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  const message = controlError ?? playerError;

  return (
    <section className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
            Spotify Playback
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Pick a recommendation, then press play. Spotify Premium is required.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-zinc-500">
              {currentTrack ? "Now playing" : "Selected"}
            </p>
            <p className="truncate font-semibold text-zinc-100">
              {displayedTrack?.title ?? "No track selected"}
            </p>
            <p className="truncate text-sm text-zinc-400">
              {displayedTrack?.artist ?? "Choose a recommendation below"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              aria-label="Play selected Spotify recommendation"
              className="rounded-full bg-green-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || !selectedTrack?.spotifyUri}
              onClick={playSelectedTrack}
              type="button"
            >
              {isLoading ? "Loading..." : "Play selected"}
            </button>

            <button
              aria-label={isPaused ? "Resume Spotify playback" : "Pause Spotify playback"}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || !isReady || !player}
              onClick={togglePlayback}
              type="button"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        {message ? (
          <p className="text-sm text-red-400" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
