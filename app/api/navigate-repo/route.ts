/**
 * POST /api/navigate-repo
 *
 * Repo-aware conversational navigator endpoint returning structured assistant content
 * and interactive UI action suggestions (focusFiles, showFunction, openDocsPage).
 */

const GEMINI_MODEL = "gemini-2.5-flash";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  actions?: NavigatorAction[];
}

export interface NavigatorAction {
  label: string;
  payload: {
    type: "focusFiles" | "showFunction" | "openDocsPage";
    data: any;
  };
}

export interface NavigateRepoRequest {
  repoUrl?: string;
  messages?: ChatMessage[];
}

export interface NavigateRepoResponse {
  content: string;
  actions?: NavigatorAction[];
}

export const NAVIGATOR_SYSTEM_PROMPT = `You are a codebase navigator assistant. You help developers understand a specific GitHub repository.
You are given the repo URL and a conversation. Answer clearly and concisely. If you don't know something, say so.

When relevant, suggest 1–3 interactive UI actions in the actions array to help the developer explore the repo.
Supported action types:
1. focusFiles: { label: "Focus auth files", payload: { type: "focusFiles", data: { files: ["lib/auth.ts", "routes/auth.ts"] } } }
2. showFunction: { label: "Show parseArgs function", payload: { type: "showFunction", data: { functionName: "parseArgs" } } }
3. openDocsPage: { label: "Open Overview docs", payload: { type: "openDocsPage", data: { slug: "overview" } } }

Return a JSON object with keys:
- content: (string answer)
- actions: (array of action objects, or empty array [])

Do NOT include markdown formatting or backticks around the JSON. Return ONLY raw JSON.`;

/**
 * Robustly parses LLM JSON string response.
 */
function parseNavigatorJsonResponse(rawText: string): NavigateRepoResponse {
  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.slice(0, -3);
    }

    const parsed = JSON.parse(cleanText.trim());

    return {
      content: typeof parsed.content === "string" ? parsed.content : rawText,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    return {
      content: rawText,
      actions: [],
    };
  }
}

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

  const recentMessages = messages.slice(-10);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const lastUserMessage = recentMessages.filter((m) => m.role === "user").pop()?.content || "";

    const sampleActions: NavigatorAction[] = [
      {
        label: "📖 Open Overview docs",
        payload: { type: "openDocsPage", data: { slug: "overview" } },
      },
    ];

    return Response.json({
      content: `Got your question about ${repoUrl}: "${lastUserMessage}". (Offline Mode)`,
      actions: sampleActions,
    } satisfies NavigateRepoResponse);
  }

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
            response_mime_type: "application/json",
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
      '{"content": "I am unable to answer right now.", "actions": []}';

    const parsedResponse = parseNavigatorJsonResponse(rawText);

    return Response.json(parsedResponse satisfies NavigateRepoResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
