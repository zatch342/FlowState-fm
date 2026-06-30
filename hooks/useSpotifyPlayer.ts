"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpotifyImage = {
  url: string;
};

export type SpotifyPlaybackTrack = {
  album: {
    images: SpotifyImage[];
    name: string;
  };
  artists: {
    name: string;
  }[];
  id: string;
  name: string;
  uri: string;
};

type SpotifyPlaybackState = {
  paused: boolean;
  track_window: {
    current_track: SpotifyPlaybackTrack | null;
  };
};

type SpotifyPlayerError = {
  message: string;
};

type SpotifyReadyPayload = {
  device_id: string;
};

type SpotifyPlayerEventMap = {
  account_error: SpotifyPlayerError;
  authentication_error: SpotifyPlayerError;
  autoplay_failed: null;
  initialization_error: SpotifyPlayerError;
  not_ready: SpotifyReadyPayload;
  playback_error: SpotifyPlayerError;
  player_state_changed: SpotifyPlaybackState | null;
  ready: SpotifyReadyPayload;
};

type SpotifyPlayer = {
  addListener: <TEvent extends keyof SpotifyPlayerEventMap>(
    event: TEvent,
    callback: (payload: SpotifyPlayerEventMap[TEvent]) => void,
  ) => boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
};

type SpotifyPlayerConstructor = new (options: {
  getOAuthToken: (callback: (token: string) => void) => void;
  name: string;
  volume?: number;
}) => SpotifyPlayer;

type SpotifyWindow = Window & {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: {
    Player: SpotifyPlayerConstructor;
  };
};

const SPOTIFY_SDK_SRC = "https://sdk.scdn.co/spotify-player.js";
const SPOTIFY_READY_TIMEOUT_MS = 10000;
const SPOTIFY_BROWSER_MESSAGE =
  "Playback inside FlowState works best on desktop Chrome with Spotify Premium.";
const SPOTIFY_FRESH_CONNECTION_MESSAGE =
  "Spotify needs a fresh connection. Please log out and log in again.";

export type SpotifyPlaybackStatus =
  | "idle"
  | "sdk-loading"
  | "connecting-device"
  | "player-ready"
  | "playing"
  | "paused"
  | "unsupported-browser"
  | "error";

let sdkLoadPromise: Promise<void> | null = null;

function getSpotifyWindow() {
  if (typeof window === "undefined") {
    return null;
  }

  return window as SpotifyWindow;
}

function loadSpotifySdk() {
  const spotifyWindow = getSpotifyWindow();

  if (!spotifyWindow) {
    return Promise.reject(new Error("Spotify playback requires a browser."));
  }

  if (spotifyWindow.Spotify?.Player) {
    return Promise.resolve();
  }

  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Spotify playback took too long to load."));
    }, SPOTIFY_READY_TIMEOUT_MS);
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SPOTIFY_SDK_SRC}"]`,
    );

    spotifyWindow.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => {
        window.clearTimeout(timeout);
        reject(new Error("Spotify playback could not load."));
      });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = SPOTIFY_SDK_SRC;
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Spotify playback could not load."));
    });
    document.body.appendChild(script);
  });
  sdkLoadPromise = sdkLoadPromise.catch((error: Error) => {
    sdkLoadPromise = null;
    throw error;
  });

  return sdkLoadPromise;
}

function spotifyErrorMessage(error: SpotifyPlayerError) {
  const message = error.message || "Spotify playback is unavailable.";

  if (/premium/i.test(message)) {
    return "Spotify Premium is required for in-app playback.";
  }

  if (/authentication|token/i.test(message)) {
    return SPOTIFY_FRESH_CONNECTION_MESSAGE;
  }

  return message;
}

