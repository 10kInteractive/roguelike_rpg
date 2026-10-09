import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene } from "three";
import { WebGPURenderer } from "three/webgpu";

export type RendererBackend = "WebGPU" | "WebGL2";

function backendOf(renderer: WebGPURenderer): RendererBackend {
  const backend = renderer.backend;
  if ("isWebGPUBackend" in backend && backend.isWebGPUBackend === true) {
    return "WebGPU";
  }
  return "WebGL2";
}

export async function mountRenderer(parent: HTMLElement): Promise<RendererBackend> {
  const canvas = document.createElement("canvas");
  parent.replaceChildren(canvas);

  const forceWebGL = new URLSearchParams(window.location.search).has("webgl");
  const renderer = new WebGPURenderer({ canvas, antialias: true, forceWebGL });
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 10);
  camera.position.z = 2.5;

  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xc4a35a }));
  scene.add(mesh);

  try {
    await renderer.init();
  } catch (error) {
    console.error("[view] renderer failed", error);
    throw error;
  }

  const backend = backendOf(renderer);
  console.log(`[view] renderer backend: ${backend}`);

  const resize = () => {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(parent);

  renderer.setClearColor(0x1d3a2a);
  await renderer.setAnimationLoop((time) => {
    mesh.rotation.y = time * 0.001;
    renderer.render(scene, camera);
  });

  return backend;
}
