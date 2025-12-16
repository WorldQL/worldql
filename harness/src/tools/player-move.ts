import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "MovePlayer",
  description:
    "Moves player in multiple directions. Each move's x and y can only be +1 or -1. Executes moves sequentially and returns all results.",
  input_schema: {
    type: "object",
    properties: {
      ref: { type: "string", description: "The player ref." },
      moves: {
        type: "array",
        description:
          "Array of moves to execute in sequence. Each x or y value can only be 1, -1, or 0. +y is down, +x is right. Diagonal moves supported.",
        items: {
          type: "object",
          properties: {
            x: { type: "number", description: "x coordinate to move" },
            y: { type: "number", description: "y coordinate to move" },
          },
          required: ["x", "y"],
        },
      },
    },
    required: ["ref", "moves"],
  },
};

export const toolHandler: ToolHandler = async (input) => {
  const ref = input.ref as string;
  const moves = input.moves as Array<{ x: number; y: number }>;

  if (!ref || !moves) {
    return JSON.stringify({ error: "Missing required parameters: ref or moves" });
  }

  const results: unknown[] = [];

  for (const move of moves) {
    const x = move.x;
    const y = move.y;

    // It absolutely breaks its brain to have -y be down so we just flip the sign
    const data = await callGameAPI("move-player", [
      ref,
      { x: x, y: y * -1 },
    ]);

    if (!data.result) {
      return JSON.stringify({
        error: data.error || "Unknown error - no result in response",
      });
    }

    results.push(data.result);
  }

  return JSON.stringify({
    moves_executed: results.length,
    results: results,
  });
};
