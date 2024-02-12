import { defineQuery } from "bitecs";
import { App, AvatarPOVNode, CharacterControllerSystem, SystemsE, anyEntityWith, createNetworkedEntity } from "hubs";
import { Vector3 } from "three";
import { Portal } from "./components";
import { animatePortal, animationJobs } from "./utils";

export function spawnPortal(app: App, color?: number) {
  const avatarEid = anyEntityWith(app.world, AvatarPOVNode)!;
  const avatarPov = app.world.eid2obj.get(avatarEid)!;
  const portals = portalsQuery(app.world);
  const eid = createNetworkedEntity(app.world, "portal", {
    name: `My Portal ${portals.length}`,
    color: color ? color : Math.random() * 0xffffff
  });

  const characterControllerSystem = app.getSystem(SystemsE.CharacterControllerSystem) as CharacterControllerSystem;
  avatarPov.getWorldPosition(avatarPOVWorldPos);
  characterControllerSystem.findPOVPositionAboveNavMesh(
    avatarPOVWorldPos,
    avatarPov.localToWorld(initialPos.clone()),
    outWorldPos,
    false
  );
  const obj = app.world.eid2obj.get(eid)!;
  outWorldPos.setY(outWorldPos.y - 0.35);
  obj.position.copy(outWorldPos);
  avatarPOVWorldPos.y = obj.position.y;
  obj.lookAt(avatarPOVWorldPos);

  animationJobs.add(eid, () => animatePortal(app, eid));
}

const initialPos = new Vector3(0, 0, -1.5);
const avatarPOVWorldPos = new Vector3();
const outWorldPos = new Vector3();
const portalsQuery = defineQuery([Portal]);
export function portalChatCommand(app: App, args: string[]) {
  spawnPortal(app, Number(args[0]));
}
