import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "LevelSelect",
  description:
    "Teleports a player to a specific level. Use this to navigate between normal levels or sokoban puzzle levels.",
  input_schema: {
    type: "object",
    properties: {
      gametype: {
        type: "string",
        enum: ["normal", "sokoban"],
        description:
          "The type of game level - either 'normal' for standard levels or 'sokoban' for puzzle levels",
      },
      level_number: {
        type: "integer",
        minimum: 1,
        description: "The level number to teleport to (must be positive)",
      },
      ref: {
        type: "string",
        description: "The player ref to teleport",
      },
    },
    required: ["gametype", "level_number", "ref"],
  },
};

export const toolHandler: ToolHandler = async (input) => {
  const gametype = input.gametype as string;
  const levelNumber = input.level_number as number;
  const ref = input.ref as string;

  if (!gametype || !levelNumber || !ref) {
    return JSON.stringify({
      error: "Missing required parameters: gametype, level_number, or ref",
    });
  }

  const data = await callGameAPI("level-select", [gametype, levelNumber, ref]);

  if (!data.result) {
    return JSON.stringify({
      error: data.error || "Unknown error - no result in response",
    });
  }

  const result = (data.result as { ok?: boolean; error?: string }) || {};

  if (result.ok) {
    return JSON.stringify({
      success: true,
      message: `Player teleported to ${gametype} level ${levelNumber}`,
    });
  } else {
    return JSON.stringify({
      success: false,
      error: result.error || "Unknown error",
    });
  }
};
