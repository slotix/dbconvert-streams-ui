import { ref } from 'vue'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY
} from 'd3-force'
import type {
  ForceCenter,
  ForceCollide,
  ForceLink,
  ForceManyBody,
  ForceX,
  ForceY,
  Simulation
} from 'd3-force'
import type { TableNode, TableLink } from '@/types/diagram'

export interface DiagramForceOptions {
  linkDistance?: number
  chargeStrength?: number
  collisionRadius?: number
}

export function useDiagramForces(options: DiagramForceOptions = {}) {
  const linkDistance = ref(options.linkDistance ?? 180)
  const chargeStrength = ref(options.chargeStrength ?? -600)
  const collisionRadius = ref(options.collisionRadius ?? 150)

  let simulation: Simulation<TableNode, TableLink> | null = null

  function setCenter(width: number, height: number) {
    if (!simulation) return

    const centerForce = simulation.force('center') as ForceCenter<TableNode> | undefined
    centerForce?.x(width / 2).y(height / 2)

    const xForce = simulation.force('x') as ForceX<TableNode> | undefined
    xForce?.x(width / 2)

    const yForce = simulation.force('y') as ForceY<TableNode> | undefined
    yForce?.y(height / 2)
  }

  /**
   * Initialize the force simulation
   */
  function initializeSimulation(width: number, height: number): Simulation<TableNode, TableLink> {
    simulation = forceSimulation<TableNode, TableLink>()
      .force(
        'link',
        forceLink<TableNode, TableLink>()
          .id((d: TableNode) => d.id)
          .distance(linkDistance.value)
          .strength(0.8)
      )
      .force('charge', forceManyBody<TableNode>().strength(chargeStrength.value))
      .force('center', forceCenter<TableNode>(width / 2, height / 2))
      .force('collision', forceCollide<TableNode>().radius(collisionRadius.value))
      .force('x', forceX<TableNode>(width / 2).strength(0.05))
      .force('y', forceY<TableNode>(height / 2).strength(0.05))
      .velocityDecay(0.6)
      .alphaMin(0.002)
      .alphaDecay(0.03)

    return simulation
  }

  /**
   * Update force parameters on existing simulation
   */
  function updateForces() {
    if (!simulation) return

    const linkForce = simulation.force('link') as ForceLink<TableNode, TableLink> | undefined
    if (linkForce) {
      linkForce.distance(linkDistance.value)
    }

    const chargeForce = simulation.force('charge') as ForceManyBody<TableNode> | undefined
    if (chargeForce) {
      chargeForce.strength(chargeStrength.value)
    }

    const collisionForce = simulation.force('collision') as ForceCollide<TableNode> | undefined
    if (collisionForce) {
      collisionForce.radius(collisionRadius.value)
    }

    simulation.alpha(0.3).restart()
  }

  /**
   * Stop the simulation
   */
  function stopSimulation() {
    simulation?.stop()
  }

  /**
   * Restart the simulation with specified alpha
   */
  function restartSimulation(alpha: number = 0.3) {
    simulation?.alpha(alpha).restart()
  }

  return {
    // State (reactive)
    linkDistance,
    chargeStrength,
    collisionRadius,

    // Methods
    initializeSimulation,
    setCenter,
    updateForces,
    stopSimulation,
    restartSimulation,

    // Access to simulation if needed
    getSimulation: () => simulation
  }
}
