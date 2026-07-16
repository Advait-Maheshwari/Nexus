import { Billboard, Float, Line, OrbitControls, Stars, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { FeaturePlanet, ProjectRelationship, ProjectSummary, WorkStatus } from "@/types/domain";

const statusColor: Record<WorkStatus, string> = {
  backlog: "#94a3b8",
  ready: "#48e5ff",
  in_progress: "#4f8cff",
  blocked: "#fb7185",
  done: "#4ade80",
  archived: "#64748b"
};

const relationshipColor: Record<ProjectRelationship["type"], string> = {
  dependency: "#fb7185",
  "shared-ai": "#8d67ff",
  "shared-deadline": "#f5c451",
  inspiration: "#48e5ff"
};

function ProjectStar({
  project,
  index,
  selected,
  focusMode,
  selectedPlanetId,
  onSelect,
  onSelectPlanet
}: {
  project: ProjectSummary;
  index: number;
  selected: boolean;
  focusMode: boolean;
  selectedPlanetId?: string;
  onSelect?: (projectId: string) => void;
  onSelectPlanet?: (projectId: string, planetId: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Sprite>(null);
  const color = new THREE.Color(project.accent);
  const coronaTexture = useMemo(() => createStarCoronaTexture(project.accent), [project.accent]);

  useEffect(() => () => coronaTexture.dispose(), [coronaTexture]);

  useFrame(({ clock, camera }) => {
    const elapsed = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = elapsed * (0.12 + index * 0.03);
      group.current.position.y = project.coordinates[1] + Math.sin(elapsed + index) * 0.08;
      const distanceScale = THREE.MathUtils.clamp(
        camera.position.distanceTo(group.current.position) / 3.9,
        1,
        1.72
      );
      const focusScale = selected ? 1.14 : focusMode ? 0.48 : 0.34;
      group.current.scale.setScalar(focusScale * Math.min(distanceScale, focusMode ? 1.26 : 1.08));
    }
    if (orbit.current) {
      orbit.current.rotation.y = elapsed * (0.35 + index * 0.08);
    }
    if (pulse.current) {
      const baseScale = selected ? 0.62 : focusMode ? 0.32 : 0.22;
      const scale = baseScale * (1 + Math.sin(elapsed * 1.8 + index) * 0.06);
      pulse.current.scale.set(scale, scale, 1);
    }
  });

  const planets = useMemo(
    () =>
      project.planets.map((planet, planetIndex) => {
        const angle = (planetIndex / project.planets.length) * Math.PI * 2;
        const radiusMultiplier = selected ? 2.08 : focusMode ? 1.5 : 1;
        const radius = planet.orbitRadius * radiusMultiplier;
        const progressScale = 0.078 + planet.progress / 1600 + Math.min(planet.taskCount, 18) / 2200;
        const completedTaskCount = Math.round(planet.taskCount * (planet.progress / 100));
        const openTaskCount = Math.max(0, planet.taskCount - completedTaskCount - planet.blockedTaskCount);
        return {
          ...planet,
          angle,
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle * 1.7) * 0.18,
            Math.sin(angle) * radius
          ] as [number, number, number],
          orbitRadius: radius,
          size: progressScale,
          color: planet.blockedTaskCount > 0 ? "#fb7185" : statusColor[planet.status],
          completedTaskCount,
          openTaskCount,
          signalLabel: buildPlanetSignal(planet.progress, planet.blockedTaskCount)
        };
      }),
    [focusMode, project.planets, selected]
  );

  return (
    <group
      ref={group}
      position={project.coordinates}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(project.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <Float speed={1.1 + index * 0.2} rotationIntensity={0.22} floatIntensity={0.16}>
        <mesh>
          <icosahedronGeometry args={[0.1 + project.progress / 1600, 4]} />
          <meshBasicMaterial
            color="#ffffff"
          />
        </mesh>
        <mesh scale={1.24}>
          <icosahedronGeometry args={[0.1 + project.progress / 1600, 3]} />
          <meshBasicMaterial
            color={project.accent}
            transparent
            opacity={selected ? 0.54 : 0.36}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <pointLight
          color={project.accent}
          intensity={selected ? 1.6 : 0.8}
          distance={2.2}
          decay={2}
        />
        <sprite ref={pulse}>
          <spriteMaterial
            map={coronaTexture}
            color={color}
            transparent
            opacity={selected ? 0.76 : 0.48}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[selected ? 0.3 : 0.23, selected ? 0.005 : 0.0025, 16, 128]} />
          <meshBasicMaterial
            color={selected ? "#ffffff" : project.accent}
            transparent
            opacity={selected ? 0.9 : 0.42}
          />
        </mesh>
        <SolarFlares accent={project.accent} selected={selected} healthScore={project.healthScore} />
        {planets.map((planet) => (
          <mesh key={`${project.id}-${planet.id}-orbit`} rotation={[Math.PI / 2.2, 0, 0]}>
            <torusGeometry args={[planet.orbitRadius, 0.0016, 8, 128]} />
            <meshBasicMaterial color={planet.color} transparent opacity={0.14} />
          </mesh>
        ))}
        <group ref={orbit}>
          {planets.map((planet) => (
            <FeaturePlanetMesh
              key={`${project.id}-${planet.id}`}
              planet={planet}
              systemSelected={selected}
              overview={!focusMode}
              selected={selected && selectedPlanetId === planet.id}
              onSelect={() => onSelectPlanet?.(project.id, planet.id)}
            />
          ))}
        </group>
        <Billboard position={[0, -0.42, 0]}>
          <Text
            fontSize={selected ? 0.07 : focusMode ? 0.052 : 0.038}
            color="#dff8ff"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.2}
          >
            {project.codename}
          </Text>
          <Text
            position={[0, -0.11, 0]}
            fontSize={selected ? 0.04 : focusMode ? 0.03 : 0.022}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.2}
          >
            project star / {project.planets.length} feature planets
          </Text>
        </Billboard>
      </Float>
    </group>
  );
}

