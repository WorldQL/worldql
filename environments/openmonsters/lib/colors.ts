export const enum Colors {
  Wall = 0x3a3a3a, // Dark stone wall
  Sand = 0x8b8680, // Stone floor (light)
  Water = 0x1a1a1a, // Dark abyss/pit
  Grass = 0x5a5550, // Floor tiles (medium)
  GreenDoor = 0x22cc22, // Green door (locked)
  BlueDoor = 0x2255cc, // Blue door (locked)
  Slowdown = 0x6b4423, // Mud/tar slowdown tile
  BombWall = 0x4d4d4d, // Bombable wall
  GlassWall = 0x8f8e8e, // Glass wall - blocks movement but not line of sight
  PushableBlock = 0xe3288f,
  BlockGoal = 0xffaa00, // Goal position for pushable blocks
  BlockOnGoal = 0x88ff00, // Block successfully placed on goal
  BluePortal = 0x00aaff, // Blue portal
  OrangePortal = 0xff7700, // Orange portal
}
