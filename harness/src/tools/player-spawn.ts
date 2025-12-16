import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "SpawnPlayer",
  description: "Spawns a player. Returns a ref to future use.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const toolHandler: ToolHandler = async (_input) => {
  const data = await callGameAPI("spawn-player", []);

  if (data.result && typeof data.result === "object" && "ref" in data.result) {
    return `Player ref: ${(data.result as { ref: string }).ref}`;
  }

  return `Error: ${data.error || "Unknown error"}`;
};
