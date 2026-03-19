export type VeniceModel = "llama-3.3-70b" | "deepseek-r1-671b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface VeniceRequestParams {
  enable_web_search?: boolean;
  include_venice_system_prompt?: boolean;
}

export interface VeniceChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  headers?: Record<string, string>;
}

export interface VeniceClientOptions {
  apiKey: string;
  baseUrl: string;
}

export class VeniceClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: VeniceClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
  }

  async chat(
    model: VeniceModel,
    messages: ChatMessage[],
    params?: VeniceRequestParams
  ): Promise<VeniceChatResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const body = {
      model,
      messages,
      ...(params?.enable_web_search !== undefined && {
        enable_web_search: params.enable_web_search,
      }),
      ...(params?.include_venice_system_prompt !== undefined && {
        include_venice_system_prompt: params.include_venice_system_prompt,
      }),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Venice API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as VeniceChatResponse;

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    data.headers = headers;

    return data;
  }

  async privateQuery(
    prompt: string,
    model: VeniceModel = "llama-3.3-70b"
  ): Promise<VeniceChatResponse> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a private financial analyst. Do not log or retain any user data. Respond with structured JSON when asked for analysis.",
      },
      { role: "user", content: prompt },
    ];

    return this.chat(model, messages, {
      enable_web_search: false,
      include_venice_system_prompt: false,
    });
  }
}
