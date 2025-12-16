import type { Tool, ToolHandler } from "../llm/types.ts";
import { callGameAPI } from "./http-client.ts";

export const toolDefinition: Tool = {
  name: "GetPortals",
  description:
    "Gets the current status of all portals in the world. Returns the positions of blue and orange portals if they exist, or null if they don't exist.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const toolHandler: ToolHandler = async (_input) => {
  const data = await callGameAPI("get-portals", []);

  if (!data.result) {
    return JSON.stringify({
      error: data.error || "Unknown error - no result in response",
    });
  }

  const result = data.result as {
    ok?: boolean;
    portals?: {
      bluePortal?: { x: number; y: number };
      orangePortal?: { x: number; y: number };
    };
    error?: string;
  };

  if (result.ok) {
    const portals = result.portals || {};
    const blue = portals.bluePortal;
    const orange = portals.orangePortal;

    const status = {
      blue_portal: blue ? `at (${blue.x}, ${blue.y})` : "not placed",
      orange_portal: orange ? `at (${orange.x}, ${orange.y})` : "not placed",
    };

    return JSON.stringify(status);
  } else {
    return JSON.stringify({ error: result.error || "Unknown error" });
  }
};
