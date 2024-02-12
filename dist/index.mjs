// src/index.ts
import { PermissionE, SystemOrderE, registerAddon } from "hubs";

// src/portal-prefab.tsx
import { cloneModelFromCache, COLLISION_LAYERS, createElementEntity, FLOATY_OBJECT_FLAGS, loadModel } from "hubs";
import portal from "./portal-LY7IJ43H.glb";
var model;
async function loadPortalModel() {
  model = (await loadModel(portal, null, true)).scene;
}
function PortalPrefab(params) {
  return /* @__PURE__ */ createElementEntity(
    "entity",
    {
      name: "Portal",
      networked: true,
      networkedTransform: true,
      portal: {
        debug: params.debug,
        name: params.name
      },
      cursorRaycastable: true,
      remoteHoverTarget: true,
      handCollisionTarget: true,
      offersRemoteConstraint: true,
      offersHandConstraint: true,
      floatyObject: {
        flags: FLOATY_OBJECT_FLAGS.HELIUM_WHEN_LARGE
      },
      destroyAtExtremeDistance: true,
      holdable: true,
      rigidbody: {
        collisionGroup: COLLISION_LAYERS.INTERACTABLES,
        collisionMask: COLLISION_LAYERS.HANDS | COLLISION_LAYERS.ENVIRONMENT | COLLISION_LAYERS.INTERACTABLES | COLLISION_LAYERS.AVATAR
      },
      deletable: true
    },
    /* @__PURE__ */ createElementEntity("entity", { name: "Portal Model", model: { model: cloneModelFromCache(portal).scene } })
  );
}

// src/portal-inflator.ts
import { addComponent } from "bitecs";
import { addObject3DComponent } from "hubs";

// src/components.ts
import { Types, defineComponent } from "bitecs";
var Portal = defineComponent({
  flags: Types.ui8,
  name: Types.ui32,
  target: Types.ui32,
  color: Types.ui32,
  count: Types.ui8
});
var NetworkedPortal = defineComponent({
  color: Types.ui32
});

// src/portal-inflator.ts
import { ShaderMaterial, Mesh, PlaneBufferGeometry, Vector3, Color, FrontSide } from "three";

// src/shaders.ts
var portalVertexShader = `
varying vec2 vUv;
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vUv = uv;
    // vUv.x = 1.0 - vUv.x;
}
`;
var portalFragmentShader = `
varying vec2 vUv;

uniform sampler2D iChannel0;
uniform vec3 iResolution;
uniform vec3 iPortalColor;
uniform float iTime;
 
#include <common>

vec3 greyscale(vec3 color, float str) {
    float g = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(color, vec3(g), str);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float t = iTime;
    // Normalized pixel coordinates (from -1 to 1)
    vec2 uv = 2.0*(fragCoord-.5*iResolution.xy)/iResolution.xy;
    uv.y *= 0.65;

    // polar
    float d = length(uv); 
    //float alpha = atan(uv.y, uv.x) / (2.*PI) + 0.5; // normalize -pi,pi to 0, 1 for display
    float alpha = atan(uv.y, uv.x); //-pi to pi
    vec2 pc = vec2(d, alpha); // polar coords
    
    //fancy calc or irregular shape
    float sinVal = sin(0.5+pc.y*3.+t*2.)*sin(pc.y*8.+t*2.)*0.04;
    float thk = 0.1;
    float res;
    float r = 0.51;
    float targetVal = r + sinVal;
    
    res = 1. - smoothstep(targetVal-thk, targetVal+thk, d);
    
    vec3 col;
    
    vec2 cPos = -1.0 + 2.0 * fragCoord.xy / iResolution.xy;
    float cLength = length(cPos);
    vec2 rippleUV = fragCoord.xy/iResolution.xy+(cPos/cLength)*cos(cLength*12.0-iTime*4.0) * 0.01;
    vec3 portalColor = texture(iChannel0,rippleUV).xyz;
    portalColor = greyscale(portalColor, 1.0);
    vec3 bgColor = vec3(0);
    
    col = mix(bgColor, portalColor, res);
    vec3 edgeColor = iPortalColor;  // add edge tint
    float edgeDist = smoothstep(targetVal-thk,targetVal+thk, d);
    if(d < targetVal+thk){
        col += edgeColor*edgeDist; // could be smoother
    }
    if (res < 0.01) discard;
    // Output to screen
    fragColor = vec4(col, 1.0);
}
 
void main() {
    mainImage(gl_FragColor, vUv * iResolution.xy);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
}
`;

