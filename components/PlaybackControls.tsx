"use client";

import { useRef, useState } from "react";

import {
  playbackDiagnostics,
  useSpotifyPlayer,
} from "@/hooks/useSpotifyPlayer";

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
  modeLabel: string;
  selectedTrack: PlayableRecommendation | null;
};

const FRESH_CONNECTION_MESSAGE =
  "Spotify needs a fresh login. Please log out and log in again.";
const BROWSER_EXPECTATION_MESSAGE =
  "Playback inside FlowState works best on desktop Chrome with Spotify Premium.";
const PREMIUM_MESSAGE =
  "Spotify Premium may be required to play inside FlowState.";
const DEVICE_MESSAGE =
  "No active Spotify device was found. Try opening Spotify once, then try again.";
const RATE_LIMIT_MESSAGE =
  "Spotify is rate-limiting requests. Wait a moment and try again.";
const GENERIC_PLAYBACK_MESSAGE =
  "Spotify playback could not complete that request. You can still open the track in Spotify.";

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
    throw new Error(FRESH_CONNECTION_MESSAGE);
  }

  if (response.status === 403) {
    throw new Error(PREMIUM_MESSAGE);
  }

  if (response.status === 404) {
    throw new Error(DEVICE_MESSAGE);
  }

  if (response.status === 429) {
    throw new Error(RATE_LIMIT_MESSAGE);
  }

  throw new Error(GENERIC_PLAYBACK_MESSAGE);
}

function imageForTrack(track: PlayableRecommendation | null) {
  return track?.image;
}

