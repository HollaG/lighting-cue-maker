/**
 * The shader side of the light table: one loop over the table's lights, used by every lit material and by the haze
 * volume. See LightTable.ts for the data, ShadowLayers.ts for the shadows.
 *
 * Per pixel, per light: reject by reach, then by cone (one dot product each). Only a light that passes reads its
 * colour and its shadow. Most lights fail for most pixels.
 */
import { Lighting, LightingNode, LightsNode, type NodeBuilder } from "three/webgpu";
import {
  If,
  Loop,
  cameraViewMatrix,
  float,
  getDistanceAttenuation,
  int,
  ivec2,
  mat4,
  positionWorld,
  renderGroup,
  smoothstep,
  texture,
  textureLoad,
  transformDirection,
  uniform,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import type { Light } from "three";
import { LightTable } from "./LightTable";

/**
 * What three's lighting models read from the light they are given. The haze model only scatters lights that say they
 * are analytic and have a reach; the shadow is already multiplied into the colour, so there is no shadow node.
 */
const TABLE_LIGHT_NODE = { isAnalyticLightNode: true, light: { distance: 1 }, shadowNode: null };

/** Added to the depth a pixel is compared at, so a surface doesn't shadow itself. */
const SHADOW_BIAS = -0.0003;

type LightingContext = {
  lightingModel: { direct: (input: object, builder: NodeBuilder) => void };
  reflectedLight: { directDiffuse: ReturnType<typeof vec3>; directSpecular: ReturnType<typeof vec3> };
  /** Set by the haze model to the current ray-march position. */
  positionWorld?: typeof positionWorld;
};

export class LightTableNode extends LightingNode {
  static get type() {
    return "LightTableNode";
  }

  readonly table: LightTable;
  // Shared render group, like the table's count: see LightTable.countNode.
  readonly shadowBias = uniform(SHADOW_BIAS).setGroup(renderGroup);

  constructor(table: LightTable) {
    super();
    this.table = table;
  }

  setup(builder: NodeBuilder) {
    const { table } = this;
    const { lightingModel, reflectedLight, positionWorld: contextPosition } = builder.context as LightingContext;
    const surfacePosition = contextPosition || positionWorld;
    const diffuse = vec3(0).toVar("lightTableDiffuse");
    const specular = vec3(0).toVar("lightTableSpecular");

    Loop(table.countNode, ({ i }) => {
      const positionAndReach = textureLoad(table.texture, ivec2(i, 0));
      const toLight = positionAndReach.xyz.sub(surfacePosition).toVar();
      const distanceSquared = toLight.dot(toLight).toVar();

      // Out of reach: nothing else is read for this light.
      If(distanceSquared.lessThan(positionAndReach.w.mul(positionAndReach.w)), () => {
        const directionAndCone = textureLoad(table.texture, ivec2(i, 1));
        const lightDistance = distanceSquared.sqrt().toVar();
        const lightDirectionWorld = toLight.div(lightDistance.max(0.0001)).toVar();
        // The beam points away from the light; the pixel is inside the cone when the two directions line up.
        const angleCos = lightDirectionWorld.negate().dot(directionAndCone.xyz).toVar();

        If(angleCos.greaterThan(directionAndCone.w), () => {
          const colourAndPenumbra = textureLoad(table.texture, ivec2(i, 2));
          const spotAttenuation = smoothstep(directionAndCone.w, colourAndPenumbra.w, angleCos);
          const distanceAttenuation = getDistanceAttenuation({
            lightDistance,
            cutoffDistance: positionAndReach.w,
            decayExponent: float(2),
          });
          const lightColor = colourAndPenumbra.rgb.mul(spotAttenuation).mul(distanceAttenuation).toVar();

          const shadowLayer = int(textureLoad(table.texture, ivec2(i, 3)).x).toVar();
          If(shadowLayer.greaterThanEqual(0), () => {
            const column = (row: number) => textureLoad(table.shadows.matrixTexture, ivec2(shadowLayer, row));
            const shadowMatrix = mat4(column(0), column(1), column(2), column(3));
            const shadowPosition = shadowMatrix.mul(vec4(surfacePosition, 1)).toVar();
            const shadowCoord = shadowPosition.xyz.div(shadowPosition.w).toVar();
            // The cone lies inside the shadow frustum, so no frustum test is needed here.
            const lit = texture(table.shadows.depthTexture, vec2(shadowCoord.x, shadowCoord.y.oneMinus()))
              .depth(shadowLayer)
              .compare(shadowCoord.z.add(this.shadowBias));
            lightColor.mulAssign(lit);
          });

          lightingModel.direct(
            {
              // Lighting models work in view space.
              lightDirection: transformDirection(lightDirectionWorld, cameraViewMatrix),
              lightColor,
              lightNode: TABLE_LIGHT_NODE,
              reflectedLight: { directDiffuse: diffuse, directSpecular: specular },
            },
            builder,
          );
        });
      });
    });

    reflectedLight.directDiffuse.addAssign(diffuse);
    reflectedLight.directSpecular.addAssign(specular);
    return undefined;
  }
}

/** The scene's ordinary three.js lights (ambient, …) plus the light table. */
class TableLightsNode extends LightsNode {
  static get type() {
    return "TableLightsNode";
  }

  private readonly tableNode: LightTableNode;

  constructor(tableNode: LightTableNode) {
    super();
    this.tableNode = tableNode;
  }

  setupLightsNode(builder: NodeBuilder) {
    return [...super.setupLightsNode(builder), this.tableNode];
  }

  // The table always counts as lights, even when the scene has no three.js light.
  get hasLights() {
    return true;
  }
}

/**
 * Give this to `renderer.lighting` (before the first render) and every lit material in every scene is lit by the
 * table, with no change to the materials.
 */
export class LightTableLighting extends Lighting {
  readonly table = new LightTable();
  private readonly tableNode = new LightTableNode(this.table);

  createNode(lights: Light[] = []) {
    return new TableLightsNode(this.tableNode).setLights(lights);
  }
}
