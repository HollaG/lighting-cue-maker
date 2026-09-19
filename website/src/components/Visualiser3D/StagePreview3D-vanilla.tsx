import { Flex, Box, AspectRatio, Button } from "@mantine/core";

import classes from "../Visualiser/Stage/2D/StagePreview2D.module.css";
import { useEffect, useRef, useState } from "react";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { useElementSize, useMergedRef, useResizeObserver } from "@mantine/hooks";

import CheckerTexture from "../../assets/checker.png";
import { Visualiser3DControls } from "./Visualiser3DControls";
import type { FixtureGroupConfiguration } from "../../types/types";
import type { Fixture } from "../../types/fixtures";

export const StagePreview3D = ({
  eventId,
  fixtures,
  fixtureGroups,
}: {
  eventId: string;
  fixtures: Fixture[];
  fixtureGroups: FixtureGroupConfiguration[];
}) => {
  const _canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: _canvasListenerRef, width, height } = useElementSize();

  const canvasRef = useMergedRef(_canvasRef, _canvasListenerRef);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // objects in scene
  const [objects, setObjects] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    const canvas = _canvasRef.current;

    if (!canvas) return;

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, canvas });

    const fov = 45;
    const aspect = 4 / 3; // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    cameraRef.current = camera;
    camera.position.set(0, 10, 20);

    const controls = new OrbitControls(camera, canvas);
    controlsRef.current = controls;
    controls.target.set(0, 5, 0);
    controls.update();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });

    // render plane
    const planeSize = 40;

    const loader = new THREE.TextureLoader();
    const texture = loader.load(CheckerTexture);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.receiveShadow = true;
    mesh.rotation.x = Math.PI * -0.5;
    scene.add(mesh);

    // Add a cube and some random shit
    {
      const cubeSize = 4;
      const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const cubeMat = new THREE.MeshPhongMaterial({ color: "#8AC" });
      const mesh = new THREE.Mesh(cubeGeo, cubeMat);
      mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    {
      const sphereRadius = 3;
      const sphereWidthDivisions = 32;
      const sphereHeightDivisions = 16;
      const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivisions, sphereHeightDivisions);
      const sphereMat = new THREE.MeshPhongMaterial({ color: "#CA8" });
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // Add lights
    // const color = 0xffffff;
    // const skyColor = 0xb1e1ff; // light blue
    // const groundColor = 0xb97a20; // brownish orange
    // const intensity = 1;
    // const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
    // scene.add(light);

    const color = 0xffffff;
    const intensity = 150;
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(0, 10, 0);
    light.penumbra = 1;
    light.angle = Math.PI / 12; // 15 degrees
    light.castShadow = true;
    scene.add(light);
    scene.add(light.target);

    const helper = new THREE.SpotLightHelper(light);
    scene.add(helper);

    // Render cycle
    rendererRef.current.shadowMap.enabled = true;

    rendererRef.current?.render(scene, camera);

    // for re-render when the orbit changes
    controls.addEventListener("change", render);
    window.addEventListener("resize", render); // incase of resize
    render();
  }, [_canvasRef]);
  function render() {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current?.render(sceneRef.current, cameraRef.current);
  }

  useEffect(() => {
    if (!width || !height || !rendererRef.current || !_canvasRef.current) return;

    const renderer = rendererRef.current;

    renderer?.setSize(width, height, false);
    render();
  }, [rendererRef, _canvasRef, width, height]);

  const onAddObject = (x: number, y: number, object: THREE.Object3D) => {
    object.position.set(x * 15, y * 15, 0);

    setObjects((prev) => [...prev, object]);
    sceneRef.current?.add(object);
  };

  function createMaterial() {
    const material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
    });

    const hue = Math.random();
    const saturation = 1;
    const luminance = 0.5;
    material.color.setHSL(hue, saturation, luminance);

    return material;
  }

  const addSolidGeometry = (x: number, y: number, geometry: THREE.BufferGeometry) => {
    const material = createMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    onAddObject(x, y, mesh);
  };

  return (
    <Flex className={classes["preview-container"]}>
      <Button onClick={() => addSolidGeometry(-2, -2, new THREE.BoxGeometry(8, 8, 8))}>add geometry</Button>
      <Box style={{ width: "100%", maxWidth: "calc(95vh * 4/3)", minWidth: 0 }}>
        <AspectRatio ratio={4 / 3}>
          <canvas
            style={{
              display: "block",
            }}
            ref={canvasRef}
            id="c"
          >
            {" "}
          </canvas>
        </AspectRatio>
      </Box>

      <Box className={classes["preview-controls"]}>
        <Visualiser3DControls fixtureGroups={fixtureGroups} eventId={eventId} />
      </Box>
    </Flex>
  );
};
