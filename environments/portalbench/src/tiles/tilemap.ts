import { Behavior, Rng, Tilemap, value, Vector2, Vector2Adapter } from "@dreamlab/engine";
import { Colors } from "../../lib/colors.ts";

export default class GenerateTilemap extends Behavior {
  #tilemap = this.entity.cast(Tilemap);

  @value()
  seed: number = 0;

  @value({ type: Vector2Adapter })
  halfExtents: Vector2 = new Vector2(50, 50);

  @value({ type: Vector2Adapter })
  safeZone: Vector2 = new Vector2(1, 1);

  onInitialize(): void {
    const prng = Rng.Seeded(BigInt(this.seed));

    // Create concentric maze rooms around spawn
    // Room 1 (inner): 6x6 square around spawn
    // Room 2 (middle): 24x24 square
    // Room 3 (outer): 40x40 square

    const room1Size = 6;
    const room2Size = 24;
    const room3Size = 40;

    // Fill everything with floor first
    for (let x = -this.halfExtents.x; x < this.halfExtents.x; x++) {
      for (let y = -this.halfExtents.y; y < this.halfExtents.y; y++) {
        this.#tilemap.setColor(x, y, Colors.Grass);
      }
    }

    // Helper function to create a square room with walls
    const createRoom = (
      size: number,
      greenDoorPos: { x: number; y: number },
      blueDoorPos: { x: number; y: number },
    ) => {
      const half = Math.floor(size / 2);

      // Create walls around the room
      for (let i = -half; i <= half; i++) {
        // Top and bottom walls
        this.#tilemap.setColor(i, -half, Colors.Wall);
        this.#tilemap.setColor(i, half, Colors.Wall);

        // Left and right walls
        this.#tilemap.setColor(-half, i, Colors.Wall);
        this.#tilemap.setColor(half, i, Colors.Wall);
      }

      // Place doors
      this.#tilemap.setColor(greenDoorPos.x, greenDoorPos.y, Colors.GreenDoor);
      this.#tilemap.setColor(blueDoorPos.x, blueDoorPos.y, Colors.BlueDoor);
    };

    // Room 3 (outermost)
    createRoom(room3Size, { x: 0, y: -room3Size / 2 }, { x: room3Size / 2, y: 0 });

    // Room 2 (middle)
    createRoom(room2Size, { x: 0, y: room2Size / 2 }, { x: -room2Size / 2, y: 0 });

    // Room 1 (innermost)
    createRoom(room1Size, { x: room1Size / 2, y: 0 }, { x: 0, y: room1Size / 2 });

    // Add obstacles to each room
    const addObstacles = (minRadius: number, maxRadius: number, count: number) => {
      let placed = 0;
      let attempts = 0;
      const maxAttempts = count * 10; // Avoid infinite loops

      while (placed < count && attempts < maxAttempts) {
        attempts++;
        const angle = prng() * Math.PI * 2;
        const radius = minRadius + prng() * (maxRadius - minRadius);
        const x = Math.floor(Math.cos(angle) * radius);
        const y = Math.floor(Math.sin(angle) * radius);

        // Check if current position is valid for obstacle placement
        const currentTile = this.#tilemap.getColor(x, y);

        // Only place on grass/floor tiles (not walls, doors, or safe zone)
        if (
          currentTile === Colors.Grass
          && (Math.abs(x) > this.safeZone.x || Math.abs(y) > this.safeZone.y)
        ) {
          // Randomly place walls or slowdown tiles
          if (prng() > 0.6) {
            this.#tilemap.setColor(x, y, Colors.Wall);
          } else {
            this.#tilemap.setColor(x, y, Colors.Slowdown);
          }
          placed++;
        }
      }
    };

    // // Add obstacles to room 1 (inner ring between room 1 and 2 walls)
    // addObstacles(room1Size / 2 + 1, room2Size / 2 - 1, 12);

    // // Add obstacles to room 2 (middle ring between room 2 and 3 walls)
    // addObstacles(room2Size / 2 + 1, room3Size / 2 - 1, 40);

    // // Add obstacles to room 3 (outer ring beyond room 3 wall)
    // addObstacles(room3Size / 2 + 1, Math.min(this.halfExtents.x, this.halfExtents.y) - 1, 60);

    // Clear the spawn safe zone
    for (let x = -this.safeZone.x; x <= this.safeZone.x; x++) {
      for (let y = -this.safeZone.y; y <= this.safeZone.y; y++) {
        this.#tilemap.setColor(x, y, Colors.Sand);
      }
    }
  }
}
