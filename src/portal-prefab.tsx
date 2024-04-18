/** @jsx createElementEntity */
import { cloneModelFromCache, COLLISION_LAYERS, createElementEntity, EntityDef, Fit, FLOATY_OBJECT_FLAGS, getAbsoluteHref, loadModel, LoadModelResultT, Shape } from "hubs";
import { PortalParams } from "./portal-inflator";
import portal from "../assets/portal.glb";
import { Object3D } from "three";

let model: Object3D | null;
export async function loadPortalModel() {
  model = ((await loadModel(portal, null, true)) as LoadModelResultT).scene;
}

export function PortalPrefab(params: PortalParams): EntityDef {
  return (
    <entity
      name="Portal"
      networked
      networkedTransform
      portal={{
        debug: params.debug,
        name: params.name
      }}
      cursorRaycastable
      remoteHoverTarget
      handCollisionTarget
      offersRemoteConstraint
      offersHandConstraint
      floatyObject={{
        flags: FLOATY_OBJECT_FLAGS.HELIUM_WHEN_LARGE
      }}
      destroyAtExtremeDistance
      holdable
      rigidbody={{
        collisionGroup: COLLISION_LAYERS.INTERACTABLES,
        collisionMask:
          COLLISION_LAYERS.HANDS |
          COLLISION_LAYERS.ENVIRONMENT |
          COLLISION_LAYERS.INTERACTABLES |
          COLLISION_LAYERS.AVATAR
      }}
      deletable
    >
      <entity name="Portal Model" model={{ model: cloneModelFromCache(portal).scene }} />
    </entity>
  );
}
