import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "PlacePortal",
  description:
    "Places a blue or orange portal at the specified tile coordinates. The portal must be placed on a wall tile that is within the player's line of sight. Only one portal of each color can exist at a time - placing a new portal removes the old one of the same color.",
  input_schema: {
    type: "object",
    properties: {
      ref: {
        type: "string",
        description: "The player ref.",
      },
      color: {
        type: "string",
        enum: ["blue", "orange"],
        description: "The color of the portal to place (blue or orange).",
      },
      x: {
        type: "number",
        description: "The x coordinate of the target tile.",
      },
      y: {
        type: "number",
        description: "The y coordinate of the target tile.",
      },
    },
    required: ["ref", "color", "x", "y"],
  },
};

export const toolHandler: ToolHandler = async (input) => {
  const ref = input.ref as string;
  const color = input.color as string;
  const x = input.x as number;
  const y = input.y as number;

  const data = await callGameAPI("place-portal", [
    ref,
    color,
    { x: Math.floor(x), y: Math.floor(y) },
  ]);

  if (!data.result) {
    return JSON.stringify({
      error: data.error || "Unknown error - no result in response",
    });
  }

  const result = data.result as { ok?: boolean; error?: string };
  if (result.ok) {
    return JSON.stringify({
      success: true,
      message: `${color.charAt(0).toUpperCase() + color.slice(1)} portal placed at (${x}, ${y})`,
    });
  } else {
    return JSON.stringify({
      success: false,
      error: result.error || "Unknown error",
    });
  }
};
