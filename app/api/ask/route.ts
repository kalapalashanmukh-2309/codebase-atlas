/**
 * POST /api/ask
 *
 * Accepts { repoUrl: string, question: string } and returns a hard-coded answer.
 * This will be replaced with real Q&A logic later.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { repoUrl, question } = body as {
    repoUrl: string;
    question: string;
  };

  // Guard: require both fields
  if (!repoUrl || !question) {
    return Response.json(
      { error: "repoUrl and question are required" },
      { status: 400 }
    );
  }

  // Hard-coded mock response for now
  return Response.json({
    answer: "This is a test Q&A response.",
  });
}
