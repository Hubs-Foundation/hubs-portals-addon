import { defineQuery, enterQuery, exitQuery } from "bitecs";
import {
  App,
  SystemsE,
  CharacterControllerSystem,
  anyEntityWith,
  AvatarPOVNode,
  Layers,
  Networked,
  EntityID,
  deleteTheDeletableAncestor,
  findChildWithComponent,
  GLTFModel,
  updateMaterials,
  SoundEffectsSystem,
  SoundDefT
} from "hubs";
import {
  Vector3,
  Matrix4,
  Mesh,
  ShaderMaterial,
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
  Object3D,
  MathUtils,
  Material,
  MeshStandardMaterial
} from "three";
import { Portal } from "./components";
import { PORTAL_FLAGS } from "./portal-inflator";
import PORTAL_SFX_URL from "./assets/portal.mp3";
import { animationJobs } from "./utils";
import { checkInput } from "./input";

const AABBs = new Map();
const renderTargets = new Map();
const helpers = new Map();
const cameras = new Map();
const tmpMat = new Matrix4();
const targetMat = new Matrix4().identity();
const portalPos = new Vector3();
const avatarPOVPos = new Vector3();
const objWorldDir = new Vector3();
const AABBOffset = new Vector3(0, 0.2, 0);
let characterControllerSystem: CharacterControllerSystem;

export const PORTAL_RENDER_WIDTH = 512;
export const PORTAL_RENDER_HEIGHT = 512;
const RADIUS = 0.75;

const sounds = new Map();
export function loadSfx(app: App) {
  [PORTAL_SFX_URL].forEach(url => {
    const sfxSystem = app.getSystem(SystemsE.SoundEffectsSystem) as SoundEffectsSystem;
    sfxSystem.registerSound(url).then((sound: SoundDefT) => {
      sounds.set(sound.url, sound.id);
    });
  });
}

function playPortalSfx(app: App) {
  app.getSystem(SystemsE.SoundEffectsSystem).playSoundOneShot(sounds.get(PORTAL_SFX_URL));
}

function updateRenderTarget(app: App, portals: number[], source: number, target: number) {
  const obj = <Mesh>app.world.eid2obj.get(source)!;
  const shader = obj.material as ShaderMaterial;
  shader.uniforms.iTime.value = app.world.time.elapsed / 1000;
  shader.uniformsNeedUpdate = true;

  if (!target) return;

  const scene = app.world.scene;
  const renderer = app.scene.renderer;

  const tmpVRFlag = renderer.xr.enabled;
  renderer.xr.enabled = false;

  // TODO we are doing this because aframe uses this hook for tock.
  // Namely to capture what camera was rendering. We don't actually use that in any of our tocks.
  // Also tock can likely go away as a concept since we can just direclty order things after render in raf if we want to.
  const tmpOnAfterRender = scene.onAfterRender;
  scene.onAfterRender = () => {};

  // TODO this assumption is now not true since we are not running after render. We should probably just permanently turn off autoUpdate and run matrix updates at a point we want to.
  // The entire scene graph matrices should already be updated
  // in tick(). They don't need to be recomputed again in tock().
  const tmpAutoUpdate = scene.autoUpdate;
  scene.autoUpdate = false;

  const renderTarget = renderTargets.get(source);
  renderTarget.needsUpdate = false;
  renderTarget.lastUpdated = app.world.time.elapsed;

  const tmpRenderTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(renderTarget);
  renderer.clearDepth();
  portals.forEach(p => {
    if (p === target) {
      const obj = app.world.eid2obj.get(p);
      if (obj) obj.visible = false;
    }
  });
  renderer.render(scene, cameras.get(target));
  portals.forEach(p => {
    if (p === target) {
      const obj = app.world.eid2obj.get(p);
      if (obj) obj.visible = true;
    }
  });
  renderer.setRenderTarget(tmpRenderTarget);

  renderer.xr.enabled = tmpVRFlag;
  scene.onAfterRender = tmpOnAfterRender;
  scene.autoUpdate = tmpAutoUpdate;
}

function disposePortal(app: App, eid: EntityID) {
  if (Portal.flags[eid] & PORTAL_FLAGS.DEBUG) {
    const helper = helpers.get(eid) as Object3D;
    helper.removeFromParent();
    helpers.delete(eid);
  }

  AABBs.delete(eid);

  const renderTarget = renderTargets.get(eid);
  renderTarget.dispose();
  renderTargets.delete(eid);

  cameras.delete(eid);
}

