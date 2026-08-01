import { Billboard, Float, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import type { ComponentRef, MutableRefObject } from "react";
import * as THREE from "three";

import { SceneText as Text } from "@/scenes/SceneText";
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

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;
type GalaxyProject = ProjectSummary & {
  visualCoordinates: [number, number, number];
};

interface GalaxyFrame {
  center: THREE.Vector3;
  radius: number;
}

function ProjectStar({
  project,
  index,
  selected,
  focusMode,
  selectedPlanetId,
  onSelect,
  onSelectPlanet
}: {
  project: GalaxyProject;
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
  const starSize = 0.18 + project.progress / 1600;
  const healthRingColor = project.healthScore >= 75 ? "#4ade80" : project.healthScore >= 55 ? "#f5c451" : "#fb7185";
  const coronaTexture = useMemo(() => createStarCoronaTexture(project.accent), [project.accent]);

  useEffect(() => () => coronaTexture.dispose(), [coronaTexture]);

  useFrame(({ clock, camera }) => {
    const elapsed = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = elapsed * (0.12 + index * 0.03);
      group.current.position.y = project.visualCoordinates[1] + Math.sin(elapsed + index) * 0.08;
      const distanceScale = THREE.MathUtils.clamp(
        camera.position.distanceTo(group.current.position) / 3.9,
        1,
        1.72
      );
      const focusScale = selected
        ? 1.16
        : focusMode
          ? 0.62
          : project.planets.length === 0
            ? 1.02
            : 0.82;
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
        const visualBaseRadius = 0.62 + planetIndex * 0.2;
        const radiusMultiplier = selected ? 1.42 : focusMode ? 1.2 : 1.1;
        const radius = visualBaseRadius * radiusMultiplier;
        const progressScale = 0.095 + planet.progress / 1450 + Math.min(planet.taskCount, 18) / 1850;
        const completedTaskCount = Math.round(planet.taskCount * (planet.progress / 100));
        const openTaskCount = Math.max(0, planet.taskCount - completedTaskCount - planet.blockedTaskCount);
        const archetype = resolveFeatureArchetype(planet.name, planetIndex);
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
          color: archetype.surface,
          statusColor: planet.blockedTaskCount > 0 ? "#fb7185" : statusColor[planet.status],
          biomeLabel: archetype.label,
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
      position={project.visualCoordinates}
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
          <sphereGeometry args={[starSize, 48, 48]} />
          <meshBasicMaterial color="#ffd36a" />
        </mesh>
        <mesh scale={1.18}>
          <sphereGeometry args={[starSize, 32, 32]} />
          <meshBasicMaterial
            color={project.accent}
            transparent
            opacity={selected ? 0.24 : 0.15}
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <pointLight
          color={project.accent}
          intensity={selected ? 1.15 : 0.66}
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
            color={healthRingColor}
            transparent
            opacity={selected ? 0.88 : 0.42}
          />
        </mesh>
        <SolarFlares accent={project.accent} selected={selected} healthScore={project.healthScore} />
        {planets.map((planet) => (
          <mesh key={`${project.id}-${planet.id}-orbit`} rotation={[Math.PI / 2.2, 0, 0]}>
            <torusGeometry args={[planet.orbitRadius, 0.0016, 8, 128]} />
            <meshBasicMaterial color={planet.statusColor} transparent opacity={selected ? 0.24 : 0.12} />
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
        {planets.length === 0 ? (
          <FormingSystem accent={project.accent} selected={selected} />
        ) : null}
        <Billboard position={[0, selected ? -0.58 : -0.42, 0]}>
          <Text
            fontSize={selected ? 0.07 : focusMode ? 0.052 : 0.038}
            color="#dff8ff"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.2}
          >
            {project.name.toUpperCase()}
          </Text>
          <Text
            position={[0, -0.11, 0]}
            fontSize={selected ? 0.04 : focusMode ? 0.03 : 0.022}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.2}
          >
            {project.codename} / {project.planets.length} feature planets
          </Text>
        </Billboard>
      </Float>
    </group>
  );
}

function FormingSystem({ accent, selected }: { accent: string; selected: boolean }) {
  const group = useRef<THREE.Group>(null);
  const particleCount = selected ? 18 : 12;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.getElapsedTime() * 0.24;
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.62, selected ? 0.006 : 0.003, 12, 128]} />
        <meshBasicMaterial color={accent} transparent opacity={selected ? 0.42 : 0.24} />
      </mesh>
      {Array.from({ length: particleCount }, (_, index) => {
        const angle = (index / particleCount) * Math.PI * 2;
        const radius = 0.42 + (index % 4) * 0.075;
        return (
          <mesh
            key={"forming-particle-" + index}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 2.4) * 0.045,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[index % 5 === 0 ? 0.018 : 0.008, 10, 10]} />
            <meshBasicMaterial
              color={index % 5 === 0 ? "#dff8ff" : accent}
              transparent
              opacity={0.72}
            />
          </mesh>
        );
      })}
      <mesh position={[0.62, 0, 0]}>
        <icosahedronGeometry args={[selected ? 0.07 : 0.05, 2]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.34}
          roughness={0.82}
          wireframe
        />
      </mesh>
      <Billboard position={[0, selected ? 0.38 : 0.31, 0]}>
        <Text
          fontSize={selected ? 0.035 : 0.026}
          color="#dff8ff"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.9}
        >
          FORMING SYSTEM
        </Text>
        <Text
          position={[0, -0.055, 0]}
          fontSize={selected ? 0.021 : 0.016}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.1}
        >
          add a feature to form the first planet
        </Text>
      </Billboard>
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
  const flareCount = healthScore > 80 ? 8 : healthScore > 65 ? 6 : 4;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = clock.getElapsedTime() * (selected ? 0.42 : 0.24);
    group.current.scale.setScalar(selected ? 1.08 + Math.sin(clock.getElapsedTime() * 1.8) * 0.04 : 0.9);
  });

  return (
    <group ref={group}>
      {Array.from({ length: flareCount }, (_, index) => {
        const angle = (index / flareCount) * Math.PI * 2;
        const length = selected ? 0.26 : 0.18;
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
  biomeLabel: string;
  color: string;
  completedTaskCount: number;
  openTaskCount: number;
  position: [number, number, number];
  signalLabel: string;
  size: number;
  statusColor: string;
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
  const satelliteCount = planet.taskCount === 0 ? 0 : Math.min(8, planet.taskCount);
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
  const visibleMoons = moons.slice(0, selected ? 8 : systemSelected ? 4 : overview ? 1 : 2);
  const hasRings = planet.biomeLabel === "AI intelligence" || planet.biomeLabel === "Operations";
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
      const modeScale = selected ? 1 : systemSelected ? 0.86 : overview ? 0.72 : 0.78;
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
              color={planet.statusColor}
              transparent
              opacity={selected ? 0.48 : systemSelected ? 0.32 : 0.16}
              depthWrite={false}
            />
          </mesh>
          <mesh position={progressMarkerPosition}>
            <sphereGeometry args={[Math.max(0.012, planet.size * 0.16), 18, 18]} />
            <meshBasicMaterial
              color={planet.statusColor}
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
                ? `${planet.biomeLabel} / ${planet.signalLabel} / ${planet.taskCount} task moons`
                : `${planet.biomeLabel} / ${planet.progress}% / ${planet.taskCount} tasks`}
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
  const beaconColor = planet.statusColor;
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
  source: GalaxyProject;
  target: GalaxyProject;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const color = relationshipColor[relationship.type];
  const curvePoints = useMemo(() => {
    const sourcePoint = new THREE.Vector3(...source.visualCoordinates);
    const targetPoint = new THREE.Vector3(...target.visualCoordinates);
    const midpoint = sourcePoint.clone().lerp(targetPoint, 0.5);
    midpoint.y += 0.28 + relationship.strength * 0.36;
    const curve = new THREE.QuadraticBezierCurve3(sourcePoint, midpoint, targetPoint);
    return curve.getPoints(28);
  }, [relationship.strength, source.visualCoordinates, target.visualCoordinates]);
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
  projects: GalaxyProject[];
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

function GalacticField({ frame, focusMode }: { frame: GalaxyFrame; focusMode: boolean }) {
  const dust = useMemo(() => {
    const count = focusMode ? 180 : 320;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const random = seededRandom(Math.round(frame.radius * 10_000) + (focusMode ? 41 : 17));
    const cyan = new THREE.Color("#48e5ff");
    const violet = new THREE.Color("#8d67ff");
    const solar = new THREE.Color("#f5c451");

    for (let index = 0; index < count; index += 1) {
      const radius = frame.radius * (0.24 + random() * 1.28);
      const angle = random() * Math.PI * 2;
      const height = (random() - 0.5) * frame.radius * (focusMode ? 0.34 : 0.5);
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = height;
      positions[index * 3 + 2] = Math.sin(angle) * radius;

      const color = (index % 7 === 0 ? solar : index % 2 === 0 ? cyan : violet).clone();
      color.multiplyScalar(0.52 + random() * 0.44);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    return { positions, colors };
  }, [focusMode, frame.radius]);

  const lanes = useMemo(
    () =>
      Array.from({ length: focusMode ? 2 : 3 }, (_, laneIndex) => {
        const radius = frame.radius * (0.42 + laneIndex * 0.32);
        return Array.from({ length: 97 }, (__, pointIndex) => {
          const angle = (pointIndex / 96) * Math.PI * 2;
          return new THREE.Vector3(
            Math.cos(angle) * radius,
            -frame.radius * 0.2 + Math.sin(angle * 2) * frame.radius * 0.035,
            Math.sin(angle) * radius
          );
        });
      }),
    [focusMode, frame.radius]
  );

  return (
    <group position={frame.center.toArray()}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[dust.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={focusMode ? 0.018 : 0.024}
          sizeAttenuation
          vertexColors
          transparent
          opacity={focusMode ? 0.28 : 0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {lanes.map((points, index) => (
        <Line
          key={`galactic-lane-${index}`}
          points={points}
          color={index === 1 ? "#8d67ff" : "#48e5ff"}
          lineWidth={0.7}
          transparent
          opacity={focusMode ? 0.09 : 0.12}
        />
      ))}
    </group>
  );
}

function layoutGalaxyProjects(projects: ProjectSummary[]): GalaxyProject[] {
  if (projects.length === 0) return [];
  if (projects.length === 1) {
    return [{ ...projects[0], visualCoordinates: [0, 0, 0] }];
  }

  if (projects.length <= 4) {
    if (projects.length === 2) {
      return projects.map((project, index) => ({
        ...project,
        visualCoordinates: [index === 0 ? -1.75 : 1.75, (index - 0.5) * 0.18, 0] as [number, number, number]
      }));
    }
    const radius = projects.length === 2 ? 1.8 : projects.length === 3 ? 2.1 : 2.35;
    return projects.map((project, index) => {
      const angle = (index / projects.length) * Math.PI * 2 - Math.PI / 2;
      return {
        ...project,
        visualCoordinates: [
          Math.cos(angle) * radius,
          ((index % 2) - 0.5) * 0.38,
          Math.sin(angle) * radius
        ] as [number, number, number]
      };
    });
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return projects.map((project, index) => {
    const radius = 1.55 + Math.sqrt(index + 1) * 1.38;
    const angle = index * goldenAngle;
    return {
      ...project,
      visualCoordinates: [
        Math.cos(angle) * radius,
        ((index % 3) - 1) * 0.42,
        Math.sin(angle) * radius
      ] as [number, number, number]
    };
  });
}

function calculateGalaxyFrame(
  projects: GalaxyProject[],
  selectedProject?: GalaxyProject
): GalaxyFrame {
  if (selectedProject) {
    if (selectedProject.planets.length === 0) {
      return {
        center: new THREE.Vector3(...selectedProject.visualCoordinates),
        radius: 1.45
      };
    }
    const largestOrbit = (0.62 + (selectedProject.planets.length - 1) * 0.2) * 1.42;
    return {
      center: new THREE.Vector3(...selectedProject.visualCoordinates),
      radius: Math.max(2.15, largestOrbit + 0.82)
    };
  }

  if (projects.length === 0) {
    return { center: new THREE.Vector3(), radius: 3.8 };
  }

  if (projects.length === 1 && projects[0].planets.length === 0) {
    return {
      center: new THREE.Vector3(...projects[0].visualCoordinates),
      radius: 1.75
    };
  }

  if (projects.length === 1) {
    const largestOrbit = (0.62 + Math.max(0, projects[0].planets.length - 1) * 0.2) * 1.1;
    return {
      center: new THREE.Vector3(...projects[0].visualCoordinates),
      radius: Math.max(2.25, largestOrbit + 0.95)
    };
  }

  const bounds = new THREE.Box3();
  for (const project of projects) {
    const visualOrbit = project.planets.length > 0 ? (0.62 + (project.planets.length - 1) * 0.2) * 1.1 : 0.82;
    const systemRadius = Math.max(1.25, visualOrbit + 0.62);
    const center = new THREE.Vector3(...project.visualCoordinates);
    bounds.expandByPoint(center.clone().addScalar(systemRadius));
    bounds.expandByPoint(center.clone().addScalar(-systemRadius));
  }
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  return { center: sphere.center, radius: Math.max(3.8, sphere.radius) };
}

function GalaxyCamera({
  controls,
  frame,
  cameraZoom,
  selectedProjectId,
  resetSignal
}: {
  controls: MutableRefObject<OrbitControlsHandle | null>;
  frame: GalaxyFrame;
  cameraZoom: number;
  selectedProjectId?: string;
  resetSignal: number;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = Math.max(0.55, size.width / Math.max(1, size.height));
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const fitDistance = (frame.radius / Math.sin(limitingFov / 2)) * (selectedProjectId ? 1.2 : 1.3);
    const distance = fitDistance * Math.pow(0.82, cameraZoom);
    const direction = selectedProjectId
      ? new THREE.Vector3(0.38, 0.72, 1)
      : new THREE.Vector3(0.08, 0.3, 1);

    camera.position.copy(frame.center).add(direction.normalize().multiplyScalar(distance));
    camera.near = 0.08;
    camera.far = Math.max(240, distance + frame.radius * 14);
    camera.updateProjectionMatrix();
    camera.lookAt(frame.center);
    controls.current?.target.copy(frame.center);
    controls.current?.update();
  }, [
    camera,
    cameraZoom,
    controls,
    frame.center.x,
    frame.center.y,
    frame.center.z,
    frame.radius,
    resetSignal,
    selectedProjectId,
    size.height,
    size.width
  ]);

  return null;
}

export function GalaxyScene({
  projects,
  relationships = [],
  cameraZoom = 0,
  selectedProjectId,
  selectedPlanetId,
  resetSignal = 0,
  onSelectProject,
  onSelectPlanet
}: {
  projects: ProjectSummary[];
  relationships?: ProjectRelationship[];
  cameraZoom?: number;
  selectedProjectId?: string;
  selectedPlanetId?: string;
  resetSignal?: number;
  onSelectProject?: (projectId: string) => void;
  onSelectPlanet?: (projectId: string, planetId: string) => void;
}) {
  const visualProjects = useMemo(() => layoutGalaxyProjects(projects), [projects]);
  const selectedProject = visualProjects.find((project) => project.id === selectedProjectId);
  const controls = useRef<OrbitControlsHandle>(null);
  const reducedMotion = useReducedMotion();
  const frame = useMemo(
    () => calculateGalaxyFrame(visualProjects, selectedProject),
    [visualProjects, selectedProject]
  );

  return (
    <Canvas
      camera={{ position: [0, 2.8, 16], fov: 58 }}
      dpr={[1, 1.8]}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "high-performance"
      }}
    >
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 90, 190]} />
      <ambientLight intensity={1.48} />
      <pointLight position={[2.2, 2.4, 2.8]} intensity={3.8} color="#48e5ff" />
      <pointLight position={[-2.8, -1.4, 2.2]} intensity={2.2} color="#8d67ff" />
      <directionalLight position={[0.4, 2.6, 3.2]} intensity={2.15} color="#eef9ff" />
      <Stars radius={80} depth={40} count={2600} factor={3.6} saturation={0.35} fade speed={0.38} />
      <GalaxyCamera
        controls={controls}
        frame={frame}
        cameraZoom={cameraZoom}
        selectedProjectId={selectedProjectId}
        resetSignal={resetSignal}
      />
      <GalacticField frame={frame} focusMode={Boolean(selectedProjectId)} />
      {!selectedProjectId ? <ProjectLinks projects={visualProjects} relationships={relationships} /> : null}
      {visualProjects
        .filter((project) => !selectedProjectId || project.id === selectedProjectId)
        .map((project, index) => (
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
        ref={controls}
        makeDefault
        enablePan
        enableZoom
        enableDamping
        dampingFactor={0.065}
        zoomSpeed={0.9}
        rotateSpeed={0.62}
        panSpeed={0.68}
        screenSpacePanning
        zoomToCursor
        minDistance={selectedProject ? 2.2 : 3.2}
        maxDistance={Math.max(52, frame.radius * 12)}
        target={[frame.center.x, frame.center.y, frame.center.z]}
        autoRotate={!reducedMotion && !selectedProjectId}
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

function resolveFeatureArchetype(name: string, index: number): { label: string; surface: string } {
  const normalized = name.toLowerCase();

  if (/\b(ai|agent|model|prompt|automation|ml|machine)\b/.test(normalized)) {
    return { label: "AI intelligence", surface: "#8d67ff" };
  }
  if (/\b(ui|ux|design|frontend|web|mobile|interface)\b/.test(normalized)) {
    return { label: "Interface world", surface: "#2dd4bf" };
  }
  if (/\b(api|backend|database|server|security|auth|cloud)\b/.test(normalized)) {
    return { label: "Core systems", surface: "#4f8cff" };
  }
  if (/\b(data|analytics|report|insight|metric|research)\b/.test(normalized)) {
    return { label: "Insight world", surface: "#48e5ff" };
  }
  if (/\b(plan|launch|roadmap|goal|calendar|milestone)\b/.test(normalized)) {
    return { label: "Operations", surface: "#f5c451" };
  }
  if (/\b(team|people|community|client|collaboration)\b/.test(normalized)) {
    return { label: "Team habitat", surface: "#4ade80" };
  }

  const fallback = [
    { label: "Feature world", surface: "#48e5ff" },
    { label: "Feature world", surface: "#8d67ff" },
    { label: "Feature world", surface: "#4f8cff" },
    { label: "Feature world", surface: "#2dd4bf" }
  ];
  return fallback[index % fallback.length];
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
