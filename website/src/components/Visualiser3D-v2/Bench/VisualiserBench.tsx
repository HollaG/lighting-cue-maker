/**
 * The visualiser bench (optimization plan, step 1): fixed test scenes plus a live readout and a recorder.
 * Open /dev/visualiser-bench. For real numbers use a production build (`npm run build && npm run preview`).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AspectRatio,
  Box,
  Button,
  Group,
  LoadingOverlay,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { CameraControls } from "@react-three/drei";
import classes from "../../Visualiser/Stage/2D/StagePreview2D.module.css";
import { StagePreview3D } from "../Stage3D/StagePreview3D";
import { configureVisualiser3DRenderer, makeVisualiser3DRenderer } from "../visualiser3DRenderer";
import { ResolutionScaleSelect, useVisualiserDpr } from "../ResolutionScaleSelect";
import type { PatternEffectPlayback } from "../PatternEffectRunner";
import { compilePatternPlayer } from "../../../effects/pattern/patternPlayer";
import {
  BenchCommitCounter,
  BenchProbe,
  describeCollector,
  describeSceneLoad,
  markSceneStart,
  recordEffectUpdate,
  startCollector,
  stopCollector,
} from "./benchProbe";
import {
  BENCH_CAMERA,
  BENCH_OBJECTS,
  BENCH_TEMPLATES,
  HEADS_PER_BAR,
  LED_HEAD_COUNTS,
  SPOT_COUNTS,
  getBenchDmx,
  getBenchFixtures,
  getBenchPatterns,
  type BenchEffect,
  type BenchSceneConfig,
} from "./benchScene";

/** One renderer factory per combination, made once so R3F sees a stable `gl` prop. */
const benchRenderers = new Map<string, ReturnType<typeof makeVisualiser3DRenderer>>();
const getBenchRenderer = ({ msaa, lighting }: BenchSceneConfig) => {
  const key = `${msaa}-${lighting}`;
  let renderer = benchRenderers.get(key);
  if (!renderer) {
    renderer = makeVisualiser3DRenderer({
      trackTimestamp: true,
      lightTable: lighting === "table",
      ...(msaa ? {} : { antialias: false }),
    });
    benchRenderers.set(key, renderer);
  }
  return renderer;
};
const RECORD_SECONDS = 10;
const LIVE_WINDOW_MS = 1000;
/** One full camera turn takes this long. */
const ORBIT_SECONDS = 12;

