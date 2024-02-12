import {
  App,
  EntityID,
  HoveredRemoteRight,
  InputDeviceE,
  InputPathsE,
  InputSetsE,
  SystemsE,
  UserInputSystem,
  paths,
  xforms
} from "hubs";
import { ADDON_ID } from "./consts";
import { spawnPortal } from "./chat-commands";
import { defineQuery, hasComponent } from "bitecs";
import { Portal } from "./components";
import { updatePortalColor } from "./portal-system";

const PORTAL_CREATE_ACTION = `/${ADDON_ID}/create`;
const PORTAL_CREATE_PATH = `${InputPathsE.actions}/${PORTAL_CREATE_ACTION}`;
const PORTAL_CHANGE_COLOR_ACTION = `/${ADDON_ID}/changeColor`;
const PORTAL_CHANGE_COLOR_PATH = `${InputPathsE.actions}/${PORTAL_CHANGE_COLOR_ACTION}`;

export function registerInput(app: App) {
  const userInput = app.getSystem(SystemsE.UserInputSystem) as UserInputSystem;
  userInput.registerPaths([
    {
      type: InputPathsE.actions,
      value: PORTAL_CREATE_ACTION
    },
    {
      type: InputPathsE.actions,
      value: PORTAL_CHANGE_COLOR_ACTION
    }
  ]);
  userInput.registerBindings(InputDeviceE.KeyboardMouse, {
    [InputSetsE.global]: [
      {
        src: {
          bool: paths.device.keyboard.key("control"),
          value: paths.device.keyboard.key("n")
        },
        dest: { value: "/var/control+n" },
        xform: xforms.copyIfTrue
      },
      {
        src: { value: "/var/control+n" },
        dest: { value: PORTAL_CHANGE_COLOR_PATH },
        xform: xforms.rising
      },
      {
        src: {
          bool: paths.device.keyboard.key("control"),
          value: paths.device.keyboard.key("n")
        },
        dest: { value: "/var/notcontrol+n" },
        xform: xforms.copyIfFalse
      },
      {
        src: { value: "/var/notcontrol+n" },
        dest: { value: PORTAL_CREATE_PATH },
        xform: xforms.rising
      }
    ]
  });
}

const hoveredPortalsQuery = defineQuery([Portal, HoveredRemoteRight]);
export function checkInput(app: App) {
  const userInput = app.getSystem(SystemsE.UserInputSystem) as UserInputSystem;
  if (userInput.get(PORTAL_CREATE_PATH)) {
    spawnPortal(app);
  } else if (userInput.get(PORTAL_CHANGE_COLOR_PATH)) {
    hoveredPortalsQuery(app.world).forEach(eid => {
      Portal.color[eid] = Math.random() * 0xffffff;
      updatePortalColor(app, eid);
      const targetNid = Portal.target[eid];
      const targetEid = app.world.nid2eid.get(targetNid);
      if (targetEid) {
        Portal.color[targetEid] = Portal.color[eid];
        updatePortalColor(app, targetEid);
      }
    });
  }
}
