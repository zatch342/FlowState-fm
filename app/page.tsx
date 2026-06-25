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

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let isActive = true;

    async function loadProfile() {
      setIsProfileLoading(true);
      setProfile(null);
      setProfileError(null);

      try {
        const response = await fetch("/api/spotify/me");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load Spotify profile");
        }

        if (isActive) {
          setProfile(data);
        }
      } catch (error) {
        if (isActive) {
          setProfileError(
            error instanceof Error
              ? error.message
              : "Failed to load Spotify profile",
          );
        }
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [status]);

  const displayName =
    profile?.display_name ?? session?.user?.name ?? "listener";
  const profileImage = profile?.images?.[0]?.url ?? session?.user?.image;

  return (
    <main className="h-screen bg-black text-white flex flex-col items-center justify-center">

      <h1 className="text-6xl font-bold mb-4">
        FlowState.fm
      </h1>

      <p className="text-zinc-400 mb-10">
        Enter flow state instantly.
      </p>

      {session ? (
        <div className="flex flex-col items-center gap-4">
          {profileImage ? (
            <div
              role="img"
              aria-label={`${displayName} Spotify profile`}
              className="h-24 w-24 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${profileImage})` }}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="text-center">
            <h2 className="text-2xl font-semibold">Hi {displayName} 👋</h2>
            <p className="mt-2 text-green-400 font-medium">
              Connected to Spotify
            </p>
          </div>

          {isProfileLoading ? (
            <p className="text-sm text-zinc-500">Loading Spotify profile...</p>
          ) : profileError ? (
            <p className="text-sm text-red-400">{profileError}</p>
          ) : (
            <p className="text-zinc-400">
              Country: {profile?.country ?? "Unknown"}
            </p>
          )}

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

    </main>
  );
}