export const VisualiserBench = () => {
  const [config, setConfig] = useState<BenchSceneConfig>({
    spots: 8,
    ledHeads: 0,
    mode: "editor",
    msaa: true,
    lighting: "table",
  });
  const [haze, setHaze] = useState(0.5);
  const [ambientLight, setAmbientLight] = useState(0.5);
  const [effect, setEffect] = useState<BenchEffect>("static");
  const [orbit, setOrbit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dpr = useVisualiserDpr();

  const fixtures = useMemo(() => getBenchFixtures(config), [config]);
  const environment = useMemo(() => ({ haze, ambientLight }), [haze, ambientLight]);

  // Effects run the way the event page runs them: compiled once, played inside the canvas.
  const dmxValuesByFixtureId = useMemo(() => getBenchDmx(fixtures), [fixtures]);
  const effectPlayback = useMemo((): PatternEffectPlayback | null => {
    const patterns = getBenchPatterns(fixtures, effect);
    if (patterns.length === 0) return null;
    const player = compilePatternPlayer({
      base: dmxValuesByFixtureId,
      patterns,
      fixtures,
      fixtureTemplates: BENCH_TEMPLATES,
    });
    // Count the frames that produced new values, for the report.
    const evaluate = player.evaluate;
    player.evaluate = (timeMs) => {
      const changed = evaluate(timeMs);
      if (changed) recordEffectUpdate();
      return changed;
    };
    return { player, startedAt: performance.now() };
  }, [fixtures, effect, dmxValuesByFixtureId]);

  const controls = useRef<CameraControls | null>(null);
  const cameraRef = useCallback((node: CameraControls | null) => {
    controls.current = node;
    if (!node) return;
    const [x, y, z] = BENCH_CAMERA.position;
    const [tx, ty, tz] = BENCH_CAMERA.target;
    node.setLookAt(x, y, z, tx, ty, tz, false);
  }, []);

  // A fresh canvas (and renderer) per scene, so each scene starts with no compiled shaders.
  const sceneKey = `${config.spots}-${config.ledHeads}-${config.mode}-${config.msaa}-${config.lighting}`;
  useEffect(() => markSceneStart(), [sceneKey]);
  const shadowText =
    config.lighting === "table"
      ? `light table, ${config.spots} shadowed spots`
      : config.mode === "editor"
        ? `three.js lights, ${Math.min(8, config.spots)} shadowed spots`
        : `three.js lights, ${Math.min(8, config.spots)} shadowed spots`;
  const sceneLine =
    `Scene: ${config.spots} spots, ${config.ledHeads} LED heads (${Math.ceil(config.ledHeads / HEADS_PER_BAR)} bars), ` +
    `${config.mode} mode, ${shadowText}, MSAA ${config.msaa ? "on" : "off"}, haze ${haze}, ambient ${ambientLight}, effect ${effect}, camera ${orbit ? "orbiting" : "still"}`;

  return (
    <Stack p="md" gap="sm" maw={1600} mx="auto">
      <Group justify="space-between">
        <Title order={3}>Visualiser bench</Title>
        <Text size="xs" c="dimmed">
          Build: {import.meta.env.MODE}. Use a production build for real numbers.
        </Text>
      </Group>

      <Group align="flex-end" gap="lg">
        <LabelledControl label="Spots">
          <SegmentedControl
            size="xs"
            data={SPOT_COUNTS.map(String)}
            value={String(config.spots)}
            onChange={(value) => setConfig({ ...config, spots: Number(value) })}
          />
        </LabelledControl>
        <LabelledControl label="LED heads">
          <SegmentedControl
            size="xs"
            data={LED_HEAD_COUNTS.map(String)}
            value={String(config.ledHeads)}
            onChange={(value) => setConfig({ ...config, ledHeads: Number(value) })}
          />
        </LabelledControl>
        <LabelledControl label="Mode">
          <SegmentedControl
            size="xs"
            data={[
              { value: "editor", label: "Editor (8 shadows)" },
              { value: "viewer", label: "Viewer (8 shadows)" },
            ]}
            value={config.mode}
            onChange={(value) => setConfig({ ...config, mode: value as BenchSceneConfig["mode"] })}
          />
        </LabelledControl>
        <LabelledControl label="Lighting">
          <SegmentedControl
            size="xs"
            data={[
              { value: "table", label: "Light table" },
              { value: "three", label: "three.js lights (old)" },
            ]}
            value={config.lighting}
            onChange={(value) => setConfig({ ...config, lighting: value as BenchSceneConfig["lighting"] })}
          />
        </LabelledControl>
        <LabelledControl label="MSAA (solid pass)">
          <SegmentedControl
            size="xs"
            data={[
              { value: "on", label: "4×" },
              { value: "off", label: "Off" },
            ]}
            value={config.msaa ? "on" : "off"}
            onChange={(value) => setConfig({ ...config, msaa: value === "on" })}
          />
        </LabelledControl>
        <LabelledControl label="Effect">
          <SegmentedControl
            size="xs"
            data={["static", "chase", "fade"]}
            value={effect}
            onChange={(value) => setEffect(value as BenchEffect)}
          />
        </LabelledControl>
        <ResolutionScaleSelect />
      </Group>

      <Group align="center" gap="lg">
        <LabelledControl label={`Haze ${haze}`}>
          <Slider w="8rem" min={0} max={1} step={0.05} value={haze} onChange={setHaze} />
        </LabelledControl>
        <LabelledControl label={`Ambient ${ambientLight}`}>
          <Slider w="8rem" min={0} max={1} step={0.05} value={ambientLight} onChange={setAmbientLight} />
        </LabelledControl>
        <Switch
          label={`Orbit camera (${ORBIT_SECONDS} s per turn)`}
          checked={orbit}
          onChange={(event) => setOrbit(event.currentTarget.checked)}
        />
        <Button size="xs" variant="default" onClick={() => cameraRef(controls.current)}>
          Reset camera
        </Button>
      </Group>

      {config.ledHeads >= 256 && config.lighting === "three" && (
        <Alert color="yellow" p="xs">
          Every LED head is its own area light today. {config.ledHeads} heads may take a long time to compile, or fail.
          That result is worth recording too.
        </Alert>
      )}

      <Box style={{ width: "100%", maxWidth: "calc(75vh * 16 / 9)" }}>
        <AspectRatio ratio={16 / 9}>
          <Box className={classes["preview-viewer"]} style={{ position: "relative", width: "100%", height: "100%" }}>
            <Suspense fallback={<LoadingOverlay visible loaderProps={{ type: "bars" }} />}>
              <Canvas
                key={sceneKey}
                gl={getBenchRenderer(config)}
                frameloop="demand"
                onCreated={configureVisualiser3DRenderer}
                dpr={dpr}
                shadows="percentage"
                camera={{ position: BENCH_CAMERA.position, fov: BENCH_CAMERA.fov, near: 0.1, far: 100 }}
              >
                <BenchProbe />
                <BenchOrbit controls={controls} enabled={orbit} />
                <BenchCommitCounter value={dmxValuesByFixtureId} />
                <StagePreview3D
                    eventId="bench"
                    isViewOnly={config.mode === "viewer"}
                    environment={environment}
                    fixtures={fixtures}
                    fixtureTemplates={BENCH_TEMPLATES}
                    stageElements={BENCH_OBJECTS}
                    selectedObjectIds={selectedIds}
                    onObjectSelect={(id) => setSelectedIds((prev) => (prev[0] === id ? [] : [id]))}
                    cameraRef={cameraRef}
                    updateStageElement={() => {}}
                    gui={null}
                    dmxValuesByFixtureId={dmxValuesByFixtureId}
                    effectPlayback={effectPlayback}
                    saveFixturePlacements={false}
                  />
              </Canvas>
            </Suspense>
            <LiveReadout />
          </Box>
        </AspectRatio>
      </Box>

      <Text size="xs" c="dimmed">
        Click a fixture to select it (tests the selection outline). Changing spots, LED heads or mode starts a fresh
        canvas. For a first-sweep vs repeat-sweep comparison: pick the scene, start recording, turn on orbit, and record
        again once a full turn has passed.
      </Text>

      <Recorder sceneLine={sceneLine} />
    </Stack>
  );
};

const LabelledControl = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack gap={4}>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    {children}
  </Stack>
);

