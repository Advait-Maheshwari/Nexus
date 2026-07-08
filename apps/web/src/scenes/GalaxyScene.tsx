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
        camera.position.distanceTo(group.current.position) / 4.2,
        1,
        1.42
      );
      const focusScale = selected ? 1.06 : focusMode ? 0.72 : 0.9;
      group.current.scale.setScalar(focusScale * Math.min(distanceScale, 1.22));
    }
    if (orbit.current) {
      orbit.current.rotation.y = elapsed * (0.35 + index * 0.08);
    }
    if (pulse.current) {
      const baseScale = selected ? 0.72 : focusMode ? 0.4 : 0.52;
      const scale = baseScale * (1 + Math.sin(elapsed * 1.8 + index) * 0.06);
      pulse.current.scale.set(scale, scale, 1);
    }
  });

  const planets = useMemo(
    () =>
      project.planets.map((planet, planetIndex) => {
        const angle = (planetIndex / project.planets.length) * Math.PI * 2;
        const radius = planet.orbitRadius;
        const progressScale = 0.06 + planet.progress / 1700;
        return {
          ...planet,
          angle,
          position: [
            Math.cos(angle) * radius,
            Math.sin(angle * 1.7) * 0.18,
            Math.sin(angle) * radius
          ] as [number, number, number],
          size: progressScale,
          color: planet.blockedTaskCount > 0 ? "#fb7185" : statusColor[planet.status]
        };
      }),
    [project.planets]
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
              selected={selected && selectedPlanetId === planet.id}
              onSelect={() => onSelectPlanet?.(project.id, planet.id)}
            />
          ))}
        </group>
        <Billboard position={[0, -0.42, 0]}>
          <Text fontSize={0.08} color="#dff8ff" anchorX="center" anchorY="middle" maxWidth={1.2}>
            {project.codename}
          </Text>
          <Text
            position={[0, -0.11, 0]}
            fontSize={0.045}
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
  position: [number, number, number];
  size: number;
};

function FeaturePlanetMesh({
  planet,
  selected,
  systemSelected,
  onSelect
}: {
  planet: SceneFeaturePlanet;
  selected: boolean;
  systemSelected: boolean;
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
        return {
          position: [
            Math.cos(angle) * planet.size * 3.65,
            Math.sin(angle * 2) * planet.size * 0.65,
            Math.sin(angle) * planet.size * 3.65
          ] as [number, number, number],
          color: blocked ? "#fb7185" : index / satelliteCount < planet.progress / 100 ? "#4ade80" : "#94a3b8"
        };
      }),
    [planet.blockedTaskCount, planet.progress, planet.size, satelliteCount]
  );
  const visibleMoons = moons.slice(0, selected ? 6 : systemSelected ? 4 : 2);
  const hasRings = Math.round(planet.angle * 100) % 2 === 0;

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
      const distanceScale = THREE.MathUtils.clamp(camera.position.distanceTo(worldPosition) / 5.4, 1, 1.55);
      const modeScale = selected ? 1.48 : systemSelected ? 1.14 : 1.06;
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
      {planet.blockedTaskCount > 0 ? (
        <mesh position={[planet.size * 2.6, 0.02, 0]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial color="#fb7185" />
        </mesh>
      ) : null}
      {systemSelected ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[planet.size * 3.4, 0.0012, 8, 72]} />
            <meshBasicMaterial color="#dff8ff" transparent opacity={0.28} />
          </mesh>
          {selected ? (
            <Billboard position={[0, planet.size * 2.8, 0]}>
              <Text
                fontSize={Math.max(0.035, planet.size * 0.44)}
                color="#dff8ff"
                anchorX="center"
                anchorY="middle"
                maxWidth={0.7}
              >
                {planet.name}
              </Text>
              <Text
                position={[0, -Math.max(0.05, planet.size * 0.58), 0]}
                fontSize={Math.max(0.026, planet.size * 0.28)}
                color={planet.blockedTaskCount > 0 ? "#fecdd3" : "#94a3b8"}
                anchorX="center"
                anchorY="middle"
                maxWidth={0.9}
              >
                feature / {planet.taskCount} task moons / {planet.progress}%
              </Text>
            </Billboard>
          ) : null}
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
            <sphereGeometry args={[Math.max(0.012, planet.size * (systemSelected ? 0.2 : 0.16)), 22, 22]} />
            <meshStandardMaterial
              map={moonTexture}
              color={moon.color}
              emissive={moon.color}
              emissiveIntensity={selected ? 0.34 : 0.2}
              roughness={0.94}
            />
          </mesh>
          {selected && index < 3 ? (
            <Billboard position={[0, planet.size * 0.42, 0]}>
              <Text
                fontSize={Math.max(0.018, planet.size * 0.16)}
                color={moon.color}
                anchorX="center"
                anchorY="middle"
                maxWidth={0.35}
              >
                task
              </Text>
            </Billboard>
          ) : null}
        </group>
      ))}
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
        <Text fontSize={0.045} color={color} anchorX="center" anchorY="middle" maxWidth={1.4}>
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
      camera={{ position: [0, 0.35, 4.2], fov: 52 }}
      dpr={[1, 1.8]}
      onPointerMissed={() => onSelectProject?.("")}
    >
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 18, 34]} />
      <ambientLight intensity={1.28} />
      <pointLight position={[2.2, 2.4, 2.8]} intensity={3.8} color="#48e5ff" />
      <pointLight position={[-2.8, -1.4, 2.2]} intensity={2.2} color="#8d67ff" />
      <directionalLight position={[0.4, 2.6, 3.2]} intensity={1.8} color="#eef9ff" />
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
        enablePan={false}
        enableZoom
        minDistance={2.4}
        maxDistance={8.2}
        target={
          selectedProject
            ? [
                selectedProject.coordinates[0],
                selectedProject.coordinates[1] - 0.58,
                selectedProject.coordinates[2]
              ]
            : [0, -0.35, 0]
        }
        autoRotate={!selectedProjectId}
        autoRotateSpeed={0.32}
        maxPolarAngle={Math.PI / 1.65}
        minPolarAngle={Math.PI / 3.2}
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
