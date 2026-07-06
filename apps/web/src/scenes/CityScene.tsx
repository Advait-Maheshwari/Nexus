import { Grid, OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import type { ProjectSummary } from "@/types/domain";

function ProjectDistrict({
  project,
  index,
  selected,
  onSelect
}: {
  project: ProjectSummary;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const columns = Math.ceil(Math.sqrt(project.featureCount || 1));
  const buildings = useMemo(
    () =>
      Array.from({ length: Math.max(1, project.featureCount) }, (_, buildingIndex) => {
        const completed = buildingIndex < Math.round(project.featureCount * (project.progress / 100));
        return {
          x: (buildingIndex % columns) * 0.22 - ((columns - 1) * 0.22) / 2,
          z: Math.floor(buildingIndex / columns) * 0.22 - 0.18,
          height: completed ? 0.34 + ((buildingIndex * 7) % 5) * 0.08 : 0.12,
          completed
        };
      }),
    [columns, project.featureCount, project.progress]
  );
  const x = (index % 2) * 1.65 - 0.82;
  const z = Math.floor(index / 2) * -1.45 + 0.7;

  return (
    <group
      position={[x, 0, z]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[1.25, 0.05, 1.05]} />
        <meshStandardMaterial
          color={selected ? project.accent : "#0b1220"}
          emissive={selected ? project.accent : "#07101d"}
          emissiveIntensity={selected ? 0.35 : 0.12}
          roughness={0.68}
        />
      </mesh>
      {buildings.map((building, buildingIndex) => (
        <mesh
          key={`${project.id}-${buildingIndex}`}
          position={[building.x, building.height / 2 + 0.05, building.z]}
        >
          <boxGeometry args={[0.14, building.height, 0.14]} />
          <meshStandardMaterial
            color={building.completed ? project.accent : "#263244"}
            emissive={building.completed ? project.accent : "#02040a"}
            emissiveIntensity={building.completed ? 0.48 : 0}
            transparent={!building.completed}
            opacity={building.completed ? 1 : 0.52}
          />
        </mesh>
      ))}
      {project.blockedTaskCount > 0 ? (
        <mesh position={[0.46, 0.12, 0.34]}>
          <cylinderGeometry args={[0.06, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.8} />
        </mesh>
      ) : null}
      <Text
        position={[0, 0.08, 0.68]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.11}
        color={selected ? "#ffffff" : "#94a3b8"}
        anchorX="center"
      >
        {project.codename}
      </Text>
    </group>
  );
}

export default function CityScene({
  projects,
  selectedProjectId,
  onSelectProject
}: {
  projects: ProjectSummary[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
}) {
  return (
    <Canvas camera={{ position: [3.2, 3.4, 4.6], fov: 46 }} dpr={[1, 1.75]} shadows>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 5, 10]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 5, 3]} intensity={2.2} color="#dff8ff" castShadow />
      <pointLight position={[-3, 2, 1]} intensity={2.4} color="#8d67ff" />
      <Grid
        position={[0, 0, 0]}
        args={[12, 12]}
        cellSize={0.25}
        cellThickness={0.35}
        cellColor="#16304a"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#245b78"
        fadeDistance={9}
        infiniteGrid
      />
      {projects.map((project, index) => (
        <ProjectDistrict
          key={project.id}
          project={project}
          index={index}
          selected={project.id === selectedProjectId}
          onSelect={() => onSelectProject(project.id)}
        />
      ))}
      <OrbitControls
        makeDefault
        enablePan
        minDistance={3}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2.15}
        target={new THREE.Vector3(0, 0.2, -0.6)}
      />
    </Canvas>
  );
}