// src/portal-inflator.ts
var PORTAL_FLAGS = {
  DEBUG: 1 << 0,
  IS_INSIDE: 1 << 1
};
var DEFAULTS = {
  debug: false,
  name: "Unnamed portal",
  color: 255
};
function portalInflator(world, eid, params) {
  const portalParams = Object.assign({}, DEFAULTS, params);
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
    const randColor = Math.random() * 16777215;
    Portal.color[eid] = randColor;
    NetworkedPortal.color[eid] = randColor;
  }
  Portal.count[eid] = 0;
  const plane = new Mesh(
    new PlaneBufferGeometry(2.5, 2.5),
    new ShaderMaterial({
      uniforms: {
        iChannel0: { value: null },
        iTime: { value: 0 },
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

// src/portal-system.ts
import { defineQuery as defineQuery3, enterQuery, exitQuery } from "bitecs";
import {
  SystemsE as SystemsE3,
  anyEntityWith as anyEntityWith2,
  AvatarPOVNode as AvatarPOVNode2,
  Layers,
  Networked,
  deleteTheDeletableAncestor,
  findChildWithComponent,
  GLTFModel,
  updateMaterials
} from "hubs";
import {
  Vector3 as Vector34,
  Matrix4,
  Mesh as Mesh2,
  PerspectiveCamera,
  WebGLRenderTarget,
  LinearFilter,
  NearestFilter,
  RGBAFormat,
  sRGBEncoding,
  Sphere,
  SphereBufferGeometry,
  MeshBasicMaterial,
  AxesHelper,
  MathUtils
} from "three";
import PORTAL_SFX_URL from "./portal-EBVWFHX7.mp3";

// src/utils.ts
import { JobRunner, animate, crNextFrame, elasticOut } from "hubs";
import { Vector3 as Vector32 } from "three";
var animationJobs = new JobRunner();
function* animatePortal(app, eid) {
  const obj = app.world.eid2obj.get(eid);
  const onAnimate = (values) => {
    const scale = values[0];
    obj.scale.copy(scale);
    obj.matrixNeedsUpdate = true;
  };
  const scalar = 1e-3;
  const startScale = new Vector32().copy(obj.scale).multiplyScalar(scalar);
  const endScale = new Vector32().copy(obj.scale);
  onAnimate([startScale]);
  yield crNextFrame();
  yield* animate({
    properties: [[startScale, endScale]],
    durationMS: 1e3,
    easing: elasticOut,
    fn: onAnimate
  });
}

// src/input.ts
import {
  HoveredRemoteRight,
  InputDeviceE,
  InputPathsE,
  InputSetsE,
  SystemsE as SystemsE2,
  paths,
  xforms
} from "hubs";

// src/consts.ts
var ADDON_ID = "hubs-portals-addon";

// src/chat-commands.ts
import { defineQuery } from "bitecs";
import { AvatarPOVNode, SystemsE, anyEntityWith, createNetworkedEntity } from "hubs";
import { Vector3 as Vector33 } from "three";
function spawnPortal(app, color) {
  const avatarEid = anyEntityWith(app.world, AvatarPOVNode);
  const avatarPov = app.world.eid2obj.get(avatarEid);
  const portals = portalsQuery(app.world);
  const eid = createNetworkedEntity(app.world, "portal", {
    name: `My Portal ${portals.length}`,
    color: color ? color : Math.random() * 16777215
  });
  const characterControllerSystem2 = app.getSystem(SystemsE.CharacterControllerSystem);
  avatarPov.getWorldPosition(avatarPOVWorldPos);
  characterControllerSystem2.findPOVPositionAboveNavMesh(
    avatarPOVWorldPos,
    avatarPov.localToWorld(initialPos.clone()),
    outWorldPos,
    false
  );
  const obj = app.world.eid2obj.get(eid);
  outWorldPos.setY(outWorldPos.y - 0.35);
  obj.position.copy(outWorldPos);
  avatarPOVWorldPos.y = obj.position.y;
  obj.lookAt(avatarPOVWorldPos);
  animationJobs.add(eid, () => animatePortal(app, eid));
}
var initialPos = new Vector33(0, 0, -1.5);
var avatarPOVWorldPos = new Vector33();
var outWorldPos = new Vector33();
var portalsQuery = defineQuery([Portal]);
function portalChatCommand(app, args) {
  spawnPortal(app, Number(args[0]));
}

// src/input.ts
import { defineQuery as defineQuery2 } from "bitecs";
var PORTAL_CREATE_ACTION = `/${ADDON_ID}/create`;
var PORTAL_CREATE_PATH = `${InputPathsE.actions}/${PORTAL_CREATE_ACTION}`;
var PORTAL_CHANGE_COLOR_ACTION = `/${ADDON_ID}/changeColor`;
var PORTAL_CHANGE_COLOR_PATH = `${InputPathsE.actions}/${PORTAL_CHANGE_COLOR_ACTION}`;
function registerInput(app) {
  const userInput = app.getSystem(SystemsE2.UserInputSystem);
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
var hoveredPortalsQuery = defineQuery2([Portal, HoveredRemoteRight]);
function checkInput(app) {
  const userInput = app.getSystem(SystemsE2.UserInputSystem);
  if (userInput.get(PORTAL_CREATE_PATH)) {
    spawnPortal(app);
  } else if (userInput.get(PORTAL_CHANGE_COLOR_PATH)) {
    hoveredPortalsQuery(app.world).forEach((eid) => {
      Portal.color[eid] = Math.random() * 16777215;
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

// src/portal-system.ts
var AABBs = /* @__PURE__ */ new Map();
var renderTargets = /* @__PURE__ */ new Map();
var helpers = /* @__PURE__ */ new Map();
var cameras = /* @__PURE__ */ new Map();
var tmpMat = new Matrix4();
var targetMat = new Matrix4().identity();
var portalPos = new Vector34();
var avatarPOVPos = new Vector34();
var objWorldDir = new Vector34();
var AABBOffset = new Vector34(0, 0.2, 0);
var characterControllerSystem;
var PORTAL_RENDER_WIDTH = 512;
var PORTAL_RENDER_HEIGHT = 512;
var RADIUS = 0.75;
var sounds = /* @__PURE__ */ new Map();
function loadSfx(app) {
  [PORTAL_SFX_URL].forEach((url) => {
    const sfxSystem = app.getSystem(SystemsE3.SoundEffectsSystem);
    sfxSystem.registerSound(url).then((sound) => {
      sounds.set(sound.url, sound.id);
    });
  });
}
function playPortalSfx(app) {
  app.getSystem(SystemsE3.SoundEffectsSystem).playSoundOneShot(sounds.get(PORTAL_SFX_URL));
}
function updateRenderTarget(app, portals, source, target) {
  const obj = app.world.eid2obj.get(source);
  const shader = obj.material;
  shader.uniforms.iTime.value = app.world.time.elapsed / 1e3;
  shader.uniformsNeedUpdate = true;
  if (!target)
    return;
  const scene = app.world.scene;
  const renderer = app.scene.renderer;
  const tmpVRFlag = renderer.xr.enabled;
  renderer.xr.enabled = false;
  const tmpOnAfterRender = scene.onAfterRender;
  scene.onAfterRender = () => {
  };
  const tmpAutoUpdate = scene.autoUpdate;
  scene.autoUpdate = false;
  const renderTarget = renderTargets.get(source);
  renderTarget.needsUpdate = false;
  renderTarget.lastUpdated = app.world.time.elapsed;
  const tmpRenderTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(renderTarget);
  renderer.clearDepth();
  portals.forEach((p) => {
    if (p === target) {
      const obj2 = app.world.eid2obj.get(p);
      if (obj2)
        obj2.visible = false;
    }
  });
  renderer.render(scene, cameras.get(target));
  portals.forEach((p) => {
    if (p === target) {
      const obj2 = app.world.eid2obj.get(p);
      if (obj2)
        obj2.visible = true;
    }
  });
  renderer.setRenderTarget(tmpRenderTarget);
  renderer.xr.enabled = tmpVRFlag;
  scene.onAfterRender = tmpOnAfterRender;
  scene.autoUpdate = tmpAutoUpdate;
}
function disposePortal(app, eid) {
  if (Portal.flags[eid] & PORTAL_FLAGS.DEBUG) {
    const helper = helpers.get(eid);
    helper.removeFromParent();
    helpers.delete(eid);
  }
  AABBs.delete(eid);
  const renderTarget = renderTargets.get(eid);
  renderTarget.dispose();
  renderTargets.delete(eid);
  cameras.delete(eid);
}
function updatePortalColor(app, eid) {
  const obj = app.world.eid2obj.get(eid);
  const shaderMat = obj.material;
  shaderMat.needsUpdate = true;
  shaderMat.uniforms.iPortalColor.value.set(Portal.color[eid]);
  const modelEid = findChildWithComponent(app.world, GLTFModel, eid);
  const model2 = app.world.eid2obj.get(modelEid);
  model2.traverse((object) => {
    updateMaterials(object, (material) => {
      material.color.set(Portal.color[eid]);
      material.emissive.set(Portal.color[eid]);
      return material;
    });
  });
}
var portalsQuery2 = defineQuery3([Portal]);
var portalsEnterQuery = enterQuery(portalsQuery2);
var portalsExitQuery = exitQuery(portalsQuery2);
function portalsSystem(app) {
  portalsEnterQuery(app.world).forEach((eid) => {
    const obj = app.world.eid2obj.get(eid);
    obj.updateMatrixWorld(true);
    const AABB = new Sphere(AABBOffset.clone(), RADIUS);
    AABB.applyMatrix4(obj.matrixWorld);
    AABBs.set(eid, AABB);
    if (Portal.flags[eid] & PORTAL_FLAGS.DEBUG) {
      var geometry = new SphereBufferGeometry(RADIUS, 6, 6);
      var material = new MeshBasicMaterial({
        color: 16777215,
        wireframe: true
      });
      var helper = new Mesh2(geometry, material);
      helper.position.copy(AABBOffset);
      helpers.set(eid, helper);
      obj.add(helper);
      const axesHelper = new AxesHelper(1);
      obj.add(axesHelper);
    }
    const portals2 = portalsQuery2(app.world);
    if (portals2.length % 2 === 0) {
      const targetEid2 = portals2.find((_value, index, _obj) => index === portals2.length - 2);
      if (targetEid2) {
        Portal.target[eid] = Networked.id[targetEid2];
        Portal.target[targetEid2] = Networked.id[eid];
      }
    }
    const camera = new PerspectiveCamera(80, PORTAL_RENDER_WIDTH / PORTAL_RENDER_HEIGHT, 0.1, 1e3);
    camera.layers.enable(Layers.CAMERA_LAYER_THIRD_PERSON_ONLY);
    camera.layers.enable(Layers.CAMERA_LAYER_VIDEO_TEXTURE_TARGET);
    camera.matrixAutoUpdate = true;
    camera.rotateY(MathUtils.degToRad(180));
    obj.add(camera);
    cameras.set(eid, camera);
    const renderTarget = new WebGLRenderTarget(PORTAL_RENDER_WIDTH, PORTAL_RENDER_HEIGHT, {
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: NearestFilter,
      encoding: sRGBEncoding
    });
    renderTargets.set(eid, renderTarget);
    const shaderMat = obj.material;
    shaderMat.needsUpdate = true;
    function setRenderTargetDirty() {
      shaderMat.needsUpdate = true;
    }
    const targetNid = Portal.target[eid];
    const targetEid = app.world.nid2eid.get(targetNid);
    const color = targetEid ? Portal.color[targetEid] : Portal.color[eid];
    shaderMat.uniforms.iPortalColor.value.set(color);
    shaderMat.uniforms.iChannel0.value = renderTarget.texture;
    shaderMat.uniforms.iResolution.value.set(PORTAL_RENDER_WIDTH, PORTAL_RENDER_HEIGHT, 1);
    shaderMat.uniformsNeedUpdate = true;
    obj.onBeforeRender = setRenderTargetDirty;
    const modelEid = findChildWithComponent(app.world, GLTFModel, eid);
    const model2 = app.world.eid2obj.get(modelEid);
    model2.traverse((object) => {
      updateMaterials(object, (material2) => {
        material2 = material2.clone();
        material2.name = `${app.getString(Portal.name[eid])} Material`;
        material2.color.set(color);
        material2.emissive.set(color);
        material2.emissiveIntensity = 0.5;
        return material2;
      });
    });
    playPortalSfx(app);
  });
  portalsExitQuery(app.world).forEach((eid) => {
    animationJobs.stop(eid);
    disposePortal(app, eid);
    const targetNid = Portal.target[eid];
    const targetEid = app.world.nid2eid.get(targetNid);
    if (targetEid) {
      Portal.target[targetEid] = 0;
      deleteTheDeletableAncestor(app.world, targetEid);
    }
  });
  const updateState = app.scene.is("entered");
  const portals = portalsQuery2(app.world);
  portals.forEach((eid) => {
    const obj = app.world.eid2obj.get(eid);
    obj.updateMatrixWorld(true);
    const AABB = AABBs.get(eid);
    AABB.center.copy(AABBOffset);
    AABB.radius = RADIUS;
    AABB.applyMatrix4(obj.matrixWorld);
    const targetNid = Portal.target[eid];
    const targetEid = app.world.nid2eid.get(targetNid);
    const targetPortal = portals.find((otherPortal) => otherPortal !== eid && targetEid === otherPortal);
    updateRenderTarget(app, portals, eid, targetPortal);
    if (!updateState || !targetPortal) {
      return;
    }
    const targetObj = app.world.eid2obj.get(targetPortal);
    const avatarPOVEid = anyEntityWith2(app.world, AvatarPOVNode2);
    const avatarPOV = app.world.eid2obj.get(avatarPOVEid);
    avatarPOV.getWorldPosition(avatarPOVPos);
    obj.getWorldPosition(portalPos);
    const len = portalPos.clone().sub(avatarPOVPos).lengthSq();
    const targetCamera = cameras.get(targetPortal);
    targetCamera.fov = MathUtils.lerp(80, 120, MathUtils.clamp(1 - len / 5, 0, 1));
    targetCamera.updateProjectionMatrix();
    const isInside = AABB.containsPoint(avatarPOVPos);
    const isInsidePortal = Boolean(Portal.flags[eid] & PORTAL_FLAGS.IS_INSIDE);
    if (isInside !== isInsidePortal) {
      if (Portal.flags[eid] & PORTAL_FLAGS.DEBUG) {
        const portalName = app.getString(Portal.name[eid]);
        console.log(`You are ${isInside ? "inside" : "outside"} the portal ${portalName}`);
      }
      if (isInside) {
        Portal.flags[eid] |= PORTAL_FLAGS.IS_INSIDE;
      } else {
        Portal.flags[eid] &= ~PORTAL_FLAGS.IS_INSIDE;
        Portal.count[eid]++;
        const portalName = app.getString(Portal.name[eid]);
        app.messageDispatch?.dispatch(`Portal ${portalName} used ${Portal.count[eid]} times`);
      }
    } else {
      return;
    }
    obj.getWorldDirection(objWorldDir);
    const isFacing = objWorldDir.dot(portalPos.sub(avatarPOVPos)) < 0;
    if (isInside && isFacing) {
      if (!characterControllerSystem) {
        characterControllerSystem = app.getSystem(SystemsE3.CharacterControllerSystem);
      }
      tmpMat.makeTranslation(0, 0, RADIUS * 1.2);
      targetMat.copy(targetObj.matrixWorld).multiply(tmpMat);
      characterControllerSystem.travelByWaypoint(targetMat, true, false);
      avatarPOV.updateMatrixWorld();
      playPortalSfx(app);
    }
  });
  checkInput(app);
  animationJobs.tick();
}

// src/networked-portal-system.ts
import { defineQuery as defineQuery4, hasComponent as hasComponent2 } from "bitecs";
import { Owned } from "hubs";
var networkedPortalsQuery = defineQuery4([Portal, NetworkedPortal]);
function networkedPortalsSystem(app) {
  networkedPortalsQuery(app.world).forEach((eid) => {
    if (hasComponent2(app.world, Owned, eid)) {
      NetworkedPortal.color[eid] = Portal.color[eid];
    } else {
      if (Portal.color[eid] !== NetworkedPortal.color[eid]) {
        Portal.color[eid] = NetworkedPortal.color[eid];
        updatePortalColor(app, eid);
      }
    }
  });
}

// src/portal-network-schema.ts
import {
  defineNetworkSchema,
  deserializerWithMigrations,
  read,
  write
} from "hubs";
var migrations = /* @__PURE__ */ new Map();
function apply(eid, { version, data }) {
  if (version !== 1)
    return false;
  const { color } = data;
  write(NetworkedPortal.color, eid, color);
  return true;
}
var runtimeSerde = defineNetworkSchema(NetworkedPortal);
var NetworkedPortalSchema = {
  componentName: "networked-portal",
  serialize: runtimeSerde.serialize,
  deserialize: runtimeSerde.deserialize,
  serializeForStorage: function serializeForStorage(eid) {
    return {
      version: 1,
      data: {
        color: read(NetworkedPortal.color, eid)
      }
    };
  },
  deserializeFromStorage: deserializerWithMigrations(migrations, apply)
};

// src/index.ts
function onReady(app) {
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
//# sourceMappingURL=index.mjs.map