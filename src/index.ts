import { App, PermissionE, SystemOrderE, registerAddon } from "hubs";
import { PortalPrefab, loadPortalModel } from "./portal-prefab";
import { portalInflator } from "./portal-inflator";
import { loadSfx, portalsSystem } from "./portal-system";
import { portalChatCommand } from "./chat-commands";
import { networkedPortalsSystem } from "./networked-portal-system";
import { NetworkedPortal } from "./components";
import { NetworkedPortalSchema } from "./portal-network-schema";
import { registerInput } from "./input";
import { ADDON_ID } from "./consts";

function onReady(app: App) {
  loadSfx(app);
  loadPortalModel();
  registerInput(app);
}

registerAddon(ADDON_ID, {
  name: "Portals Add-On",
  description: "Simple portals implementation.",
  onReady,
  prefab: { id: "portal", config: { permission: PermissionE.SPAWN_AND_MOVE_MEDIA, template: PortalPrefab } },
  inflator: { jsx: { id: "portal", inflator: portalInflator } },
  system: [
    { system: portalsSystem, order: SystemOrderE.PostPhysics },
    { system: networkedPortalsSystem, order: SystemOrderE.PostPhysics }
  ],
  chatCommand: { id: "portal", command: portalChatCommand },
  networkSchema: { component: NetworkedPortal, schema: NetworkedPortalSchema }
});
