import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "../../auth/[...nextauth]/route";
import { classifyTaste, getTrackTasteVectors } from "@/lib/classifyTaste";

type SpotifyListResponse<T> = {
  items?: T[];
};

type SpotifyTrack = {
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

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookie = requestHeaders.get("cookie") ?? "";

  if (!host) {
    return Response.json(
      { error: "Unable to resolve request host" },
      { status: 500 },
    );
  }

  const [tracksResponse, artistsResponse] = await Promise.all([
    fetch(`${protocol}://${host}/api/spotify/top-tracks`, {
      headers: { cookie },
    }),
    fetch(`${protocol}://${host}/api/spotify/top-artists`, {
      headers: { cookie },
    }),
  ]);
  const [tracksData, artistsData] = (await Promise.all([
    tracksResponse.json(),
    artistsResponse.json(),
  ])) as [
    SpotifyListResponse<SpotifyTrack> & { error?: string },
    SpotifyListResponse<SpotifyArtist> & { error?: string },
  ];

  if (!tracksResponse.ok) {
    return Response.json(tracksData, { status: tracksResponse.status });
  }

  if (!artistsResponse.ok) {
    return Response.json(artistsData, { status: artistsResponse.status });
  }

  const categories = classifyTaste(
    tracksData.items ?? [],
    artistsData.items ?? [],
  );
  const dominantCategory = Object.entries(categories).reduce(
    (current, [category, value]) =>
      value > categories[current] ? (category as keyof typeof categories) : current,
    "focus" as keyof typeof categories,
  );

  return Response.json({
    categories,
    debug:
      process.env.DEBUG === "true"
        ? {
            tracks: getTrackTasteVectors(
              tracksData.items ?? [],
              artistsData.items ?? [],
            ),
          }
        : undefined,
    dominantCategory,
  });
}
