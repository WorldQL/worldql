import type { Message, Tool } from "./types.ts";

/**
 * Abstract base class for LLM wrapper implementations.
 *
 * All wrappers convert provider-specific formats to/from a common message format
 * based on Anthropic's message structure (since it's the most feature-rich).
 */
export abstract class LLMWrapper {
  /**
   * Stream text responses from the LLM.
   *
   * @param messages - Conversation history in Anthropic message format
   * @param options - Configuration options for the request
   * @yields Text chunks as they arrive from the API
   */
  abstract streamMessages(
    messages: Message[],
    options: {
      maxTokens: number;
      temperature?: number;
      tools?: Tool[];
    }
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Get the final message object after streaming.
   *
   * @returns Complete message with role, content, and optional tool calls
   */
  abstract getFinalMessage(): Message;
}