function SolarFlares({
  accent,
  selected,
  healthScore
}: {
  accent: string;
  selected: boolean;
  healthScore: number;
}) {
  const group = useRef<THREE.Group>(null);
  const flareCount = healthScore > 80 ? 12 : healthScore > 65 ? 8 : 5;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = clock.getElapsedTime() * (selected ? 0.42 : 0.24);
    group.current.scale.setScalar(selected ? 1.08 + Math.sin(clock.getElapsedTime() * 1.8) * 0.04 : 0.9);
  });

  return (
    <group ref={group}>
      {Array.from({ length: flareCount }, (_, index) => {
        const angle = (index / flareCount) * Math.PI * 2;
        const length = selected ? 0.34 : 0.22;
        const start: [number, number, number] = [
          Math.cos(angle) * 0.18,
          Math.sin(angle) * 0.18,
          0
        ];
        const end: [number, number, number] = [
          Math.cos(angle) * (0.18 + length),
          Math.sin(angle) * (0.18 + length),
          0
        ];
        return (
          <Line
            key={`flare-${index}`}
            points={[start, end]}
            color={healthScore < 65 ? "#fb7185" : accent}
            lineWidth={selected ? 1.4 : 0.8}
            transparent
            opacity={selected ? 0.55 : 0.22}
          />
        );
      })}
    </group>
  );
}

type SceneFeaturePlanet = FeaturePlanet & {
  angle: number;
  color: string;
  completedTaskCount: number;
  openTaskCount: number;
  position: [number, number, number];
  signalLabel: string;
  size: number;
};

