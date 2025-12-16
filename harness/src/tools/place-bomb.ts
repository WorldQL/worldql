import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "PlaceBomb",
  description:
    "Places a bomb at the player's current location. The bomb will explode after a delay, destroying bombable walls (X) and potentially harming enemies.",
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
    return JSON.stringify({ error: "Missing required parameter: ref" });
  }

  const data = await callGameAPI("place-bomb", [ref]);

  const result = (data.result as { ok?: boolean; error?: string }) || {};

  if (result.ok) {
    return JSON.stringify({
      success: true,
      message: "Bomb placed successfully at player location",
    });
  } else {
    return JSON.stringify({
      success: false,
      error: result.error || "Unknown error",
    });
  }
};