/** Turns the camera around its target at a fixed rate, so camera runs repeat exactly. */
const BenchOrbit = ({
  controls,
  enabled,
}: {
  controls: React.RefObject<CameraControls | null>;
  enabled: boolean;
}) => {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (enabled) invalidate(); // start the demand loop
  }, [enabled, invalidate]);
  useFrame((_, delta) => {
    const node = controls.current;
    if (!enabled || !node) return;
    node.rotateTo(node.azimuthAngle + (delta * 2 * Math.PI) / ORBIT_SECONDS, node.polarAngle, false);
    invalidate();
  });
  return null;
};

/** The last second's numbers, over the canvas. Re-renders only itself. */
const LiveReadout = () => {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    let collector = startCollector();
    const timer = window.setInterval(() => {
      stopCollector(collector);
      setLines([describeSceneLoad(), ...describeCollector(collector)]);
      collector = startCollector();
    }, LIVE_WINDOW_MS);
    return () => {
      window.clearInterval(timer);
      stopCollector(collector);
    };
  }, []);
  return (
    <Box
      component="pre"
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        margin: 0,
        padding: "6px 8px",
        maxWidth: "calc(100% - 16px)",
        overflow: "hidden",
        fontSize: 11,
        lineHeight: 1.35,
        color: "#e8e8e8",
        background: "rgba(0, 0, 0, 0.6)",
        borderRadius: 4,
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
      }}
    >
      {lines.join("\n") || "Measuring…"}
    </Box>
  );
};

/** Records a fixed-length run and appends a copyable report. */
const Recorder = ({ sceneLine }: { sceneLine: string }) => {
  const [reports, setReports] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const gpuName = useGpuName();
  const dpr = useVisualiserDpr();
  // The scene line when recording started; changing the scene mid-run would make the report wrong.
  const sceneAtStart = useRef(sceneLine);
  const latestScene = useRef(sceneLine);
  useEffect(() => {
    latestScene.current = sceneLine;
  }, [sceneLine]);

  const record = () => {
    sceneAtStart.current = sceneLine;
    const collector = startCollector();
    const endsAt = performance.now() + RECORD_SECONDS * 1000;
    setRemaining(RECORD_SECONDS);
    const timer = window.setInterval(() => {
      const left = Math.ceil((endsAt - performance.now()) / 1000);
      if (left > 0) {
        setRemaining(left);
        return;
      }
      window.clearInterval(timer);
      stopCollector(collector);
      setRemaining(null);
      const changed = sceneAtStart.current !== latestScene.current ? " (scene changed during the run)" : "";
      const report = [
        `--- ${new Date().toISOString()}${changed}`,
        sceneAtStart.current,
        `Resolution scale ${(dpr / window.devicePixelRatio).toFixed(3)} × devicePixelRatio ${window.devicePixelRatio}`,
        `GPU: ${gpuName}`,
        `Browser: ${navigator.userAgent}`,
        `Build: ${import.meta.env.MODE}`,
        describeSceneLoad(),
        ...describeCollector(collector),
      ].join("\n");
      setReports((prev) => [...prev, report]);
    }, 250);
  };

  const text = reports.join("\n\n");
  return (
    <Stack gap="xs">
      <Group>
        <Button size="xs" onClick={record} disabled={remaining !== null}>
          {remaining !== null ? `Recording… ${remaining} s` : `Record ${RECORD_SECONDS} s`}
        </Button>
        <Button
          size="xs"
          variant="default"
          disabled={reports.length === 0}
          onClick={() => void navigator.clipboard.writeText(text)}
        >
          Copy all reports
        </Button>
        <Button size="xs" variant="subtle" color="red" disabled={reports.length === 0} onClick={() => setReports([])}>
          Clear
        </Button>
        <Text size="xs" c="dimmed">
          Note GPU % from Task Manager during the run and add it to the report.
        </Text>
      </Group>
      {reports.length > 0 && <Textarea readOnly autosize minRows={4} maxRows={30} value={text} ff="monospace" />}
    </Stack>
  );
};

const useGpuName = () => {
  const [name, setName] = useState("unknown");
  useEffect(() => {
    navigator.gpu
      ?.requestAdapter()
      .then((adapter) => {
        const info = adapter?.info;
        if (info) setName([info.vendor, info.architecture, info.description].filter(Boolean).join(" ") || "unknown");
      })
      .catch(() => {});
  }, []);
  return name;
};
