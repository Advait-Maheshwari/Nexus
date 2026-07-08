import { Grid, OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import type { FeaturePlanet, ProjectSummary } from "@/types/domain";

interface TowerPlan {
  id: string;
  x: number;
  z: number;
  height: number;
  width: number;
  completed: boolean;
  blocked: boolean;
}

function ProjectCity({ project }: { project: ProjectSummary }) {
  const districts = useMemo(() => buildDistricts(project), [project]);
  const completedRatio = project.progress / 100;
  const coreHeight = 0.9 + completedRatio * 1.2;

  return (
    <group>
      <CityBase accent={project.accent} />
      <RoadNetwork accent={project.accent} />

      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.045, 0]} receiveShadow>
          <cylinderGeometry args={[0.52, 0.62, 0.09, 10]} />
          <meshStandardMaterial
            color="#0c1727"
            emissive={project.accent}
            emissiveIntensity={0.12}
            roughness={0.6}
          />
        </mesh>
        <mesh position={[0, coreHeight / 2 + 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.24, coreHeight, 8]} />
          <meshStandardMaterial
            color={project.accent}
            emissive={project.accent}
            emissiveIntensity={0.42}
            metalness={0.25}
            roughness={0.38}
          />
        </mesh>
        <mesh position={[0, coreHeight + 0.24, 0]} castShadow>
          <coneGeometry args={[0.24, 0.34, 8]} />
          <meshStandardMaterial
            color="#dff8ff"
            emissive={project.accent}
            emissiveIntensity={0.6}
            metalness={0.2}
            roughness={0.28}
          />
        </mesh>
        <mesh position={[0, coreHeight + 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.01, 8, 32]} />
          <meshStandardMaterial color={project.accent} emissive={project.accent} emissiveIntensity={1} />
        </mesh>
      </group>

      {districts.map((district, index) => (
        <FeatureDistrict
          key={district.feature.id}
          accent={project.accent}
          feature={district.feature}
          index={index}
          position={district.position}
          towers={district.towers}
        />
      ))}

      {project.blockedTaskCount > 0 ? (
        <WarningBeacon count={project.blockedTaskCount} accent="#fb7185" />
      ) : null}

      <Text
        position={[0, 0.08, 2.45]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
      >
        {project.codename} CITY
      </Text>
    </group>
  );
}

function FeatureDistrict({
  feature,
  accent,
  index,
  position,
  towers
}: {
  feature: FeaturePlanet;
  accent: string;
  index: number;
  position: [number, number, number];
  towers: TowerPlan[];
}) {
  const featureColor = feature.blockedTaskCount > 0 ? "#fb7185" : feature.progress >= 70 ? "#4ade80" : accent;

  return (
    <group position={position}>
      <mesh position={[0, 0.035, 0]} receiveShadow>
        <cylinderGeometry args={[0.64, 0.7, 0.07, 6]} />
        <meshStandardMaterial
          color="#081322"
          emissive={featureColor}
          emissiveIntensity={0.14}
          roughness={0.72}
        />
      </mesh>
      <mesh position={[0, 0.078, 0]} rotation={[Math.PI / 2, 0, index * 0.4]}>
        <ringGeometry args={[0.5, 0.53, 40]} />
        <meshBasicMaterial color={featureColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {towers.map((tower) => (
        <CityTower key={tower.id} accent={featureColor} tower={tower} />
      ))}

      {feature.blockedTaskCount > 0 ? (
        <group position={[0.38, 0.2, -0.38]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.055, 0.08, 0.34, 8]} />
            <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={1.2} />
          </mesh>
          <pointLight intensity={1.2} color="#fb7185" distance={1.4} />
        </group>
      ) : null}

      <Text
        position={[0, 0.09, 0.72]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.085}
        color={feature.blockedTaskCount > 0 ? "#fecdd3" : "#cbd5e1"}
        anchorX="center"
        maxWidth={1.1}
      >
        {feature.name}
      </Text>
    </group>
  );
}