export default function PlaybackControls({
  accessToken,
  modeLabel,
  selectedTrack,
}: PlaybackControlsProps) {
  const {
    connect,
    currentTrack,
    deviceId,
    error: playerError,
    isPaused,
    isReady,
    isSdkLoading,
    isConnecting,
    isUnsupportedBrowser,
    player,
    status,
  } = useSpotifyPlayer(accessToken);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [lastStartedSpotifyUri, setLastStartedSpotifyUri] = useState<
    string | null
  >(null);
  const playRequestRef = useRef(false);
  const displayedTrack = currentTrack
    ? {
        artist: currentTrack.artists.map((artist) => artist.name).join(", "),
        image: currentTrack.album.images?.[0]?.url,
        title: currentTrack.name,
      }
    : selectedTrack;
  const isBusy = isLoading || isTransferring || isStartingPlayback;
  const isPlaybackSettling =
    status === "playing" || status === "player-ready" || isStartingPlayback;
  const isSelectedTrackPlaying =
    (status === "playing" && selectedTrack?.spotifyUri === currentTrack?.uri) ||
    (isPlaybackSettling &&
      selectedTrack?.spotifyUri === lastStartedSpotifyUri);
  const canPlayInFlowState =
    Boolean(accessToken && selectedTrack?.spotifyUri) &&
    !isUnsupportedBrowser &&
    !isSdkLoading &&
    !isConnecting &&
    !isSelectedTrackPlaying;
  const message = controlError ?? playerError;
  const shouldShowFallback =
    Boolean(selectedTrack?.spotifyUrl) &&
    (Boolean(message) || isUnsupportedBrowser || !canPlayInFlowState);
  const statusLabel =
    isSdkLoading
      ? "Loading Spotify player"
      : isConnecting
        ? "Connecting playback device"
        : isTransferring
          ? "Transferring playback"
          : isStartingPlayback
            ? "Playing selected track"
            : status === "playing"
              ? "Playing"
              : status === "paused"
                ? "Paused"
                : isReady
                  ? "Player ready"
                  : isUnsupportedBrowser
                    ? "Browser fallback available"
                    : "Ready when you are";
  const supportMessage = isUnsupportedBrowser
    ? BROWSER_EXPECTATION_MESSAGE
    : "Pick a recommendation, then play it inside FlowState. Spotify Premium is required.";
  const playButtonText = isBusy
    ? statusLabel
    : isSelectedTrackPlaying
      ? "Playing in FlowState"
      : "Play in FlowState";

  async function playSelectedTrack() {
    if (playRequestRef.current || isBusy || isSdkLoading || isConnecting) {
      return;
    }

    if (!accessToken) {
      setControlError(FRESH_CONNECTION_MESSAGE);
      return;
    }

    if (!selectedTrack?.spotifyUri) {
      setControlError("This recommendation is missing a Spotify playback URI.");
      return;
    }

    playRequestRef.current = true;
    setIsLoading(true);
    setControlError(null);

    try {
      const connection = await connect();
      const activeDeviceId = connection?.deviceId ?? deviceId;

      if (!activeDeviceId) {
        throw new Error(
          "FlowState could not find a Spotify playback device yet. Try again in a moment or open the track in Spotify.",
        );
      }

      setIsLoading(false);
      setIsTransferring(true);
      playbackDiagnostics.log("transfer playback started", {
        deviceId: activeDeviceId,
      });
      await sendSpotifyRequest("/me/player", accessToken, {
        body: JSON.stringify({
          device_ids: [activeDeviceId],
          play: false,
        }),
        method: "PUT",
      });
      playbackDiagnostics.log("transfer playback succeeded", {
        deviceId: activeDeviceId,
      });
      setIsTransferring(false);
      setIsStartingPlayback(true);
      playbackDiagnostics.log("play request started", {
        spotifyUri: selectedTrack.spotifyUri,
      });
      await sendSpotifyRequest(`/me/player/play?device_id=${activeDeviceId}`, accessToken, {
        body: JSON.stringify({
          uris: [selectedTrack.spotifyUri],
        }),
        method: "PUT",
      });
      setLastStartedSpotifyUri(selectedTrack.spotifyUri);
      playbackDiagnostics.log("play request succeeded", {
        spotifyUri: selectedTrack.spotifyUri,
      });
    } catch (playError) {
      playbackDiagnostics.error("SDK/player error", {
        message:
          playError instanceof Error
            ? playError.message
            : "Spotify playback could not start.",
        phase: "playSelectedTrack",
      });
      setControlError(
        playError instanceof Error
          ? playError.message
          : "Spotify playback could not start.",
      );
    } finally {
      playRequestRef.current = false;
      setIsLoading(false);
      setIsTransferring(false);
      setIsStartingPlayback(false);
    }
  }

  async function togglePlayback() {
    if (!player || isBusy || isSdkLoading || isConnecting) {
      return;
    }

    setIsLoading(true);
    setControlError(null);

    try {
      playbackDiagnostics.log("pause/resume request started", {
        action: isPaused ? "resume" : "pause",
      });
      if (isPaused) {
        await player.resume();
      } else {
        await player.pause();
      }
      playbackDiagnostics.log("pause/resume request succeeded", {
        action: isPaused ? "resume" : "pause",
      });
    } catch {
      playbackDiagnostics.error("SDK/player error", {
        phase: "togglePlayback",
      });
      setControlError(
        "Spotify playback controls are temporarily unavailable. You can still open the track in Spotify.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
              Now Playing
            </p>
            <p className="mt-2 text-sm text-zinc-400">{supportMessage}</p>
          </div>

          <div className="rounded-full border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300">
            {statusLabel}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-zinc-900 bg-black/35 p-4 sm:flex-row sm:items-center">
          <div
            aria-label={
              displayedTrack
                ? `${displayedTrack.title} cover`
                : "Selected track cover"
            }
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-zinc-900 bg-cover bg-center text-2xl font-bold text-zinc-500"
            role="img"
            style={
              imageForTrack(displayedTrack)
                ? { backgroundImage: `url(${imageForTrack(displayedTrack)})` }
                : undefined
            }
          >
            {imageForTrack(displayedTrack) ? null : "FS"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-green-300/10 px-2.5 py-1 text-xs font-semibold uppercase text-green-300">
                {modeLabel}
              </span>
              <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                {status === "playing" ? "Playing" : isPaused ? "Paused" : "Ready"}
              </span>
            </div>
            <p className="truncate text-lg font-semibold text-zinc-100">
              {displayedTrack?.title ?? "No track selected"}
            </p>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {displayedTrack?.artist ?? "Choose a recommendation below"}
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              {displayedTrack
                ? `I'm playing this for your ${modeLabel} flow.`
                : `Select a track and I'll play it for your ${modeLabel} flow.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            aria-label="Play selected Spotify recommendation in FlowState"
            className="rounded-full bg-green-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || !canPlayInFlowState}
            onClick={playSelectedTrack}
            type="button"
          >
            {playButtonText}
          </button>

          <button
            aria-label={isPaused ? "Resume Spotify playback" : "Pause Spotify playback"}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || isSdkLoading || isConnecting || !isReady || !player}
            onClick={togglePlayback}
            type="button"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>

          {selectedTrack?.spotifyUrl ? (
            <a
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-green-300 hover:text-white"
              href={selectedTrack.spotifyUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open in Spotify
            </a>
          ) : null}
        </div>

        {message ? (
          <div
            className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
            role="alert"
          >
            <p>{message}</p>
            {shouldShowFallback ? (
              <p className="mt-2 text-red-100">
                You can still open this recommendation in Spotify.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
