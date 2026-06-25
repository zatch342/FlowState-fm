import { getServerSession } from "next-auth";

import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL("https://api.spotify.com/v1/me/top/artists");
  url.searchParams.set("limit", "10");
  url.searchParams.set("time_range", "medium_term");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
  const topArtists = await response.json();

  return Response.json(topArtists, { status: response.status });
}