export function updatePortalColor(app: App, eid: EntityID) {
  const obj = <Mesh>app.world.eid2obj.get(eid)!;
  const shaderMat = obj.material as ShaderMaterial;
  shaderMat.needsUpdate = true;
  shaderMat.uniforms.iPortalColor.value.set(Portal.color[eid]);

  const modelEid = findChildWithComponent(app.world, GLTFModel, eid)!;
  const model = app.world.eid2obj.get(modelEid)!;
  model.traverse((object: Object3D) => {
    updateMaterials(object, (material: Material) => {
      (material as MeshStandardMaterial).color.set(Portal.color[eid]);
      (material as MeshStandardMaterial).emissive.set(Portal.color[eid]);
      return material;
    });
  });
}

const portalsQuery = defineQuery([Portal]);
const portalsEnterQuery = enterQuery(portalsQuery);
const portalsExitQuery = exitQuery(portalsQuery);
export function portalsSystem(app: App) {
  portalsEnterQuery(app.world).forEach(eid => {
    const obj = <Mesh>app.world.eid2obj.get(eid)!;
    obj.updateMatrixWorld(true);
    const AABB = new Sphere(AABBOffset.clone(), RADIUS);
    AABB.applyMatrix4(obj.matrixWorld);
    AABBs.set(eid, AABB);
    if (Portal.flags[eid] & PORTAL_FLAGS.DEBUG) {
      var geometry = new SphereBufferGeometry(RADIUS, 6, 6);
      var material = new MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true
      });
      var helper = new Mesh(geometry, material);
      helper.position.copy(AABBOffset);
      helpers.set(eid, helper);
      obj.add(helper);

      const axesHelper = new AxesHelper(1);
      obj.add(axesHelper);
    }

    // Link this portal to the last one
    const portals = portalsQuery(app.world);
    if (portals.length % 2 === 0) {
      const targetEid = portals.find((_value: number, index: number, _obj: number[]) => index === portals.length - 2);
      if (targetEid) {
        Portal.target[eid] = Networked.id[targetEid];
        Portal.target[targetEid] = Networked.id[eid];
      }
    }

    // Add cameras and render targets
    const camera = new PerspectiveCamera(80, PORTAL_RENDER_WIDTH / PORTAL_RENDER_HEIGHT, 0.1, 1000);
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

    const shaderMat = obj.material as ShaderMaterial;
    shaderMat.needsUpdate = true;

    // Only update the renderTarget when the screens are in view
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

    // Update portal model material color
    const modelEid = findChildWithComponent(app.world, GLTFModel, eid)!;
    const model = app.world.eid2obj.get(modelEid)!;
    model.traverse((object: Object3D) => {
      updateMaterials(object, (material: Material) => {
        material = material.clone();
        material.name = `${app.getString(Portal.name[eid])} Material`;
        (material as MeshStandardMaterial).color.set(color);
        (material as MeshStandardMaterial).emissive.set(color);
        (material as MeshStandardMaterial).emissiveIntensity = 0.5;
        return material;
      });
    });

    playPortalSfx(app);
  });

  portalsExitQuery(app.world).forEach(eid => {
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
  const portals = portalsQuery(app.world);
  portals.forEach(eid => {
    const obj = app.world.eid2obj.get(eid)!;
    obj.updateMatrixWorld(true);
    const AABB = AABBs.get(eid);
    AABB.center.copy(AABBOffset);
    AABB.radius = RADIUS;
    AABB.applyMatrix4(obj.matrixWorld);

    const targetNid = Portal.target[eid];
    const targetEid = app.world.nid2eid.get(targetNid);
    const targetPortal = portals.find(otherPortal => otherPortal !== eid && targetEid === otherPortal)!;

    updateRenderTarget(app, portals, eid, targetPortal);

    if (!updateState || !targetPortal) {
      return;
    }

    const targetObj = app.world.eid2obj.get(targetPortal)!;
    const avatarPOVEid = anyEntityWith(app.world, AvatarPOVNode);
    const avatarPOV = app.world.eid2obj.get(avatarPOVEid)!;
    avatarPOV.getWorldPosition(avatarPOVPos);

    obj.getWorldPosition(portalPos);
    const len = portalPos.clone().sub(avatarPOVPos).lengthSq();
    const targetCamera = cameras.get(targetPortal) as PerspectiveCamera;
    targetCamera.fov = MathUtils.lerp(80, 120, MathUtils.clamp(1 - len / 5, 0, 1));
    targetCamera.updateProjectionMatrix();

    // Update in/out state
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
        characterControllerSystem = app.getSystem(SystemsE.CharacterControllerSystem) as CharacterControllerSystem;
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
