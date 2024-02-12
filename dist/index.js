"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/index.ts
var _hubs = require('hubs');

// src/portal-prefab.tsx

var _portalLY7IJ43Hglb = require('./portal-LY7IJ43H.glb'); var _portalLY7IJ43Hglb2 = _interopRequireDefault(_portalLY7IJ43Hglb);
var model;
async function loadPortalModel() {
  model = (await _hubs.loadModel.call(void 0, _portalLY7IJ43Hglb2.default, null, true)).scene;
}
function PortalPrefab(params) {
  return /* @__PURE__ */ _hubs.createElementEntity.call(void 0, 
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
        flags: _hubs.FLOATY_OBJECT_FLAGS.HELIUM_WHEN_LARGE
      },
      destroyAtExtremeDistance: true,
      holdable: true,
      rigidbody: {
        collisionGroup: _hubs.COLLISION_LAYERS.INTERACTABLES,
        collisionMask: _hubs.COLLISION_LAYERS.HANDS | _hubs.COLLISION_LAYERS.ENVIRONMENT | _hubs.COLLISION_LAYERS.INTERACTABLES | _hubs.COLLISION_LAYERS.AVATAR
      },
      deletable: true
    },
    /* @__PURE__ */ _hubs.createElementEntity.call(void 0, "entity", { name: "Portal Model", model: { model: _hubs.cloneModelFromCache.call(void 0, _portalLY7IJ43Hglb2.default).scene } })
  );
}

// src/portal-inflator.ts
var _bitecs = require('bitecs');


// src/components.ts

var Portal = _bitecs.defineComponent.call(void 0, {
  flags: _bitecs.Types.ui8,
  name: _bitecs.Types.ui32,
  target: _bitecs.Types.ui32,
  color: _bitecs.Types.ui32,
  count: _bitecs.Types.ui8
});
var NetworkedPortal = _bitecs.defineComponent.call(void 0, {
  color: _bitecs.Types.ui32
});

// src/portal-inflator.ts
var _three = require('three');

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
  _bitecs.addComponent.call(void 0, world, Portal, eid);
  _bitecs.addComponent.call(void 0, world, NetworkedPortal, eid);
  const { debug, name } = portalParams;
  if (debug) {
    Portal.flags[eid] |= PORTAL_FLAGS.DEBUG;
  }
  if (name) {
    Portal.name[eid] = APP.getSid(name);
  }
  if (_optionalChain([params, 'optionalAccess', _ => _.color])) {
    Portal.color[eid] = params.color;
    NetworkedPortal.color[eid] = params.color;
  } else {
    const randColor = Math.random() * 16777215;
    Portal.color[eid] = randColor;
    NetworkedPortal.color[eid] = randColor;
  }
  Portal.count[eid] = 0;
  const plane = new (0, _three.Mesh)(
    new (0, _three.PlaneBufferGeometry)(2.5, 2.5),
    new (0, _three.ShaderMaterial)({
      uniforms: {
        iChannel0: { value: null },
        iTime: { value: 0 },
        iResolution: { value: new (0, _three.Vector3)() },
        iPortalColor: { value: new (0, _three.Color)(Portal.color[eid]) }
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader,
      side: _three.FrontSide,
      transparent: true
    })
  );
  _hubs.addObject3DComponent.call(void 0, world, eid, plane);
  return eid;
}

// src/portal-system.ts




























var _portalEBVWFHX7mp3 = require('./portal-EBVWFHX7.mp3'); var _portalEBVWFHX7mp32 = _interopRequireDefault(_portalEBVWFHX7mp3);

// src/utils.ts


var animationJobs = new (0, _hubs.JobRunner)();
function* animatePortal(app, eid) {
  const obj = app.world.eid2obj.get(eid);
  const onAnimate = (values) => {
    const scale = values[0];
    obj.scale.copy(scale);
    obj.matrixNeedsUpdate = true;
  };
  const scalar = 1e-3;
  const startScale = new (0, _three.Vector3)().copy(obj.scale).multiplyScalar(scalar);
  const endScale = new (0, _three.Vector3)().copy(obj.scale);
  onAnimate([startScale]);
  yield _hubs.crNextFrame.call(void 0, );
  yield* _hubs.animate.call(void 0, {
    properties: [[startScale, endScale]],
    durationMS: 1e3,
    easing: _hubs.elasticOut,
    fn: onAnimate
  });
}

// src/input.ts










// src/consts.ts
var ADDON_ID = "hubs-portals-addon";

// src/chat-commands.ts



