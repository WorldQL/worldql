import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "DeletePlayer",
  description:
    "Deletes a player from the game. Use this before restarting a level to clean up the old player instance.",
  input_schema: {
    type: "object",
    properties: {
      ref: { type: "string", description: "The player ref to delete." },
    },
    required: ["ref"],
  },
};

export const toolHandler: ToolHandler = async (input) => {
  const ref = input.ref as string;

  if (!ref) {
    return JSON.stringify({ error: "Missing required parameter: ref" });
  }

  const data = await callGameAPI("delete-player", [ref]);

  if (!data.result) {
    return JSON.stringify({
      error: data.error || "Unknown error - no result in response",
    });
  }

  const result = (data.result as { ok?: boolean; error?: string }) || {};

  if (result.ok) {
    return JSON.stringify({
      success: true,
      message: "Player deleted successfully",
    });
  } else {
    return JSON.stringify({
      success: false,
      error: result.error || "Unknown error",
    });
  }
};
