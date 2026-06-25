"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

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
          <p className="text-green-400 font-medium">
            Spotify connected as {session.user?.name ?? "listener"}
          </p>

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
