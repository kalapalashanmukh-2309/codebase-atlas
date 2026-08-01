/**
 * POST /api/analyze
 *
 * Accepts { repoUrl: string } and returns a hard-coded analysis result.
 * This will be replaced with real analysis logic later.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { repoUrl } = body as { repoUrl: string };

  // Guard: require a repoUrl in the body
  if (!repoUrl) {
    return Response.json(
      { error: "repoUrl is required" },
      { status: 400 }
    );
  }

  // Hard-coded mock response for now
  return Response.json({
    overview: "Hard-coded overview for testing.",
    files: ["src/index.ts", "src/auth.ts"],
    graph: {
      nodes: [{ id: "src", label: "src", type: "folder" }],
      edges: [],
    },
  });
}
