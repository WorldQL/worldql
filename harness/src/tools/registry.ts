import type { Tool, ToolHandler } from "../llm/types.ts";

// Import active tools
import {
  toolDefinition as playerSpawnDef,
  toolHandler as playerSpawnHandler,
} from "./player-spawn.ts";
import {
  toolDefinition as playerMoveDef,
  toolHandler as playerMoveHandler,
} from "./player-move.ts";
import {
  toolDefinition as playerSeeDef,
  toolHandler as playerSeeHandler,
} from "./player-see.ts";

// Import inactive tools (not registered by default)
import {
  toolDefinition as placeBombDef,
  toolHandler as placeBombHandler,
} from "./place-bomb.ts";
import {
  toolDefinition as deletePlayerDef,
  toolHandler as deletePlayerHandler,
} from "./delete-player.ts";
import {
  toolDefinition as levelSelectDef,
  toolHandler as levelSelectHandler,
} from "./level-select.ts";
import {
  toolDefinition as restartLevelDef,
  toolHandler as restartLevelHandler,
} from "./restart-level.ts";
import {
  toolDefinition as placePortalDef,
  toolHandler as placePortalHandler,
} from "./place-portal.ts";
import {
  toolDefinition as getPortalsDef,
  toolHandler as getPortalsHandler,
} from "./get-portals.ts";

/**
 * Active tools that are registered with the LLM.
 * These are the tools the LLM can use by default.
 */
export const ACTIVE_TOOLS: Tool[] = [
  playerMoveDef,
  playerSpawnDef,
  playerSeeDef,
];

/**
 * Tool registry mapping tool names to their handler functions.
 * Only includes active tools.
 */
export const TOOL_REGISTRY: Record<string, ToolHandler> = {
  SpawnPlayer: playerSpawnHandler,
  MovePlayer: playerMoveHandler,
  ObserveWorld: playerSeeHandler,
};

/**
 * All available tools (active and inactive).
 * Inactive tools can be enabled by adding them to ACTIVE_TOOLS and TOOL_REGISTRY.
 */
export const ALL_TOOLS: Tool[] = [
  ...ACTIVE_TOOLS,
  placePortalDef,
  getPortalsDef,
  placeBombDef,
  deletePlayerDef,
  levelSelectDef,
  restartLevelDef,
];

/**
 * All tool handlers (active and inactive).
 * To activate an inactive tool, add its entry to TOOL_REGISTRY.
 */
export const ALL_TOOL_HANDLERS: Record<string, ToolHandler> = {
  ...TOOL_REGISTRY,
  PlacePortal: placePortalHandler,
  GetPortals: getPortalsHandler,
  PlaceBomb: placeBombHandler,
  DeletePlayer: deletePlayerHandler,
  LevelSelect: levelSelectHandler,
  RestartLevel: restartLevelHandler,
};
