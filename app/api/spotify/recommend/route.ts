import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "../../auth/[...nextauth]/route";
import { type FlowMode, recommendSongs } from "@/lib/recommendSongs";

type SpotifyListResponse<T> = {
  items?: T[];
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
  external_urls?: {
    spotify?: string;
  };
  id?: string;
  name: string;
  popularity?: number;
  uri?: string;
};

type SpotifyArtist = {
  genres?: string[];
  name: string;
};

const modes: FlowMode[] = ["focus", "escape", "chill", "energy", "worship"];

function isFlowMode(value: string | null): value is FlowMode {
  return modes.some((mode) => mode === value);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (!isFlowMode(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
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

  return Response.json({
    mode,
    songs: recommendSongs(tracksData.items ?? [], artistsData.items ?? [], mode),
  });
}
