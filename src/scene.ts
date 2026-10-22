import { Color, Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

export const EYE_HEIGHT_M = 1.6;

export type Stage = {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  /** Everything that belongs to the worlds; moved down in seated mode. */
  readonly world: Group;
};

export const createStage = (host: HTMLElement): Stage => {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Every pixel runs a stylised shader; above 1.5× the cost grows faster than the visible gain.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#000000');
  const camera = new PerspectiveCamera(70, host.clientWidth / host.clientHeight, 0.03, 200);
  camera.position.set(0, EYE_HEIGHT_M, 0);
  scene.add(camera);

  const world = new Group();
  scene.add(world);

  const resize = () => {
    if (renderer.xr.isPresenting) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    // Portrait phones need a wider vertical field of view to show enough of the world.
    camera.fov = camera.aspect < 1 ? 85 : 70;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  };
  new ResizeObserver(resize).observe(host);

  return { renderer, scene, camera, world };
};
