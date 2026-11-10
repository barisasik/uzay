import * as THREE from 'three';

export type LoadTexture = (name: string, apply: (t: THREE.Texture) => void, isColor?: boolean) => void;

/** Tüm dokular tek LoadingManager'dan geçer; yükleme ekranı ilerlemeyi buradan alır. */
export function createTextureLoader(
  renderer: THREE.WebGLRenderer,
  onProgress: (fraction: number) => void,
  onDone: () => void,
): LoadTexture {
  const manager = new THREE.LoadingManager(onDone, (_url, loaded, total) => onProgress(loaded / total));
  manager.onError = (url) => console.warn('Doku yüklenemedi:', url);
  const loader = new THREE.TextureLoader(manager);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  return (name, apply, isColor = true) => {
    loader.load(`${import.meta.env.BASE_URL}textures/${name}.webp`, (t) => {
      if (isColor) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      apply(t);
    });
  };
}

/** Malzemeye dokuyu bağlar; yer tutucu rengi beyaza çeker. */
export function applyMap(mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial) {
  return (t: THREE.Texture) => {
    mat.map = t;
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
  };
}
