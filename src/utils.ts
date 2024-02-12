import { App, EntityID, JobRunner, Value, animate, crNextFrame, elasticOut } from "hubs";
import { Vector3 } from "three";

export const animationJobs = new JobRunner();

export function* animatePortal(app: App, eid: EntityID) {
  const obj = app.world.eid2obj.get(eid)!;
  const onAnimate = (values: Value[]) => {
    const scale = values[0] as Vector3;
    obj.scale.copy(scale);
    obj.matrixNeedsUpdate = true;
  };
  const scalar = 0.001;
  const startScale = new Vector3().copy(obj.scale).multiplyScalar(scalar);
  const endScale = new Vector3().copy(obj.scale);
  onAnimate([startScale]);
  yield crNextFrame();
  yield* animate({
    properties: [[startScale, endScale]],
    durationMS: 1000,
    easing: elasticOut,
    fn: onAnimate
  });
}