function spawnPortal(app, color) {
  const avatarEid = _hubs.anyEntityWith.call(void 0, app.world, _hubs.AvatarPOVNode);
  const avatarPov = app.world.eid2obj.get(avatarEid);
  const portals = portalsQuery(app.world);
  const eid = _hubs.createNetworkedEntity.call(void 0, app.world, "portal", {
    name: `My Portal ${portals.length}`,
    color: color ? color : Math.random() * 16777215
  });
  const characterControllerSystem2 = app.getSystem(_hubs.SystemsE.CharacterControllerSystem);
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
var initialPos = new (0, _three.Vector3)(0, 0, -1.5);
var avatarPOVWorldPos = new (0, _three.Vector3)();
var outWorldPos = new (0, _three.Vector3)();
var portalsQuery = _bitecs.defineQuery.call(void 0, [Portal]);
function portalChatCommand(app, args) {
  spawnPortal(app, Number(args[0]));
}

// src/input.ts

var PORTAL_CREATE_ACTION = `/${ADDON_ID}/create`;
var PORTAL_CREATE_PATH = `${_hubs.InputPathsE.actions}/${PORTAL_CREATE_ACTION}`;
var PORTAL_CHANGE_COLOR_ACTION = `/${ADDON_ID}/changeColor`;
var PORTAL_CHANGE_COLOR_PATH = `${_hubs.InputPathsE.actions}/${PORTAL_CHANGE_COLOR_ACTION}`;
function registerInput(app) {
  const userInput = app.getSystem(_hubs.SystemsE.UserInputSystem);
  userInput.registerPaths([
    {
      type: _hubs.InputPathsE.actions,
      value: PORTAL_CREATE_ACTION
    },
    {
      type: _hubs.InputPathsE.actions,
      value: PORTAL_CHANGE_COLOR_ACTION
    }
  ]);
  userInput.registerBindings(_hubs.InputDeviceE.KeyboardMouse, {
    [_hubs.InputSetsE.global]: [
      {
        src: {
          bool: _hubs.paths.device.keyboard.key("control"),
          value: _hubs.paths.device.keyboard.key("n")
        },
        dest: { value: "/var/control+n" },
        xform: _hubs.xforms.copyIfTrue
      },
      {
        src: { value: "/var/control+n" },
        dest: { value: PORTAL_CHANGE_COLOR_PATH },
        xform: _hubs.xforms.rising
      },
      {
        src: {
          bool: _hubs.paths.device.keyboard.key("control"),
          value: _hubs.paths.device.keyboard.key("n")
        },
        dest: { value: "/var/notcontrol+n" },
        xform: _hubs.xforms.copyIfFalse
      },
      {
        src: { value: "/var/notcontrol+n" },
        dest: { value: PORTAL_CREATE_PATH },
        xform: _hubs.xforms.rising
      }
    ]
  });
}
var hoveredPortalsQuery = _bitecs.defineQuery.call(void 0, [Portal, _hubs.HoveredRemoteRight]);
function checkInput(app) {
  const userInput = app.getSystem(_hubs.SystemsE.UserInputSystem);
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
var tmpMat = new (0, _three.Matrix4)();
var targetMat = new (0, _three.Matrix4)().identity();
var portalPos = new (0, _three.Vector3)();
var avatarPOVPos = new (0, _three.Vector3)();
var objWorldDir = new (0, _three.Vector3)();
var AABBOffset = new (0, _three.Vector3)(0, 0.2, 0);
var characterControllerSystem;
var PORTAL_RENDER_WIDTH = 512;
var PORTAL_RENDER_HEIGHT = 512;
var RADIUS = 0.75;
var sounds = /* @__PURE__ */ new Map();
function loadSfx(app) {
  [_portalEBVWFHX7mp32.default].forEach((url) => {
    const sfxSystem = app.getSystem(_hubs.SystemsE.SoundEffectsSystem);
    sfxSystem.registerSound(url).then((sound) => {
      sounds.set(sound.url, sound.id);
    });
  });
}
function playPortalSfx(app) {
  app.getSystem(_hubs.SystemsE.SoundEffectsSystem).playSoundOneShot(sounds.get(_portalEBVWFHX7mp32.default));
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
  const modelEid = _hubs.findChildWithComponent.call(void 0, app.world, _hubs.GLTFModel, eid);
  const model2 = app.world.eid2obj.get(modelEid);
  model2.traverse((object) => {
    _hubs.updateMaterials.call(void 0, object, (material) => {
      material.color.set(Portal.color[eid]);
      material.emissive.set(Portal.color[eid]);
      return material;
    });
  });
}
var portalsQuery2 = _bitecs.defineQuery.call(void 0, [Portal]);
var portalsEnterQuery = _bitecs.enterQuery.call(void 0, portalsQuery2);
var portalsExitQuery = _bitecs.exitQuery.call(void 0, portalsQuery2);
function portalsSystem(app) {
  portalsEnterQuery(app.world).forEach((eid) => {
    const obj = app.world.eid2obj.get(eid);
    obj.updateMatrixWorld(true);
    const AABB = new (0, _three.Sphere)(AABBOffset.clone(), RADIUS);
    AABB.applyMatrix4(obj.matrixWorld);
    AABBs.set(eid, AABB);
    if (Portal.flags[eid] & PORTAL_FLAGS.DEBUG) {
      var geometry = new (0, _three.SphereBufferGeometry)(RADIUS, 6, 6);
      var material = new (0, _three.MeshBasicMaterial)({
        color: 16777215,
        wireframe: true
      });
      var helper = new (0, _three.Mesh)(geometry, material);
      helper.position.copy(AABBOffset);
      helpers.set(eid, helper);
      obj.add(helper);
      const axesHelper = new (0, _three.AxesHelper)(1);
      obj.add(axesHelper);
    }
    const portals2 = portalsQuery2(app.world);
    if (portals2.length % 2 === 0) {
      const targetEid2 = portals2.find((_value, index, _obj) => index === portals2.length - 2);
      if (targetEid2) {
        Portal.target[eid] = _hubs.Networked.id[targetEid2];
        Portal.target[targetEid2] = _hubs.Networked.id[eid];
      }
    }
    const camera = new (0, _three.PerspectiveCamera)(80, PORTAL_RENDER_WIDTH / PORTAL_RENDER_HEIGHT, 0.1, 1e3);
    camera.layers.enable(_hubs.Layers.CAMERA_LAYER_THIRD_PERSON_ONLY);
    camera.layers.enable(_hubs.Layers.CAMERA_LAYER_VIDEO_TEXTURE_TARGET);
    camera.matrixAutoUpdate = true;
    camera.rotateY(_three.MathUtils.degToRad(180));
    obj.add(camera);
    cameras.set(eid, camera);
    const renderTarget = new (0, _three.WebGLRenderTarget)(PORTAL_RENDER_WIDTH, PORTAL_RENDER_HEIGHT, {
      format: _three.RGBAFormat,
      minFilter: _three.LinearFilter,
      magFilter: _three.NearestFilter,
      encoding: _three.sRGBEncoding
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
    const modelEid = _hubs.findChildWithComponent.call(void 0, app.world, _hubs.GLTFModel, eid);
    const model2 = app.world.eid2obj.get(modelEid);
    model2.traverse((object) => {
      _hubs.updateMaterials.call(void 0, object, (material2) => {
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
      _hubs.deleteTheDeletableAncestor.call(void 0, app.world, targetEid);
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
    const avatarPOVEid = _hubs.anyEntityWith.call(void 0, app.world, _hubs.AvatarPOVNode);
    const avatarPOV = app.world.eid2obj.get(avatarPOVEid);
    avatarPOV.getWorldPosition(avatarPOVPos);
    obj.getWorldPosition(portalPos);
    const len = portalPos.clone().sub(avatarPOVPos).lengthSq();
    const targetCamera = cameras.get(targetPortal);
    targetCamera.fov = _three.MathUtils.lerp(80, 120, _three.MathUtils.clamp(1 - len / 5, 0, 1));
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
        _optionalChain([app, 'access', _2 => _2.messageDispatch, 'optionalAccess', _3 => _3.dispatch, 'call', _4 => _4(`Portal ${portalName} used ${Portal.count[eid]} times`)]);
      }
    } else {
      return;
    }
    obj.getWorldDirection(objWorldDir);
    const isFacing = objWorldDir.dot(portalPos.sub(avatarPOVPos)) < 0;
    if (isInside && isFacing) {
      if (!characterControllerSystem) {
        characterControllerSystem = app.getSystem(_hubs.SystemsE.CharacterControllerSystem);
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


var networkedPortalsQuery = _bitecs.defineQuery.call(void 0, [Portal, NetworkedPortal]);
function networkedPortalsSystem(app) {
  networkedPortalsQuery(app.world).forEach((eid) => {
    if (_bitecs.hasComponent.call(void 0, app.world, _hubs.Owned, eid)) {
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






var migrations = /* @__PURE__ */ new Map();
function apply(eid, { version, data }) {
  if (version !== 1)
    return false;
  const { color } = data;
  _hubs.write.call(void 0, NetworkedPortal.color, eid, color);
  return true;
}
var runtimeSerde = _hubs.defineNetworkSchema.call(void 0, NetworkedPortal);
var NetworkedPortalSchema = {
  componentName: "networked-portal",
  serialize: runtimeSerde.serialize,
  deserialize: runtimeSerde.deserialize,
  serializeForStorage: function serializeForStorage(eid) {
    return {
      version: 1,
      data: {
        color: _hubs.read.call(void 0, NetworkedPortal.color, eid)
      }
    };
  },
  deserializeFromStorage: _hubs.deserializerWithMigrations.call(void 0, migrations, apply)
};

// src/index.ts
function onReady(app) {
  loadSfx(app);
  loadPortalModel();
  registerInput(app);
}
_hubs.registerAddon.call(void 0, ADDON_ID, {
  name: "Portals Add-On",
  description: "Simple portals implementation.",
  onReady,
  prefab: { id: "portal", config: { permission: _hubs.PermissionE.SPAWN_AND_MOVE_MEDIA, template: PortalPrefab } },
  inflator: { jsx: { id: "portal", inflator: portalInflator } },
  system: [
    { system: portalsSystem, order: _hubs.SystemOrderE.PostPhysics },
    { system: networkedPortalsSystem, order: _hubs.SystemOrderE.PostPhysics }
  ],
  chatCommand: { id: "portal", command: portalChatCommand },
  networkSchema: { component: NetworkedPortal, schema: NetworkedPortalSchema }
});
//# sourceMappingURL=index.js.map