import { Billboard, Float, Line, OrbitControls, Stars, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
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
  onSelect
}: {
  project: ProjectSummary;
  index: number;
  selected: boolean;
  onSelect?: (projectId: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(project.accent);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = elapsed * (0.12 + index * 0.03);
      group.current.position.y = project.coordinates[1] + Math.sin(elapsed + index) * 0.08;
    }
    if (orbit.current) {
      orbit.current.rotation.y = elapsed * (0.35 + index * 0.08);
    }
    if (pulse.current) {
      const scale = 1 + Math.sin(elapsed * 1.8 + index) * 0.08;
      pulse.current.scale.setScalar(scale);
    }
  });

  const planets = useMemo(
    () =>
      project.planets.map((planet, planetIndex) => {
        const angle = (planetIndex / project.planets.length) * Math.PI * 2;
        const radius = planet.orbitRadius;
        const progressScale = 0.026 + planet.progress / 2200;
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
      scale={selected ? 1.18 : 1}
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
          <sphereGeometry args={[0.16 + project.progress / 900, 48, 48]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={selected ? 2.8 : 1.6}
            roughness={0.24}
          />
        </mesh>
        <mesh ref={pulse}>
          <sphereGeometry args={[0.24 + project.healthScore / 620, 48, 48]} />
          <meshBasicMaterial color={project.accent} transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2.2, 0, 0]}>
          <torusGeometry args={[selected ? 0.4 : 0.34, selected ? 0.006 : 0.003, 16, 128]} />
          <meshBasicMaterial
            color={selected ? "#ffffff" : project.accent}
            transparent
            opacity={selected ? 0.9 : 0.42}
          />
        </mesh>
        {planets.map((planet) => (
          <mesh key={`${project.id}-${planet.id}-orbit`} rotation={[Math.PI / 2.2, 0, 0]}>
            <torusGeometry args={[planet.orbitRadius, 0.0016, 8, 128]} />
            <meshBasicMaterial color={planet.color} transparent opacity={0.14} />
          </mesh>
        ))}
        <group ref={orbit}>
          {planets.map((planet) => (
            <FeaturePlanetMesh key={`${project.id}-${planet.id}`} planet={planet} />
          ))}
        </group>
        <Billboard position={[0, -0.5, 0]}>
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
            {project.planets.length} planets / {project.progress}% complete
          </Text>
        </Billboard>
      </Float>
    </group>
  );
}

type SceneFeaturePlanet = FeaturePlanet & {
  angle: number;
  color: string;
  position: [number, number, number];
  size: number;
};

function FeaturePlanetMesh({ planet }: { planet: SceneFeaturePlanet }) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(planet.color);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = elapsed * 0.8 + planet.angle;
    }
    if (glow.current) {
      glow.current.scale.setScalar(1.35 + Math.sin(elapsed * 2 + planet.angle) * 0.12);
    }
  });

  return (
    <group position={planet.position}>
      <mesh ref={mesh}>
        <sphereGeometry args={[planet.size, 28, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={planet.blockedTaskCount > 0 ? 1.1 : 0.58}
          roughness={0.32}
        />
      </mesh>
      <mesh ref={glow}>
        <sphereGeometry args={[planet.size * 1.9, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[planet.size * 2.35, 0.0018, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      {planet.blockedTaskCount > 0 ? (
        <mesh position={[planet.size * 2.6, 0.02, 0]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial color="#fb7185" />
        </mesh>
      ) : null}
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
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  return (
    <>
      {relationships.map((relationship) => {
        const source = projectMap.get(relationship.sourceProjectId);
        const target = projectMap.get(relationship.targetProjectId);

        if (!source || !target) {
          return null;
        }

        const sourcePoint = new THREE.Vector3(...source.coordinates);
        const targetPoint = new THREE.Vector3(...target.coordinates);
        const midpoint = sourcePoint.clone().lerp(targetPoint, 0.5);
        const color = relationshipColor[relationship.type];

        return (
          <group key={relationship.id}>
            <Line
              points={[sourcePoint, targetPoint]}
              color={color}
              lineWidth={Math.max(1, relationship.strength * 3)}
              transparent
              opacity={0.2 + relationship.strength * 0.38}
            />
            <mesh position={midpoint.toArray()}>
              <sphereGeometry args={[0.018 + relationship.strength * 0.018, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.86} />
            </mesh>
            <Billboard position={midpoint.add(new THREE.Vector3(0, 0.12, 0)).toArray()}>
              <Text fontSize={0.045} color={color} anchorX="center" anchorY="middle" maxWidth={1.4}>
                {relationship.type.replace("-", " ")}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </>
  );
}

export function GalaxyScene({
  projects,
  relationships = [],
  selectedProjectId,
  onSelectProject
}: {
  projects: ProjectSummary[];
  relationships?: ProjectRelationship[];
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
}) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  return (
    <Canvas
      camera={{ position: [0, 0.35, 4.2], fov: 52 }}
      dpr={[1, 1.8]}
      onPointerMissed={() => onSelectProject?.("")}
    >
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 4, 8]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[2.2, 2.4, 2.8]} intensity={3.2} color="#48e5ff" />
      <pointLight position={[-2.8, -1.4, 2.2]} intensity={1.8} color="#8d67ff" />
      <Stars radius={80} depth={40} count={2400} factor={3.4} saturation={0.3} fade speed={0.38} />
      <ProjectLinks projects={projects} relationships={relationships} />
      {projects.map((project, index) => (
        <ProjectStar
          key={project.id}
          project={project}
          index={index}
          selected={project.id === selectedProjectId}
          onSelect={onSelectProject}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2.4}
        maxDistance={6.4}
        target={selectedProject?.coordinates ?? [0, 0, 0]}
        autoRotate={!selectedProjectId}
        autoRotateSpeed={0.32}
        maxPolarAngle={Math.PI / 1.65}
        minPolarAngle={Math.PI / 3.2}
      />
    </Canvas>
  );
}

export default GalaxyScene;
