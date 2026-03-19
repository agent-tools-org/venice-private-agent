import { describe, it, expect, vi, beforeEach } from "vitest";
import { VeniceClient, type VeniceChatResponse } from "../src/llm/venice-client.js";

function createMockResponse(content: string, status = 200): Response {
  const headers = new Headers({
    "content-type": "application/json",
    server: "venice-api",
  });

  const body: VeniceChatResponse = {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: Date.now(),
    model: "llama-3.3-70b",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };

  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("VeniceClient", () => {
  let client: VeniceClient;

  beforeEach(() => {
    client = new VeniceClient({
      apiKey: "test-key",
      baseUrl: "https://api.venice.ai/api/v1",
    });
    vi.restoreAllMocks();
  });

  it("should send chat request with correct URL and headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse("Hello"));
    vi.stubGlobal("fetch", mockFetch);

    await client.chat("llama-3.3-70b", [{ role: "user", content: "test" }]);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.venice.ai/api/v1/chat/completions");
    expect(opts.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      })
    );
  });

  it("should parse response choices correctly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse("Test reply")));

    const response = await client.chat("llama-3.3-70b", [
      { role: "user", content: "hello" },
    ]);

    expect(response.choices).toHaveLength(1);
    expect(response.choices[0].message.content).toBe("Test reply");
    expect(response.choices[0].finish_reason).toBe("stop");
  });

  it("should include venice-specific params when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse("ok"));
    vi.stubGlobal("fetch", mockFetch);

    await client.chat("llama-3.3-70b", [{ role: "user", content: "test" }], {
      enable_web_search: false,
      include_venice_system_prompt: false,
    });

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body.enable_web_search).toBe(false);
    expect(body.include_venice_system_prompt).toBe(false);
  });

  it("should throw on non-OK response", async () => {
    const errorResponse = {
      ok: false,
      status: 401,
      headers: new Headers(),
      text: () => Promise.resolve("Unauthorized"),
    } as unknown as Response;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse));

    await expect(
      client.chat("llama-3.3-70b", [{ role: "user", content: "test" }])
    ).rejects.toThrow("Venice API error 401: Unauthorized");
  });

  it("should use privateQuery with system prompt and disabled web search", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse("analysis result"));
    vi.stubGlobal("fetch", mockFetch);

    const response = await client.privateQuery("Analyze my portfolio");

    expect(response.choices[0].message.content).toBe("analysis result");

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body.enable_web_search).toBe(false);
    expect(body.include_venice_system_prompt).toBe(false);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
  });

  it("should capture response headers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createMockResponse("test")));

    const response = await client.chat("llama-3.3-70b", [
      { role: "user", content: "test" },
    ]);

    expect(response.headers).toBeDefined();
    expect(response.headers!["content-type"]).toBe("application/json");
  });

  it("should default to llama-3.3-70b in privateQuery", async () => {
    const mockFetch = vi.fn().mockResolvedValue(createMockResponse("ok"));
    vi.stubGlobal("fetch", mockFetch);

    await client.privateQuery("test");

    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    );
    expect(body.model).toBe("llama-3.3-70b");
  });
});
