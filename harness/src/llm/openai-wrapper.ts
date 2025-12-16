import OpenAI from "openai";
import type { Message, Tool, MessageContent, ToolUseContent } from "./types.ts";
import { LLMWrapper } from "./wrapper.ts";

/**
 * OpenAI-compatible API wrapper.
 * By default, it connects to OpenRouter which provides access to many models.
 */
export class OpenAIWrapper extends LLMWrapper {
  private client: OpenAI;
  private model: string;
  private _finalMessage: Message | null = null;

  constructor(
    apiKey: string,
    model: string = "gpt-4o",
    baseURL: string = "https://openrouter.ai/api/v1"
  ) {
    super();
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  /**
   * Convert our Anthropic-style messages to OpenAI format.
   */
  private _convertMessagesToOpenAI(
    messages: Message[]
  ): Array<Record<string, unknown>> {
    const openaiMessages: Array<Record<string, unknown>> = [];

    for (const msg of messages) {
      if (typeof msg.content === "string") {
        // Simple text message
        const openaiMsg: Record<string, unknown> = {
          role: msg.role,
          content: msg.content,
        };
        if (msg.reasoning_details) {
          openaiMsg.reasoning_details = msg.reasoning_details;
        }
        openaiMessages.push(openaiMsg);
      } else {
        // Complex message with content blocks
        const openaiContent: Array<Record<string, unknown>> = [];
        const toolCalls: Array<Record<string, unknown>> = [];

        for (const contentBlock of msg.content) {
          if (contentBlock.type === "text") {
            openaiContent.push({
              type: "text",
              text: contentBlock.text,
            });
          } else if (contentBlock.type === "tool_use") {
            // Convert to OpenAI tool_calls format
            const args =
              typeof contentBlock.input === "object"
                ? JSON.stringify(contentBlock.input)
                : contentBlock.input;
            toolCalls.push({
              id: contentBlock.id,
              type: "function",
              function: {
                name: contentBlock.name,
                arguments: args,
              },
            });
          } else if (contentBlock.type === "tool_result") {
            // Convert to separate tool role message
            openaiMessages.push({
              role: "tool",
              tool_call_id: contentBlock.tool_use_id,
              content: contentBlock.content,
            });
          }
        }

        // Add assistant message with tool calls
        if (toolCalls.length > 0) {
          const assistantMsg: Record<string, unknown> = {
            role: "assistant",
            tool_calls: toolCalls,
          };
          if (msg.reasoning_details) {
            assistantMsg.reasoning_details = msg.reasoning_details;
          }
          openaiMessages.push(assistantMsg);
        } else if (openaiContent.length > 0) {
          // Text content only
          const combinedText =
            openaiContent.length === 1
              ? (openaiContent[0].text as string)
              : openaiContent.map((block) => block.text).join("\n");
          const assistantMsg: Record<string, unknown> = {
            role: msg.role,
            content: combinedText,
          };
          if (msg.reasoning_details) {
            assistantMsg.reasoning_details = msg.reasoning_details;
          }
          openaiMessages.push(assistantMsg);
        }
      }
    }

    return openaiMessages;
  }

  /**
   * Convert our tool format to OpenAI's format.
   */
  private _convertToolsToOpenAI(
    tools: Tool[] | undefined
  ): Array<Record<string, unknown>> | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: tool.input_schema || {},
      },
    }));
  }

  /**
   * Stream text responses from OpenAI's API.
   */
  async *streamMessages(
    messages: Message[],
    options: {
      maxTokens: number;
      temperature?: number;
      tools?: Tool[];
    }
  ): AsyncGenerator<string, void, unknown> {
    const openaiMessages = this._convertMessagesToOpenAI(messages);
    const openaiTools = this._convertToolsToOpenAI(options.tools);

    const streamKwargs: Record<string, unknown> = {
      model: this.model,
      max_tokens: options.maxTokens,
      temperature: options.temperature ?? 1.0,
      messages: openaiMessages,
      stream: true,
    };

    if (openaiTools) {
      streamKwargs.tools = openaiTools;
      // Disable parallel tool calls - some models handle them poorly
      streamKwargs.parallel_tool_calls = false;
    }

    // Enable reasoning tokens for models that support it (OpenRouter-specific)
    if (this.client.baseURL?.includes("openrouter.ai")) {
      streamKwargs.extra_body = { include_reasoning: true };
    }

    const stream = await this.client.chat.completions.create(
      streamKwargs as OpenAI.ChatCompletionCreateParamsStreaming
    );

    const accumulatedContent: string[] = [];
    const accumulatedReasoning: string[] = [];
    const accumulatedToolCalls: Record<
      number,
      { id: string; name: string; arguments: string }
    > = {};
    const accumulatedReasoningDetails: Array<Record<string, unknown>> = [];
    let role: string | null = null;

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const delta = chunk.choices[0].delta;

        if (delta.role) {
          role = delta.role;
        }

        // Handle reasoning/thinking tokens (OpenRouter DeepSeek R1, Gemini Thinking, etc.)
        if ("reasoning" in delta && delta.reasoning) {
          accumulatedReasoning.push(delta.reasoning as string);
          yield delta.reasoning as string;
        }

        if (delta.content) {
          accumulatedContent.push(delta.content);
          yield delta.content;
        }

        if ("reasoning_details" in delta && delta.reasoning_details) {
          const details = delta.reasoning_details as Array<Record<string, unknown>>;
          for (const detail of details) {
            accumulatedReasoningDetails.push(detail);
          }
        }

        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const idx = toolCall.index ?? 0;
            if (!(idx in accumulatedToolCalls)) {
              accumulatedToolCalls[idx] = {
                id: "",
                name: "",
                arguments: "",
              };
            }

            if (toolCall.id) {
              accumulatedToolCalls[idx].id = toolCall.id;
            }
            if (toolCall.function?.name) {
              accumulatedToolCalls[idx].name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              accumulatedToolCalls[idx].arguments +=
                toolCall.function.arguments;
            }
          }
        }
      }
    }

    // Build final message in Anthropic format
    const finalContent: MessageContent[] = [];

    // Note: We don't include reasoning in the message history as it can be very verbose
    // and is typically not needed in conversation context

    if (accumulatedContent.length > 0) {
      finalContent.push({
        type: "text",
        text: accumulatedContent.join(""),
      });
    }

    if (Object.keys(accumulatedToolCalls).length > 0) {
      for (const toolCall of Object.values(accumulatedToolCalls)) {
        let parsedArgs: Record<string, unknown>;
        try {
          parsedArgs = JSON.parse(toolCall.arguments);
        } catch {
          parsedArgs = { raw: toolCall.arguments };
        }

        finalContent.push({
          type: "tool_use",
          id: toolCall.id,
          name: toolCall.name,
          input: parsedArgs,
        } as ToolUseContent);
      }
    }

    this._finalMessage = {
      role: (role as "user" | "assistant" | "tool") || "assistant",
      content: finalContent.length > 0 ? finalContent : [],
    };

    if (accumulatedReasoningDetails.length > 0) {
      this._finalMessage.reasoning_details = accumulatedReasoningDetails;
    }
  }

  /**
   * Get the final message from the current stream.
   */
  getFinalMessage(): Message {
    if (this._finalMessage === null) {
      throw new Error(
        "No final message available - stream may not have completed"
      );
    }
    return this._finalMessage;
  }
}
