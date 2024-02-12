import { defineQuery, hasComponent } from "bitecs";
import { App, Owned } from "hubs";
import { NetworkedPortal, Portal } from "./components";
import { updatePortalColor } from "./portal-system";

const networkedPortalsQuery = defineQuery([Portal, NetworkedPortal]);
export function networkedPortalsSystem(app: App) {
  networkedPortalsQuery(app.world).forEach(eid => {
    // If I own the entity I'm responsible for updating the networked component
    if (hasComponent(app.world, Owned, eid)) {
      NetworkedPortal.color[eid] = Portal.color[eid];
    } else {
      if (Portal.color[eid] !== NetworkedPortal.color[eid]) {
        Portal.color[eid] = NetworkedPortal.color[eid];
        updatePortalColor(app, eid);
      }
    }
  });
}
