import { IVector2, Vector2 } from "@dreamlab/engine";

/**
 * Converts level coordinates to world coordinates.
 * @param level - Level position (from vision API grid)
 * @param worldOrigin - The world position of the vision origin (top-left of visible area)
 * @returns World position
 */
export function levelToWorld(level: IVector2, worldOrigin: IVector2): Vector2 {
  return new Vector2(worldOrigin.x + level.x, worldOrigin.y - level.y);
}

/**
 * Converts world coordinates to level coordinates.
 * @param world - World position
 * @param worldOrigin - The world position of the vision origin (top-left of visible area)
 * @returns Level position (for vision API grid)
 */
export function worldToLevel(world: IVector2, worldOrigin: IVector2): Vector2 {
  return new Vector2(world.x - worldOrigin.x, worldOrigin.y - world.y);
}