export function useSpotifyPlayer(accessToken?: string) {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [status, setStatus] = useState<SpotifyPlaybackStatus>("idle");
  const [currentTrack, setCurrentTrack] = useState<SpotifyPlaybackTrack | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    deviceIdRef.current = null;
    setPlayer(null);
    setDeviceId(null);
    setIsReady(false);
    setIsActive(false);
    setIsPaused(true);
    setStatus("idle");
    setCurrentTrack(null);
  }, []);

  useEffect(() => {
    return () => {
      playerRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!accessToken) {
      setStatus("error");
      setError(SPOTIFY_FRESH_CONNECTION_MESSAGE);
      return null;
    }

    if (playerRef.current && deviceId) {
      setStatus(isPaused ? "paused" : "player-ready");
      return {
        deviceId,
        player: playerRef.current,
      };
    }

    try {
      setError(null);
      setStatus("sdk-loading");
      await loadSpotifySdk();
      setStatus("connecting-device");

      const spotifyWindow = getSpotifyWindow();
      const Player = spotifyWindow?.Spotify?.Player;

      if (!Player) {
        setStatus("unsupported-browser");
        throw new Error(SPOTIFY_BROWSER_MESSAGE);
      }

      let resolveReadyDevice: (readyDeviceId: string) => void = () => {};
      let rejectReadyDevice: (reason: Error) => void = () => {};
      const readyDevicePromise = new Promise<string>((resolve, reject) => {
        resolveReadyDevice = resolve;
        rejectReadyDevice = reject;
      });
      const readyDeviceTimeout = window.setTimeout(() => {
        rejectReadyDevice(
          new Error("Spotify playback device took too long to become ready."),
        );
      }, SPOTIFY_READY_TIMEOUT_MS);
      const nextPlayer = new Player({
        getOAuthToken: (callback) => callback(accessToken),
        name: "FlowState.fm",
        volume: 0.8,
      });

      nextPlayer.addListener("ready", ({ device_id: readyDeviceId }) => {
        deviceIdRef.current = readyDeviceId;
        setDeviceId(readyDeviceId);
        setIsReady(true);
        setIsActive(true);
        setStatus("player-ready");
        window.clearTimeout(readyDeviceTimeout);
        resolveReadyDevice(readyDeviceId);
      });
      nextPlayer.addListener("not_ready", () => {
        setIsReady(false);
        setIsActive(false);
        setStatus("connecting-device");
      });
      nextPlayer.addListener("player_state_changed", (state) => {
        if (!state) {
          return;
        }

        setIsActive(true);
        setIsPaused(state.paused);
        setStatus(state.paused ? "paused" : "playing");
        setCurrentTrack(state.track_window.current_track);
      });
      nextPlayer.addListener("initialization_error", (playerError) => {
        setStatus("error");
        setError(spotifyErrorMessage(playerError));
      });
      nextPlayer.addListener("authentication_error", (playerError) => {
        setStatus("error");
        setError(spotifyErrorMessage(playerError));
      });
      nextPlayer.addListener("account_error", (playerError) => {
        setStatus("error");
        setError(spotifyErrorMessage(playerError));
      });
      nextPlayer.addListener("playback_error", (playerError) => {
        setStatus("error");
        setError(spotifyErrorMessage(playerError));
      });
      nextPlayer.addListener("autoplay_failed", () => {
        setStatus("paused");
        setError("Spotify blocked playback. Press Play selected again to continue.");
      });

      const connected = await nextPlayer.connect();

      if (!connected) {
        window.clearTimeout(readyDeviceTimeout);
        setStatus("unsupported-browser");
        setError(SPOTIFY_BROWSER_MESSAGE);
        return null;
      }

      const readyDeviceId = await readyDevicePromise;
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);

      return {
        deviceId: readyDeviceId,
        player: nextPlayer,
      };
    } catch (connectError) {
      const message =
        connectError instanceof Error
          ? connectError.message
          : "Spotify playback could not start.";
      setStatus(
        message === SPOTIFY_BROWSER_MESSAGE ? "unsupported-browser" : "error",
      );
      setError(message);
      return null;
    }
  }, [accessToken, deviceId, isPaused]);

  return {
    connect,
    currentTrack,
    deviceId,
    disconnect,
    error,
    isActive,
    isConnecting: status === "connecting-device",
    isPaused,
    isReady,
    isSdkLoading: status === "sdk-loading",
    isUnsupportedBrowser: status === "unsupported-browser",
    player,
    status,
  };
}
