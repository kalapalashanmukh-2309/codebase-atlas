/**
 * GET /api/file?url=...&path=...
 *
 * Fetches raw file content from GitHub using parseGitHubUrl and fetchFileContent.
 */
import { parseGitHubUrl, fetchFileContent } from "@/lib/github";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("url");
  const path = searchParams.get("path");

  if (!repoUrl || !path) {
    return Response.json(
      { error: "both url and path query parameters are required." },
      { status: 400 }
    );
  }

  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    // Fetch up to 12,000 characters for file viewer modal
    const content = await fetchFileContent(owner, repo, path, 12000);

    if (content === null) {
      return Response.json({ error: "File content could not be retrieved." }, { status: 404 });
    }

    return Response.json({ path, content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch file content.";
    return Response.json({ error: message }, { status: 500 });
  }
}
