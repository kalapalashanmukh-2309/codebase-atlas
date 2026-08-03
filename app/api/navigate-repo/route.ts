/**
 * POST /api/navigate-repo
 *
 * Repo-aware conversational navigator endpoint.
 * Accepts { repoUrl: string, messages: { role: 'user' | 'assistant', content: string }[] }
 * and returns an AI assistant response with optional actions.
 */

const GEMINI_MODEL = "gemini-2.5-flash";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface NavigateRepoRequest {
  repoUrl?: string;
  messages?: ChatMessage[];
}

export interface NavigateRepoResponse {
  content: string;
  actions?: any[]; // placeholder for graph navigation actions
}

export const NAVIGATOR_SYSTEM_PROMPT = `You are a codebase navigator assistant. You help developers understand a specific GitHub repository. You are given the repo URL and a conversation. Answer clearly and concisely. If you don't know something, say so.`;

export async function POST(request: Request) {
  let body: NavigateRepoRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { repoUrl, messages = [] } = body;

  if (!repoUrl) {
    return Response.json(
      { error: "repoUrl parameter is required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages array must contain at least one message." },
      { status: 400 }
    );
  }

  // Include last N (e.g. 10) messages as context
  const recentMessages = messages.slice(-10);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const lastUserMessage = recentMessages.filter((m) => m.role === "user").pop()?.content || "";
    return Response.json({
      content: `Got your message: "${lastUserMessage}". (Offline Mode: Add GEMINI_API_KEY to environment variables for full LLM responses).`,
      actions: [],
    } satisfies NavigateRepoResponse);
  }

  // Convert messages to Gemini API format
  const contents = recentMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemInstruction = `${NAVIGATOR_SYSTEM_PROMPT}\nTarget Repository URL: ${repoUrl}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const rawText =
      json.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I am unable to process this question right now.";

    return Response.json({
      content: rawText,
      actions: [],
    } satisfies NavigateRepoResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
