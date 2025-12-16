// Type definitions for LLM messages, tools, and content blocks

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

export type MessageContent = TextContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: "user" | "assistant" | "tool";
  content: string | MessageContent[];
  reasoning_details?: Array<Record<string, unknown>>;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<string>;
