The following is a description of the current scene in a compact format. (posX, posY, scaleX, scaleY). All child positions and scale are relative to parent. 

world:
- TileActionManager (Empty) (-1.7, 0.04, 1, 1)
  - src/tiles/action-manager.ts
- Tilemap (Tilemap) (0, 0, 1, 1)
- RoomOffset (Empty) (-29.35, -62.59, 1, 1)
- PortalManager (Empty) (0, 0, 1, 1)
  - src/mechanics/portal-manager.ts
- Portals (Empty) (0, 0, 1, 1)
  - Level1 (Empty) (-29.58, -62.64, 1, 1)
    - src/mechanics/pushable-block-manager.ts
    - LevelStart (Empty) (4.68, -7.56, 1, 1)
    - Win (Empty) (12.47, -3.66, 1, 1)
      - src/tiles/dialogue.ts
      - src/tiles/teleport.ts
      - ColoredSquare (ColoredSquare) (0, 0, 1, 1)
  - Level2 (Empty) (-8.69, -62.14, 1, 1)
    - src/mechanics/pushable-block-manager.ts
    - Win (Empty) (10.11, -4.45, 1, 1)
      - src/tiles/dialogue.ts
      - ColoredSquare (ColoredSquare) (0, 0, 1, 1)
    - LevelStart (Empty) (3.15, -4.28, 1, 1)
- MetricsUI (UILayer) (-1.56, -6.68, 1, 1)
  - src/ui/player-metrics.tsx
- GameMenu (UILayer) (-12.29, -74.01, 1, 1)
  - src/ui/game-selection.tsx

local:
- Camera (Camera) (0, 0, 1, 1)
  - src/camera/pan-zoom.ts

server:
- PlayerSpawner (Empty) (0, 0, 1, 1)
  - src/player/spawner.ts

prefabs:
- DialogueText (UIPanel) (0, 0, 1, 1)
  - src/ui/dialogue-text.tsx
- Player (Empty) (-23.41, -70.23, 1, 1)
  - src/player/movement.ts
  - src/camera/follow.ts
  - src/player/inventory.ts
  - src/player/metrics.ts
  - src/mechanics/portal-placement.ts
  - ColoredSquare (ColoredSquare) (0, 0, 1, 1)
  - LightOverlay (RawPixi) (0, 0, 1, 1)
    - src/effects/light-overlay.ts
  - Name (RichText) (0, 0, 1, 1)
- GoldPile (Empty) (3.82, -2, 1, 1)
  - src/collectibles/gold.ts
  - Gold.1 (ColoredSquare) (-0.16, 0.19, 0.3, 0.32)
  - Gold.2 (ColoredSquare) (0.24, -0.26, 0.31, 0.32)
  - Gold.3 (ColoredSquare) (-0.21, -0.26, 0.31, 0.32)
- BlueKey (Empty) (4.5, -5.65, 1, 1)
  - src/collectibles/key.ts
  - src/tiles/dialogue.ts
  - Key (ColoredPolygon) (-0.21, 0, 1, 1)
  - Key.1 (ColoredSquare) (0.1, 0, 0.5, 0.1)
  - Key.2 (ColoredSquare) (0.26, -0.05, 0.2, 0.07)
  - Key.3 (ColoredSquare) (0.08, -0.05, 0.1, 0.07)
- GreenKey (Empty) (-2.39, -2.76, 1, 1)
  - src/collectibles/key.ts
  - src/tiles/dialogue.ts
  - Key (ColoredPolygon) (-0.21, 0, 1, 1)
  - Key.1 (ColoredSquare) (0.1, 0, 0.5, 0.1)
  - Key.2 (ColoredSquare) (0.26, -0.05, 0.2, 0.07)
  - Key.3 (ColoredSquare) (0.08, -0.05, 0.1, 0.07)
- Enemy (Empty) (0.21, -3, 1, 1)
  - src/enemies/movement.ts
  - ColoredSquare (ColoredSquare) (0, 0, 1, 1)
- BombPickup (Empty) (2, 1, 1, 1)
  - src/collectibles/bomb.ts
  - src/tiles/dialogue.ts
  - ColoredPolygon (ColoredPolygon) (0, -0.1, 0.5, 0.5)
  - ColoredSquare (ColoredSquare) (0, 0.1, 0.2, 0.2)
  - ColoredSquare.1 (ColoredSquare) (0.02, 0.21, 0.03, 0.15)
- BombPlaced (Empty) (1, 1, 1, 1)
  - src/mechanics/placed-bomb.ts
  - ColoredPolygon (ColoredPolygon) (0, -0.1, 0.5, 0.5)
  - ColoredSquare (ColoredSquare) (0, 0.1, 0.2, 0.2)
  - ColoredSquare.1 (ColoredSquare) (0.02, 0.21, 0.03, 0.15)
- ParticleContainer (RawPixi) (2.63, -73.3, 1, 1)
  - src/effects/particle.ts
