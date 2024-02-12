import { addComponent } from "bitecs";
import { ComponentDataT, EntityID, HubsWorld, addObject3DComponent } from "hubs";
import { NetworkedPortal, Portal } from "./components";
import { ShaderMaterial, Mesh, PlaneBufferGeometry, Vector3, Color, FrontSide } from "three";
import { portalVertexShader, portalFragmentShader } from "./shaders";

export const PORTAL_FLAGS = {
  DEBUG: 1 << 0,
  IS_INSIDE: 1 << 1
};

export type PortalParams = {
  name?: string;
  debug?: boolean;
  color?: number;
};

const DEFAULTS: Required<PortalParams> = {
  debug: false,
  name: "Unnamed portal",
  color: 0x0000ff
};

export function portalInflator(world: HubsWorld, eid: number, params?: ComponentDataT): EntityID {
  const portalParams: PortalParams = Object.assign({}, DEFAULTS, params);
  addComponent(world, Portal, eid);
  addComponent(world, NetworkedPortal, eid);

  const { debug, name } = portalParams;
  if (debug) {
    Portal.flags[eid] |= PORTAL_FLAGS.DEBUG;
  }
  if (name) {
    Portal.name[eid] = APP.getSid(name);
  }
  if (params?.color) {
    Portal.color[eid] = params.color;
    NetworkedPortal.color[eid] = params.color;
  } else {
    const randColor = Math.random() * 0xffffff;
    Portal.color[eid] = randColor;
    NetworkedPortal.color[eid] = randColor;
  }

  Portal.count[eid] = 0;

  const plane = new Mesh(
    new PlaneBufferGeometry(2.5, 2.5),
    new ShaderMaterial({
      uniforms: {
        iChannel0: { value: null },
        iTime: { value: 0.0 },
        iResolution: { value: new Vector3() },
        iPortalColor: { value: new Color(Portal.color[eid]) }
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader,
      side: FrontSide,
      transparent: true
    })
  );

  addObject3DComponent(world, eid, plane);
  return eid;
}