function FeaturePlanetMesh({
  planet,
  selected,
  systemSelected,
  overview,
  onSelect
}: {
  planet: SceneFeaturePlanet;
  selected: boolean;
  systemSelected: boolean;
  overview: boolean;
  onSelect?: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(planet.color);
  const surfaceTexture = useMemo(
    () => createPlanetTexture(planet.color, Math.round(planet.angle * 10_000)),
    [planet.angle, planet.color]
  );
  const cloudTexture = useMemo(
    () => createCloudTexture(Math.round(planet.angle * 17_000)),
    [planet.angle]
  );
  const moonTexture = useMemo(() => createMoonTexture(Math.round(planet.angle * 20_000)), [planet.angle]);
  const satelliteCount = Math.min(6, Math.max(1, planet.taskCount));
  const moons = useMemo(
    () =>
      Array.from({ length: satelliteCount }, (_, index) => {
        const angle = (index / satelliteCount) * Math.PI * 2;
        const blocked = index < planet.blockedTaskCount;
        const completed = !blocked && index < planet.completedTaskCount;
        const kind = blocked ? "blocked" : completed ? "done" : "open";
        return {
          position: [
            Math.cos(angle) * planet.size * 3.65,
            Math.sin(angle * 2) * planet.size * 0.65,
            Math.sin(angle) * planet.size * 3.65
          ] as [number, number, number],
          color: blocked ? "#fb7185" : completed ? "#4ade80" : "#94a3b8",
          kind
        };
      }),
    [planet.blockedTaskCount, planet.completedTaskCount, planet.size, satelliteCount]
  );
  const visibleMoons = moons.slice(0, selected ? 6 : systemSelected ? 3 : overview ? 1 : 2);
  const hasRings = Math.round(planet.angle * 100) % 2 === 0;
  const showFullDetail = selected && systemSelected && !overview;
  const showSemanticLabel = systemSelected || selected;
  const showRiskMarker = !showFullDetail && planet.blockedTaskCount > 0;
  const progressAngle = (planet.progress / 100) * Math.PI * 2 + planet.angle;
  const progressMarkerPosition: [number, number, number] = [
    Math.cos(progressAngle) * planet.size * 2.26,
    0.006,
    Math.sin(progressAngle) * planet.size * 2.26
  ];

  useEffect(
    () => () => {
      cloudTexture.dispose();
      surfaceTexture.dispose();
      moonTexture.dispose();
    },
    [cloudTexture, moonTexture, surfaceTexture]
  );

  useFrame(({ clock, camera }) => {
    const elapsed = clock.getElapsedTime();
    if (group.current) {
      const worldPosition = new THREE.Vector3();
      group.current.getWorldPosition(worldPosition);
      const distanceScale = THREE.MathUtils.clamp(camera.position.distanceTo(worldPosition) / 5.2, 1, 1.55);
      const modeScale = selected ? 1 : systemSelected ? 0.78 : overview ? 0.62 : 0.72;
      group.current.scale.setScalar(modeScale * distanceScale);
    }
    if (mesh.current) {
      mesh.current.rotation.y = elapsed * 0.8 + planet.angle;
    }
    if (glow.current) {
      glow.current.scale.setScalar(1.35 + Math.sin(elapsed * 2 + planet.angle) * 0.12);
    }
    if (clouds.current) {
      clouds.current.rotation.y = elapsed * 0.34 + planet.angle * 0.5;
    }
  });

  return (
    <group
      ref={group}
      position={planet.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <mesh ref={mesh}>
        <sphereGeometry args={[planet.size, 48, 48]} />
        <meshStandardMaterial
          map={surfaceTexture}
          bumpMap={surfaceTexture}
          bumpScale={planet.size * 0.08}
          color="#ffffff"
          emissive={color}
          emissiveMap={surfaceTexture}
          emissiveIntensity={selected ? 0.72 : planet.blockedTaskCount > 0 ? 0.48 : 0.34}
          roughness={0.68}
          metalness={0.08}
        />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[planet.size * 1.025, 32, 32]} />
        <meshStandardMaterial
          map={cloudTexture}
          color="#ffffff"
          transparent
          opacity={selected ? 0.36 : 0.2}
          emissive="#dff8ff"
          emissiveIntensity={0.12}
          roughness={0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={glow}>
        <sphereGeometry args={[planet.size * 1.16, 32, 32]} />
        <meshBasicMaterial
          color={selected ? "#ffffff" : color}
          transparent
          opacity={selected ? 0.2 : 0.12}
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {showFullDetail ? (
        <>
          <PlanetMeridians size={planet.size} color={selected ? "#dff8ff" : planet.color} selected={selected} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[planet.size * 2.26, planet.size * 0.018, 10, 96]} />
            <meshBasicMaterial
              color={planet.blockedTaskCount > 0 ? "#fb7185" : "#4ade80"}
              transparent
              opacity={selected ? 0.48 : systemSelected ? 0.32 : 0.16}
              depthWrite={false}
            />
          </mesh>
          <mesh position={progressMarkerPosition}>
            <sphereGeometry args={[Math.max(0.012, planet.size * 0.16), 18, 18]} />
            <meshBasicMaterial
              color={planet.blockedTaskCount > 0 ? "#fb7185" : "#4ade80"}
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <PlanetStatusBeacon planet={planet} selected={selected} />
        </>
      ) : null}
      {hasRings ? (
        <mesh rotation={[Math.PI / 2.25, 0.18, 0]}>
          <ringGeometry args={[planet.size * 1.42, planet.size * 2.12, 72]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={selected ? 0.48 : 0.27}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {showRiskMarker ? (
        <mesh position={[planet.size * 2.6, 0.02, 0]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial color="#fb7185" />
        </mesh>
      ) : null}
      {showSemanticLabel ? (
        <>
          {showFullDetail ? (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[planet.size * 3.4, 0.0012, 8, 72]} />
              <meshBasicMaterial color="#dff8ff" transparent opacity={0.28} />
            </mesh>
          ) : null}
          <Billboard position={[0, planet.size * (selected ? 2.65 : 2.7), 0]}>
            <Text
              fontSize={selected ? Math.max(0.017, planet.size * 0.18) : Math.max(0.011, planet.size * 0.1)}
              color="#dff8ff"
              anchorX="center"
              anchorY="middle"
              maxWidth={0.42}
            >
              {planet.name.toUpperCase()}
            </Text>
            <Text
              position={[0, -Math.max(0.024, planet.size * 0.22), 0]}
              fontSize={selected ? Math.max(0.01, planet.size * 0.1) : Math.max(0.007, planet.size * 0.065)}
              color={planet.blockedTaskCount > 0 ? "#fecdd3" : "#94a3b8"}
              anchorX="center"
              anchorY="middle"
              maxWidth={0.52}
            >
              {selected
                ? `${planet.signalLabel} / ${planet.taskCount} task moons`
                : `feature / ${planet.progress}% / ${planet.taskCount} tasks`}
            </Text>
          </Billboard>
        </>
      ) : null}
      {!systemSelected ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[planet.size * 3.65, 0.001, 8, 72]} />
          <meshBasicMaterial color="#dff8ff" transparent opacity={0.12} />
        </mesh>
      ) : null}
      {visibleMoons.map((moon, index) => (
        <group key={`${planet.id}-moon-${index}`} position={moon.position}>
          <mesh>
            <sphereGeometry args={[Math.max(0.008, planet.size * (systemSelected ? 0.2 : overview ? 0.11 : 0.16)), 22, 22]} />
            <meshStandardMaterial
              map={moonTexture}
              color={moon.color}
              emissive={moon.color}
              emissiveIntensity={selected ? 0.34 : 0.2}
              roughness={0.94}
            />
          </mesh>
          {selected && index < 2 ? (
            <Billboard position={[0, planet.size * 0.42, 0]}>
              <Text
                fontSize={Math.max(0.006, planet.size * 0.05)}
                color={moon.color}
                anchorX="center"
                anchorY="middle"
                maxWidth={0.16}
              >
                {moon.kind}
              </Text>
            </Billboard>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function PlanetMeridians({
  size,
  color,
  selected
}: {
  size: number;
  color: string;
  selected: boolean;
}) {
  const opacity = selected ? 0.36 : 0.18;

  return (
    <>
      {[0, Math.PI / 3, (Math.PI / 3) * 2].map((rotation) => (
        <mesh key={`meridian-${rotation}`} rotation={[Math.PI / 2, rotation, 0]}>
          <torusGeometry args={[size * 1.035, size * 0.0045, 8, 72]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[size * 1.045, size * 0.0038, 8, 72]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={selected ? 0.18 : 0.09} depthWrite={false} />
      </mesh>
    </>
  );
}

function PlanetStatusBeacon({
  planet,
  selected
}: {
  planet: SceneFeaturePlanet;
  selected: boolean;
}) {
  const beaconColor = planet.blockedTaskCount > 0 ? "#fb7185" : planet.progress >= 70 ? "#4ade80" : planet.color;
  const height = planet.size * (planet.blockedTaskCount > 0 ? 1.5 : 1.08);

  return (
    <group position={[planet.size * 1.38, planet.size * 1.05, planet.size * 0.18]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[planet.size * 0.012, planet.size * 0.018, height, 10]} />
        <meshBasicMaterial color={beaconColor} transparent opacity={selected ? 0.72 : 0.44} />
      </mesh>
      <mesh position={[0, height + planet.size * 0.08, 0]}>
        <sphereGeometry args={[planet.size * 0.13, 18, 18]} />
        <meshBasicMaterial
          color={beaconColor}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Billboard position={[0, height + planet.size * 0.48, 0]}>
        <Text
          fontSize={Math.max(0.008, planet.size * 0.075)}
          color={beaconColor}
          anchorX="center"
          anchorY="middle"
          maxWidth={0.22}
        >
          {planet.progress}%
        </Text>
      </Billboard>
    </group>
  );
}

function ProjectLink({
  relationship,
  source,
  target
}: {
  relationship: ProjectRelationship;
  source: ProjectSummary;
  target: ProjectSummary;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const color = relationshipColor[relationship.type];
  const curvePoints = useMemo(() => {
    const sourcePoint = new THREE.Vector3(...source.coordinates);
    const targetPoint = new THREE.Vector3(...target.coordinates);
    const midpoint = sourcePoint.clone().lerp(targetPoint, 0.5);
    midpoint.y += 0.28 + relationship.strength * 0.36;
    const curve = new THREE.QuadraticBezierCurve3(sourcePoint, midpoint, targetPoint);
    return curve.getPoints(28);
  }, [relationship.strength, source.coordinates, target.coordinates]);
  const labelPoint = curvePoints[Math.floor(curvePoints.length / 2)].clone().add(new THREE.Vector3(0, 0.13, 0));

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const phase = (clock.getElapsedTime() * (0.16 + relationship.strength * 0.18)) % 1;
    const scaled = phase * (curvePoints.length - 1);
    const index = Math.floor(scaled);
    const nextIndex = Math.min(index + 1, curvePoints.length - 1);
    pulse.current.position.copy(curvePoints[index].clone().lerp(curvePoints[nextIndex], scaled - index));
    pulse.current.scale.setScalar(0.018 + relationship.strength * 0.03);
  });

  return (
    <group>
      <Line
        points={curvePoints}
        color={color}
        lineWidth={Math.max(1.25, relationship.strength * 3.4)}
        transparent
        opacity={0.34 + relationship.strength * 0.36}
      />
      <mesh ref={pulse}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.92} blending={THREE.AdditiveBlending} />
      </mesh>
      <Billboard position={labelPoint.toArray()}>
        <Text fontSize={0.016} color={color} anchorX="center" anchorY="middle" maxWidth={0.64}>
          {relationship.type.replace("-", " ")}
        </Text>
      </Billboard>
    </group>
  );
}

function ProjectLinks({
  projects,
  relationships
}: {
  projects: ProjectSummary[];
  relationships: ProjectRelationship[];
}) {
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  return (
    <>
      {relationships.map((relationship) => {
        const source = projectMap.get(relationship.sourceProjectId);
        const target = projectMap.get(relationship.targetProjectId);

        if (!source || !target) {
          return null;
        }

        return <ProjectLink key={relationship.id} relationship={relationship} source={source} target={target} />;
      })}
    </>
  );
}

export function GalaxyScene({
  projects,
  relationships = [],
  selectedProjectId,
  selectedPlanetId,
  onSelectProject,
  onSelectPlanet
}: {
  projects: ProjectSummary[];
  relationships?: ProjectRelationship[];
  selectedProjectId?: string;
  selectedPlanetId?: string;
  onSelectProject?: (projectId: string) => void;
  onSelectPlanet?: (projectId: string, planetId: string) => void;
}) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  return (
    <Canvas
      camera={{ position: [0, 0.8, 9.8], fov: 58 }}
      dpr={[1, 1.8]}
    >
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 32, 64]} />
      <ambientLight intensity={1.48} />
      <pointLight position={[2.2, 2.4, 2.8]} intensity={3.8} color="#48e5ff" />
      <pointLight position={[-2.8, -1.4, 2.2]} intensity={2.2} color="#8d67ff" />
      <directionalLight position={[0.4, 2.6, 3.2]} intensity={2.15} color="#eef9ff" />
      <Stars radius={80} depth={40} count={2600} factor={3.6} saturation={0.35} fade speed={0.38} />
      <ProjectLinks projects={projects} relationships={relationships} />
      {projects.map((project, index) => (
        <ProjectStar
          key={project.id}
          project={project}
          index={index}
          selected={project.id === selectedProjectId}
          focusMode={Boolean(selectedProjectId)}
          selectedPlanetId={selectedPlanetId}
          onSelect={onSelectProject}
          onSelectPlanet={onSelectPlanet}
        />
      ))}
      <OrbitControls
        enablePan
        enableZoom
        enableDamping
        dampingFactor={0.065}
        zoomSpeed={0.72}
        rotateSpeed={0.62}
        panSpeed={0.68}
        screenSpacePanning
        minDistance={3.8}
        maxDistance={24}
        target={
          selectedProject
            ? [
                selectedProject.coordinates[0],
                selectedProject.coordinates[1] - 0.22,
                selectedProject.coordinates[2]
              ]
            : [0, 0, 0]
        }
        autoRotate={!selectedProjectId}
        autoRotateSpeed={0.32}
        maxPolarAngle={Math.PI - 0.08}
        minPolarAngle={0.08}
      />
    </Canvas>
  );
}

function createPlanetTexture(colorValue: string, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const random = seededRandom(seed);
  const base = new THREE.Color(colorValue);
  context.fillStyle = `#${base.clone().multiplyScalar(0.3).getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 8) {
    const lightness = 0.45 + random() * 0.75;
    const band = base.clone().multiplyScalar(lightness);
    context.fillStyle = `#${band.getHexString()}`;
    context.globalAlpha = 0.45 + random() * 0.28;
    context.fillRect(0, y, canvas.width, 5 + random() * 7);
  }
  context.globalAlpha = 0.55;
  for (let index = 0; index < 42; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 2 + random() * 13;
    context.fillStyle = random() > 0.5 ? "#dff8ff" : "#02040a";
    context.beginPath();
    context.ellipse(x, y, radius * 1.8, radius * 0.55, random(), 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createMoonTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const random = seededRandom(seed);
  context.fillStyle = "#8a94a5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 32; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 1 + random() * 6;
    const crater = context.createRadialGradient(x, y, 0, x, y, radius);
    crater.addColorStop(0, "#354052");
    crater.addColorStop(0.7, "#667085");
    crater.addColorStop(1, "#aeb7c5");
    context.fillStyle = crater;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createCloudTexture(seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const random = seededRandom(seed);
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let bandIndex = 0; bandIndex < 12; bandIndex += 1) {
    const y = random() * canvas.height;
    const height = 5 + random() * 14;
    const gradient = context.createLinearGradient(0, y, canvas.width, y + height);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.18, "rgba(223,248,255,0.34)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.58)");
    gradient.addColorStop(0.82, "rgba(223,248,255,0.24)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.globalAlpha = 0.34 + random() * 0.32;
    context.beginPath();
    context.ellipse(
      canvas.width * (0.18 + random() * 0.64),
      y,
      canvas.width * (0.18 + random() * 0.32),
      height,
      random() * 0.22,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  for (let index = 0; index < 64; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 4 + random() * 18;
    const puff = context.createRadialGradient(x, y, 0, x, y, radius);
    puff.addColorStop(0, "rgba(255,255,255,0.62)");
    puff.addColorStop(1, "rgba(255,255,255,0)");
    context.globalAlpha = 0.18 + random() * 0.28;
    context.fillStyle = puff;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function buildPlanetSignal(progress: number, blockedTaskCount: number): string {
  if (blockedTaskCount > 0) {
    return `${blockedTaskCount} blocked`;
  }
  if (progress >= 75) {
    return "stable feature";
  }
  if (progress >= 45) {
    return "forming feature";
  }
  return "early feature";
}

function seededRandom(initialSeed: number): () => number {
  let seed = Math.abs(initialSeed) || 1;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function createStarCoronaTexture(colorValue: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const color = new THREE.Color(colorValue);
  const rgb = `${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)}`;
  const gradient = context.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.12, `rgba(${rgb},0.96)`);
  gradient.addColorStop(0.38, `rgba(${rgb},0.34)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default GalaxyScene;
