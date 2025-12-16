import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "RestartLevel",
  description:
    "Restarts the level, resetting all blocks to their initial positions. Does NOT delete the player - call DeletePlayer first, then this, then SpawnPlayer!",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const toolHandler: ToolHandler = async (_input) => {
  const data = await callGameAPI("restart-level", []);

  const result = (data.result as { ok?: boolean; error?: string }) || {};

  if (result.ok) {
    return JSON.stringify({
      success: true,
      message: "Level restarted successfully",
    });
  } else {
    return JSON.stringify({
      success: false,
      error: result.error || "Unknown error",
    });
  }
};
