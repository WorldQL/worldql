import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "ObserveWorld",
  description: "Get the state of the world",
  input_schema: {
    type: "object",
    properties: {
      ref: { type: "string", description: "The player ref." },
    },
    required: ["ref"],
  },
};

export const toolHandler: ToolHandler = async (input) => {
  const ref = input.ref as string;

  if (!ref) {
    return "Error: Missing required parameter: ref";
  }

  const data = await callGameAPI("vision", [ref]);

  if (!data.result) {
    return `Error: ${data.error || "Unknown error - no result in response"}`;
  }

  return `Result: ${JSON.stringify(data.result)}`;
};
