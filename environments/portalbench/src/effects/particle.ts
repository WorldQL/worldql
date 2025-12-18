import { Behavior, ColorAdapter, RawPixi, syncedValue } from "@dreamlab/engine";
import * as PIXI from "@dreamlab/vendor/pixi.ts";

// example particle implementation
export default class ParticleRender extends Behavior {
  @syncedValue()
  particleCount = 40;

  @syncedValue()
  ringRadius = 0.4;

  @syncedValue()
  swirSpeed = 0.15;

  @syncedValue()
  minSize = 0.08;

  @syncedValue()
  maxSize = 0.12;

  @syncedValue(ColorAdapter)
  particleColor = "#ffffff";

  private particles: Array<{
    sprite: PIXI.Graphics;
    angle: number;
    angularVelocity: number;
    radius: number;
    radiusVelocity: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
    lifespan: number;
    maxLifespan: number;
  }> = [];

  @syncedValue()
  burstOriginX = 0;

  @syncedValue()
  burstOriginY = 0;

  private container: PIXI.Container | null = null;

  onInitialize(): void {
    if (!this.game.isClient()) return;
    if (!(this.entity instanceof RawPixi)) return;
    if (!this.entity.container) return;

    this.container = this.entity.container;

    // Create the particles but don't add them to the container yet
    this.prepareParticles();

    // Add a small delay before adding particles to the container
    // This ensures they're properly positioned before becoming visible
    setTimeout(() => {
      this.addParticlesToContainer();
    }, 0);

    // Destroy the entity after portal effect completes
    setTimeout(() => {
      this.entity.destroy();
    }, 700);
  }

  onTick(): void {
    if (!this.game.isClient() || !this.container) return;

    const deltaTime = this.game.physics.tickDelta / 16;

    // Update each particle in the swirling ring
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update angle for swirling motion
      particle.angle += particle.angularVelocity * deltaTime;

      // Update radius (particles expand outward)
      particle.radius += particle.radiusVelocity * deltaTime;

      // Calculate position based on angle and radius
      particle.x =
        this.burstOriginX + Math.cos(particle.angle) * particle.radius;
      particle.y =
        this.burstOriginY + Math.sin(particle.angle) * particle.radius;

      // Rotate individual particles for extra effect
      particle.rotation += particle.rotationSpeed * deltaTime;
      particle.sprite.rotation = particle.rotation;

      // Update sprite position
      particle.sprite.position.x = particle.x;
      particle.sprite.position.y = particle.y;

      // Decrease lifespan
      particle.lifespan -= deltaTime;

      // Calculate progress (0 to 1)
      const progress = 1 - particle.lifespan / particle.maxLifespan;

      // Fade in quickly, then fade out
      if (progress < 0.2) {
        particle.sprite.alpha = progress / 0.2;
      } else {
        particle.sprite.alpha = Math.max(0, 1 - (progress - 0.2) / 0.8);
      }

      // Scale particles for extra visual effect
      const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
      particle.sprite.scale.set(scale);

      // Remove particles that have lived their life
      if (particle.lifespan <= 0) {
        this.container.removeChild(particle.sprite);
        this.particles.splice(i, 1);
      }
    }
  }

  prepareParticles(): void {
    if (!this.container) return;

    // Clear any existing particles
    for (const particle of this.particles) {
      if (particle.sprite.parent) {
        particle.sprite.parent.removeChild(particle.sprite);
      }
    }
    this.particles = [];

    const maxLifespan = 30; // Half second at 60fps

    // Create particles arranged in a ring
    for (let i = 0; i < this.particleCount; i++) {
      const g = new PIXI.Graphics();
      const size = this.minSize + Math.random() * (this.maxSize - this.minSize);

      // Create circular particles for a smoother portal effect
      g.circle(0, 0, size / 2);

      // Choose color - use the selected color unless multiple colors enabled
      const color = this.particleColor;

      g.fill({ color });

      // Distribute particles evenly around the ring with some randomness
      const baseAngle = (i / this.particleCount) * Math.PI * 2;
      const angleVariation = (Math.random() - 0.5) * 0.3;
      const angle = baseAngle + angleVariation;

      // Start at a smaller radius and expand outward
      const startRadius = this.ringRadius * (0.3 + Math.random() * 0.2);
      const radiusVelocity = 0.015 + Math.random() * 0.01;

      // Angular velocity for swirling (some particles go faster)
      const angularVelocity = this.swirSpeed * (0.8 + Math.random() * 0.4);

      // Initial position
      const x = this.burstOriginX + Math.cos(angle) * startRadius;
      const y = this.burstOriginY + Math.sin(angle) * startRadius;

      g.position.set(x, y);

      // Random initial rotation
      const rotation = Math.random() * Math.PI * 2;
      g.rotation = rotation;

      // Add some stagger to the lifespan for a more organic look
      const lifespanVariation = (Math.random() - 0.5) * 8;
      const lifespan = maxLifespan + lifespanVariation;

      // Store particle data with properties for swirling ring behavior
      this.particles.push({
        sprite: g,
        angle: angle,
        angularVelocity: angularVelocity,
        radius: startRadius,
        radiusVelocity: radiusVelocity,
        x: x,
        y: y,
        size: size,
        rotation: rotation,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        lifespan: lifespan,
        maxLifespan: lifespan,
      });
    }
  }

  addParticlesToContainer(): void {
    if (!this.container) return;

    // Add all prepared particles to the container
    for (const particle of this.particles) {
      this.container.addChild(particle.sprite);
    }
  }
}