function CityTower({ accent, tower }: { accent: string; tower: TowerPlan }) {
  const bodyColor = tower.blocked ? "#33121e" : tower.completed ? accent : "#1c293b";
  const topColor = tower.blocked ? "#fb7185" : tower.completed ? "#dff8ff" : "#52617a";
  const opacity = tower.completed || tower.blocked ? 1 : 0.62;

  return (
    <group position={[tower.x, 0, tower.z]}>
      <mesh position={[0, tower.height / 2 + 0.08, 0]} castShadow>
        <boxGeometry args={[tower.width, tower.height, tower.width]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={tower.completed || tower.blocked ? bodyColor : "#02040a"}
          emissiveIntensity={tower.completed ? 0.32 : tower.blocked ? 0.7 : 0.02}
          metalness={0.2}
          roughness={0.44}
          transparent={!tower.completed && !tower.blocked}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, tower.height + 0.16, 0]} castShadow>
        {tower.blocked ? (
          <boxGeometry args={[tower.width * 1.1, 0.08, tower.width * 0.7]} />
        ) : (
          <coneGeometry args={[tower.width * 0.72, 0.18, 4]} />
        )}
        <meshStandardMaterial color={topColor} emissive={topColor} emissiveIntensity={tower.completed ? 0.55 : 0.22} />
      </mesh>
      <WindowStrips height={tower.height} width={tower.width} color={tower.blocked ? "#fb7185" : "#7dd3fc"} />
      {tower.blocked ? (
        <group>
          <mesh position={[tower.width * 0.92, 0.1, tower.width * 0.4]} rotation={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-tower.width * 0.82, 0.08, -tower.width * 0.55]} rotation={[0.2, 0.6, 0.1]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.08]} />
            <meshStandardMaterial color="#7f1d1d" emissive="#fb7185" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function WindowStrips({ height, width, color }: { height: number; width: number; color: string }) {
  const rows = Math.max(2, Math.min(7, Math.floor(height / 0.13)));
  return (
    <>
      {Array.from({ length: rows }, (_, row) => {
        const y = 0.18 + row * (height / (rows + 1));
        return (
          <group key={`windows-${row}`}>
            <mesh position={[0, y, width / 2 + 0.002]}>
              <boxGeometry args={[width * 0.58, 0.012, 0.004]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>
            <mesh position={[width / 2 + 0.002, y, 0]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[width * 0.58, 0.012, 0.004]} />
              <meshBasicMaterial color={color} transparent opacity={0.38} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function CityBase({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[2.58, 2.76, 0.02, 80]} />
        <meshStandardMaterial color="#030712" emissive={accent} emissiveIntensity={0.04} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.15, 2.19, 80]} />
        <meshBasicMaterial color={accent} transparent opacity={0.24} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RoadNetwork({ accent }: { accent: string }) {
  const roads = [
    { position: [0, 0.032, 0] as [number, number, number], scale: [0.1, 1, 4.8] as [number, number, number] },
    { position: [0, 0.034, 0] as [number, number, number], scale: [4.8, 1, 0.1] as [number, number, number] },
    { position: [0, 0.036, 0] as [number, number, number], scale: [0.06, 1, 3.7] as [number, number, number], rotation: Math.PI / 4 },
    { position: [0, 0.038, 0] as [number, number, number], scale: [0.06, 1, 3.7] as [number, number, number], rotation: -Math.PI / 4 }
  ];

  return (
    <group>
      {roads.map((road, index) => (
        <mesh
          key={`road-${index}`}
          position={road.position}
          rotation={[-Math.PI / 2, 0, road.rotation ?? 0]}
          scale={road.scale}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#07111f" transparent opacity={0.88} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.041, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.75, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.48} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function WarningBeacon({ count, accent }: { count: number; accent: string }) {
  return (
    <group position={[-1.9, 0.08, 1.75]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.22, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} />
      </mesh>
      <pointLight color={accent} intensity={1.8} distance={2.2} />
      <Text position={[0, 0.32, 0]} fontSize={0.12} color="#fecdd3" anchorX="center">
        {count} BLOCKED
      </Text>
    </group>
  );
}

function buildDistricts(project: ProjectSummary) {
  const radius = 1.35;
  return project.planets.map((feature, index) => {
    const angle = (index / Math.max(1, project.planets.length)) * Math.PI * 2 + Math.PI / 4;
    return {
      feature,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
      towers: buildTowers(feature)
    };
  });
}

function buildTowers(feature: FeaturePlanet): TowerPlan[] {
  const count = Math.max(3, Math.min(9, Math.ceil(feature.taskCount / 2)));
  const completedCount = Math.round(count * (feature.progress / 100));
  const blockedCount = Math.min(feature.blockedTaskCount, count);
  const columns = Math.ceil(Math.sqrt(count));

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const completed = index < completedCount;
    const blocked = index >= count - blockedCount;
    const width = 0.13 + ((index + feature.id.length) % 3) * 0.018;
    return {
      id: `${feature.id}-${index}`,
      x: column * 0.22 - ((columns - 1) * 0.22) / 2,
      z: row * 0.22 - ((Math.ceil(count / columns) - 1) * 0.22) / 2,
      height: blocked ? 0.18 + (index % 2) * 0.08 : completed ? 0.38 + ((index * 5) % 6) * 0.09 : 0.16,
      width,
      completed,
      blocked
    };
  });
}

export default function CityScene({ project }: { project: ProjectSummary }) {
  return (
    <Canvas camera={{ position: [3.7, 3.15, 4.25], fov: 43 }} dpr={[1, 1.75]} shadows>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 5.5, 10.5]} />
      <ambientLight intensity={0.58} />
      <directionalLight position={[2.5, 5, 3.5]} intensity={2.4} color="#dff8ff" castShadow />
      <pointLight position={[-3, 2.2, 1.6]} intensity={2.2} color="#8d67ff" />
      <pointLight position={[2.5, 1.2, -2]} intensity={1.4} color={project.accent} />
      <Grid
        position={[0, -0.005, 0]}
        args={[14, 14]}
        cellSize={0.25}
        cellThickness={0.28}
        cellColor="#102238"
        sectionSize={1}
        sectionThickness={0.7}
        sectionColor="#245b78"
        fadeDistance={8.5}
        infiniteGrid
      />
      <ProjectCity project={project} />
      <OrbitControls
        makeDefault
        enablePan
        minDistance={3}
        maxDistance={7.2}
        maxPolarAngle={Math.PI / 2.2}
        target={new THREE.Vector3(0, 0.38, 0)}
      />
    </Canvas>
  );
}
