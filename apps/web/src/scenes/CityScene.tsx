import { Billboard, Grid, Line, OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { ComponentRef, MutableRefObject } from "react";
import * as THREE from "three";

import type { FeaturePlanet, ProjectSummary } from "@/types/domain";

export type CityViewMode = "overview" | "street" | "risk";

const CITY_TARGET = new THREE.Vector3(0, 0.42, 0);
type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

interface CityStyle {
  name: string;
  baseColor: string;
  accent: string;
  secondary: string;
  parkColor: string;
  density: number;
  coreShape: "spire" | "reactor" | "citadel";
}

interface TowerPlan {
  id: string;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  kind: "spire" | "terrace" | "dome" | "slab" | "needle";
  completed: boolean;
  blocked: boolean;
}

interface MicroBuildingPlan {
  id: string;
  x: number;
  z: number;
  height: number;
  width: number;
  color: string;
}

interface DistrictPlan {
  feature: FeaturePlanet;
  position: [number, number, number];
  rotation: number;
  towers: TowerPlan[];
  microBuildings: MicroBuildingPlan[];
}

function ProjectCity({ project, mode }: { project: ProjectSummary; mode: CityViewMode }) {
  const style = useMemo(() => getCityStyle(project), [project]);
  const districts = useMemo(() => buildDistricts(project, style), [project, style]);

  return (
    <group scale={1.18}>
      <CityBase style={style} mode={mode} />
      <RoadNetwork style={style} />
      <ElevatedLoop style={style} />
      <CityTraffic accent={style.secondary} />
      <TransitLines districts={districts} style={style} mode={mode} />
      <CentralCore project={project} style={style} />

      {districts.map((district, index) => (
        <FeatureDistrict
          key={district.feature.id}
          district={district}
          index={index}
          style={style}
          mode={mode}
        />
      ))}

      <OuterCityDetails style={style} project={project} />

      {mode === "street" ? <StreetScanner accent={style.accent} /> : null}

    </group>
  );
}

function CentralCore({ project, style }: { project: ProjectSummary; style: CityStyle }) {
  const completedRatio = project.progress / 100;
  const coreHeight = 0.92 + completedRatio * 1.55 + (project.priority === "critical" ? 0.32 : 0);
  const core = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!core.current) return;
    core.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.18) * 0.05;
  });

  return (
    <group ref={core}>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.56, 0.7, 0.08, 10]} />
        <meshStandardMaterial color={style.baseColor} emissive={style.accent} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, coreHeight / 2 + 0.08, 0]} castShadow>
        {style.coreShape === "reactor" ? (
          <cylinderGeometry args={[0.22, 0.3, coreHeight, 12]} />
        ) : style.coreShape === "citadel" ? (
          <boxGeometry args={[0.42, coreHeight, 0.42]} />
        ) : (
          <cylinderGeometry args={[0.12, 0.28, coreHeight, 8]} />
        )}
        <meshStandardMaterial
          color={style.accent}
          emissive={style.accent}
          emissiveIntensity={0.5}
          metalness={0.28}
          roughness={0.34}
        />
      </mesh>
      <mesh position={[0, coreHeight + 0.2, 0]} castShadow>
        <coneGeometry args={[0.28, 0.36, 8]} />
        <meshStandardMaterial color="#dff8ff" emissive={style.accent} emissiveIntensity={0.72} />
      </mesh>
      <mesh position={[0, coreHeight + 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.012, 8, 72]} />
        <meshBasicMaterial color={style.secondary} transparent opacity={0.74} />
      </mesh>
      <HologramNeedles accent={style.secondary} count={project.featureCount} radius={0.72} />
    </group>
  );
}

function FeatureDistrict({
  district,
  index,
  style,
  mode
}: {
  district: DistrictPlan;
  index: number;
  style: CityStyle;
  mode: CityViewMode;
}) {
  const { feature, towers, microBuildings } = district;
  const featureColor =
    feature.blockedTaskCount > 0 ? "#fb7185" : feature.progress >= 70 ? style.parkColor : style.accent;

  return (
    <group position={district.position} rotation={[0, district.rotation, 0]}>
      <DistrictPlate color={featureColor} mode={mode} blocked={feature.blockedTaskCount > 0} />
      <DistrictStreetGrid color={featureColor} />
      <DistrictPark color={style.parkColor} progress={feature.progress} />
      <Skybridges towers={towers} accent={featureColor} />

      {microBuildings.map((building) => (
        <MicroBuilding key={building.id} building={building} />
      ))}

      {towers.map((tower) => (
        <CityTower key={tower.id} accent={featureColor} tower={tower} />
      ))}

      <TransitStop accent={featureColor} index={index} />

      {feature.blockedTaskCount > 0 ? <DamageCluster accent="#fb7185" count={feature.blockedTaskCount} /> : null}
      {feature.status === "in_progress" ? <ConstructionCrane accent={featureColor} progress={feature.progress} /> : null}
      {mode === "risk" ? <RiskHalo feature={feature} /> : null}

      <Billboard position={[0, 0.42, 0.86]}>
        <Text
          fontSize={0.075}
          color={feature.blockedTaskCount > 0 ? "#fecdd3" : "#dff8ff"}
          anchorX="center"
          anchorY="middle"
          maxWidth={1.24}
        >
          {feature.name}
        </Text>
        <Text
          position={[0, -0.1, 0]}
          fontSize={0.045}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.24}
        >
          feature district / {feature.taskCount} tasks / {feature.progress}%
        </Text>
      </Billboard>
    </group>
  );
}

function DistrictPlate({ color, mode, blocked }: { color: string; mode: CityViewMode; blocked: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.035, 0]} receiveShadow>
        <cylinderGeometry args={[0.78, 0.88, 0.07, 8]} />
        <meshStandardMaterial
          color={blocked ? "#210817" : "#081322"}
          emissive={mode === "risk" || blocked ? color : "#02040a"}
          emissiveIntensity={blocked ? 0.28 : 0.12}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0.081, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.66, 64]} />
        <meshBasicMaterial color={color} transparent opacity={mode === "risk" ? 0.62 : 0.36} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function DistrictStreetGrid({ color }: { color: string }) {
  const roads = [
    { scale: [1.2, 1, 0.04], position: [0, 0.092, 0] },
    { scale: [0.04, 1, 1.2], position: [0, 0.094, 0] },
    { scale: [0.72, 1, 0.028], position: [0, 0.096, 0.32] },
    { scale: [0.72, 1, 0.028], position: [0, 0.098, -0.32] },
    { scale: [0.028, 1, 0.72], position: [0.32, 0.1, 0] },
    { scale: [0.028, 1, 0.72], position: [-0.32, 0.102, 0] }
  ] as const;

  return (
    <group>
      {roads.map((road, index) => (
        <mesh key={`district-road-${index}`} position={road.position} rotation={[-Math.PI / 2, 0, 0]} scale={road.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#030712" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[-0.42, 0, 0.42].map((x) => (
        <Line key={`lane-x-${x}`} points={[[x, 0.108, -0.54], [x, 0.108, 0.54]]} color={color} transparent opacity={0.14} />
      ))}
    </group>
  );
}

function DistrictPark({ color, progress }: { color: string; progress: number }) {
  const opacity = 0.18 + Math.min(0.42, progress / 180);
  return (
    <group position={[-0.42, 0.108, 0.42]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 32]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      {[-0.08, 0.02, 0.1].map((x, index) => (
        <mesh key={`park-spire-${index}`} position={[x, 0.04 + index * 0.01, index * -0.045]}>
          <coneGeometry args={[0.034, 0.08 + index * 0.025, 7]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function MicroBuilding({ building }: { building: MicroBuildingPlan }) {
  return (
    <group position={[building.x, 0, building.z]}>
      <mesh position={[0, building.height / 2 + 0.09, 0]} castShadow>
        <boxGeometry args={[building.width, building.height, building.width * 0.82]} />
        <meshStandardMaterial
          color={building.color}
          emissive={building.color}
          emissiveIntensity={0.08}
          metalness={0.12}
          roughness={0.58}
        />
      </mesh>
      <mesh position={[0, building.height + 0.105, 0]}>
        <boxGeometry args={[building.width * 0.68, 0.018, building.width * 0.62]} />
        <meshBasicMaterial color="#dff8ff" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

function CityTower({ accent, tower }: { accent: string; tower: TowerPlan }) {
  const bodyColor = tower.blocked ? "#35111e" : tower.completed ? accent : "#1c293b";
  const topColor = tower.blocked ? "#fb7185" : tower.completed ? "#dff8ff" : "#64748b";
  const opacity = tower.completed || tower.blocked ? 1 : 0.66;

  return (
    <group position={[tower.x, 0, tower.z]}>
      <TowerBody tower={tower} bodyColor={bodyColor} opacity={opacity} />
      <TowerCrown tower={tower} color={topColor} glow={tower.completed ? 0.58 : 0.22} />
      <WindowGrid tower={tower} color={tower.blocked ? "#fb7185" : "#7dd3fc"} />
      <RooftopDetails tower={tower} color={topColor} />
      {tower.blocked ? <BrokenDebris width={tower.width} /> : null}
    </group>
  );
}

function TowerBody({ tower, bodyColor, opacity }: { tower: TowerPlan; bodyColor: string; opacity: number }) {
  const material = (
    <meshStandardMaterial
      color={bodyColor}
      emissive={tower.completed || tower.blocked ? bodyColor : "#02040a"}
      emissiveIntensity={tower.completed ? 0.32 : tower.blocked ? 0.74 : 0.03}
      metalness={0.22}
      roughness={0.42}
      transparent={!tower.completed && !tower.blocked}
      opacity={opacity}
    />
  );

  if (tower.kind === "spire" || tower.kind === "needle") {
    return (
      <mesh position={[0, tower.height / 2 + 0.09, 0]} castShadow>
        <cylinderGeometry args={[tower.width * 0.42, tower.width * 0.72, tower.height, tower.kind === "needle" ? 6 : 9]} />
        {material}
      </mesh>
    );
  }

  if (tower.kind === "dome") {
    return (
      <group>
        <mesh position={[0, tower.height / 2 + 0.09, 0]} castShadow>
          <cylinderGeometry args={[tower.width * 0.72, tower.width * 0.78, tower.height * 0.78, 12]} />
          {material}
        </mesh>
        <mesh position={[0, tower.height * 0.84 + 0.1, 0]} castShadow>
          <sphereGeometry args={[tower.width * 0.76, 18, 10]} />
          {material}
        </mesh>
      </group>
    );
  }

  if (tower.kind === "terrace") {
    return (
      <group>
        <mesh position={[0, tower.height * 0.25 + 0.09, 0]} castShadow>
          <boxGeometry args={[tower.width * 1.28, tower.height * 0.5, tower.depth * 1.28]} />
          {material}
        </mesh>
        <mesh position={[0.025, tower.height * 0.66 + 0.09, -0.018]} castShadow>
          <boxGeometry args={[tower.width, tower.height * 0.46, tower.depth]} />
          {material}
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[0, tower.height / 2 + 0.09, 0]} castShadow>
      <boxGeometry args={[tower.width * 1.55, tower.height, tower.depth]} />
      {material}
    </mesh>
  );
}

function TowerCrown({ tower, color, glow }: { tower: TowerPlan; color: string; glow: number }) {
  return (
    <mesh position={[0, tower.height + 0.16, 0]} castShadow>
      {tower.blocked ? (
        <boxGeometry args={[tower.width * 1.12, 0.075, tower.depth * 0.78]} />
      ) : tower.kind === "dome" ? (
        <sphereGeometry args={[tower.width * 0.38, 14, 8]} />
      ) : tower.kind === "slab" ? (
        <boxGeometry args={[tower.width * 1.35, 0.055, tower.depth * 0.9]} />
      ) : (
        <coneGeometry args={[tower.width * 0.65, 0.18, tower.kind === "needle" ? 6 : 8]} />
      )}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} />
    </mesh>
  );
}

function WindowGrid({ tower, color }: { tower: TowerPlan; color: string }) {
  const rows = Math.max(3, Math.min(9, Math.floor(tower.height / 0.11)));
  const cols = tower.kind === "slab" ? 3 : 2;
  return (
    <>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const y = 0.18 + row * (tower.height / (rows + 1));
          const x = (col - (cols - 1) / 2) * tower.width * 0.32;
          return (
            <mesh key={`window-${row}-${col}`} position={[x, y, tower.depth / 2 + 0.003]}>
              <boxGeometry args={[tower.width * 0.16, 0.012, 0.004]} />
              <meshBasicMaterial color={color} transparent opacity={tower.completed ? 0.62 : 0.38} />
            </mesh>
          );
        })
      )}
    </>
  );
}

function RooftopDetails({ tower, color }: { tower: TowerPlan; color: string }) {
  return (
    <group position={[0, tower.height + 0.2, 0]}>
      <mesh position={[tower.width * 0.32, 0.015, 0]}>
        <boxGeometry args={[0.026, 0.03, 0.026]} />
        <meshBasicMaterial color={color} transparent opacity={0.72} />
      </mesh>
      <Line points={[[0, 0.02, 0], [0, 0.16, 0]]} color={color} transparent opacity={0.56} />
    </group>
  );
}

function BrokenDebris({ width }: { width: number }) {
  return (
    <group>
      <mesh position={[width * 0.86, 0.12, width * 0.45]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial color="#fb7185" emissive="#fb7185" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-width * 0.74, 0.08, -width * 0.55]} rotation={[0.2, 0.6, 0.1]} castShadow>
        <boxGeometry args={[0.1, 0.06, 0.08]} />
        <meshStandardMaterial color="#7f1d1d" emissive="#fb7185" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Skybridges({ towers, accent }: { towers: TowerPlan[]; accent: string }) {
  const completed = towers.filter((tower) => tower.completed && !tower.blocked).slice(0, 6);
  if (completed.length < 2) return null;

  return (
    <group>
      {completed.slice(1).map((tower, index) => {
        const previous = completed[index];
        const y = Math.min(previous.height, tower.height) * 0.68 + 0.16;
        return (
          <Line
            key={`bridge-${tower.id}`}
            points={[[previous.x, y, previous.z], [tower.x, y, tower.z]]}
            color={accent}
            lineWidth={2}
            transparent
            opacity={0.42}
          />
        );
      })}
    </group>
  );
}

function TransitStop({ accent, index }: { accent: string; index: number }) {
  return (
    <group position={[0.54, 0.13, -0.46]} rotation={[0, index * 0.4, 0]}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.055, 0.13, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.005, 8, 32]} />
        <meshBasicMaterial color="#dff8ff" transparent opacity={0.76} />
      </mesh>
    </group>
  );
}

function DamageCluster({ accent, count }: { accent: string; count: number }) {
  return (
    <group position={[0.42, 0.16, -0.46]}>
      {Array.from({ length: Math.min(5, count + 1) }, (_, index) => (
        <mesh key={`damage-${index}`} position={[index * 0.045 - 0.08, index * 0.025, (index % 2) * 0.05]} castShadow>
          <boxGeometry args={[0.055, 0.055, 0.055]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
        </mesh>
      ))}
      <pointLight intensity={1.25} color={accent} distance={1.4} />
    </group>
  );
}

function RiskHalo({ feature }: { feature: FeaturePlanet }) {
  const danger = feature.blockedTaskCount > 0 || feature.progress < 35;
  return (
    <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.76, 0.82, 72]} />
      <meshBasicMaterial
        color={danger ? "#fb7185" : "#48e5ff"}
        transparent
        opacity={danger ? 0.46 : 0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ConstructionCrane({ accent, progress }: { accent: string; progress: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.52) * 0.2;
  });
  return (
    <group ref={group} position={[-0.55, 0.16 + progress / 520, 0.48]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.035, 0.4, 0.035]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0.18, 0.4, 0]}>
        <boxGeometry args={[0.4, 0.026, 0.026]} />
        <meshStandardMaterial color="#dff8ff" emissive={accent} emissiveIntensity={0.25} />
      </mesh>
      <Line points={[[0.36, 0.39, 0], [0.36, 0.16, 0]]} color="#f5c451" lineWidth={1} transparent opacity={0.75} />
    </group>
  );
}

function TransitLines({ districts, style, mode }: { districts: DistrictPlan[]; style: CityStyle; mode: CityViewMode }) {
  const pulse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    pulse.current.children.forEach((child, index) => {
      const district = districts[index % districts.length];
      const phase = (clock.getElapsedTime() * 0.42 + index * 0.19) % 1;
      child.position.set(district.position[0] * phase, 0.1, district.position[2] * phase);
    });
  });

  return (
    <group>
      {districts.map((district) => (
        <Line
          key={`transit-${district.feature.id}`}
          points={[[0, 0.09, 0], [district.position[0], 0.09, district.position[2]]]}
          color={mode === "risk" && district.feature.blockedTaskCount > 0 ? "#fb7185" : style.secondary}
          lineWidth={mode === "street" ? 2.4 : 1.4}
          transparent
          opacity={mode === "risk" ? 0.54 : 0.34}
        />
      ))}
      <group ref={pulse}>
        {districts.map((district) => (
          <mesh key={`transit-pulse-${district.feature.id}`}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshBasicMaterial
              color={district.feature.blockedTaskCount > 0 ? "#fb7185" : "#48e5ff"}
              transparent
              opacity={0.86}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function StreetScanner({ accent }: { accent: string }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const scale = 0.8 + (clock.getElapsedTime() % 2.4) * 0.7;
    ring.current.scale.setScalar(scale);
  });
  return (
    <mesh ref={ring} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.72, 0.75, 72]} />
      <meshBasicMaterial color={accent} transparent opacity={0.36} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CityBase({ style, mode }: { style: CityStyle; mode: CityViewMode }) {
  return (
    <group>
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[2.82, 3.02, 0.024, 96]} />
        <meshStandardMaterial color="#030712" emissive={style.accent} emissiveIntensity={0.05} roughness={0.82} />
      </mesh>
      {[0.92, 1.62, 2.24, 2.68].map((radius, index) => (
        <mesh key={`base-ring-${radius}`} position={[0, 0.02 + index * 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.018, 96]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? style.accent : style.secondary}
            transparent
            opacity={mode === "risk" ? 0.32 : 0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function ElevatedLoop({ style }: { style: CityStyle }) {
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const angle = clock.getElapsedTime() * 0.38;
    pulse.current.position.set(Math.cos(angle) * 2.02, 0.23, Math.sin(angle) * 2.02);
  });

  return (
    <group>
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.02, 0.014, 8, 140]} />
        <meshBasicMaterial color={style.secondary} transparent opacity={0.32} />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshBasicMaterial color="#dff8ff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function RoadNetwork({ style }: { style: CityStyle }) {
  const roads = [
    { position: [0, 0.034, 0] as [number, number, number], scale: [0.12, 1, 5.42] as [number, number, number] },
    { position: [0, 0.036, 0] as [number, number, number], scale: [5.42, 1, 0.12] as [number, number, number] },
    { position: [0, 0.038, 0] as [number, number, number], scale: [0.07, 1, 4.4] as [number, number, number], rotation: Math.PI / 4 },
    { position: [0, 0.04, 0] as [number, number, number], scale: [0.07, 1, 4.4] as [number, number, number], rotation: -Math.PI / 4 }
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
          <meshBasicMaterial color="#07111f" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.74, 0.79, 64]} />
        <meshBasicMaterial color={style.accent} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function HologramNeedles({ accent, count, radius }: { accent: string; count: number; radius: number }) {
  const needles = Math.min(10, Math.max(4, count));
  return (
    <group>
      {Array.from({ length: needles }, (_, index) => {
        const angle = (index / needles) * Math.PI * 2;
        return (
          <Line
            key={`needle-${index}`}
            points={[
              [Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius],
              [Math.cos(angle) * radius, 0.42 + (index % 3) * 0.1, Math.sin(angle) * radius]
            ]}
            color={accent}
            transparent
            opacity={0.28}
          />
        );
      })}
    </group>
  );
}

function CityTraffic({ accent }: { accent: string }) {
  const traffic = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (traffic.current) {
      traffic.current.rotation.y = clock.getElapsedTime() * 0.18;
    }
  });

  return (
    <group ref={traffic}>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <group key={`transit-pod-${index}`} rotation={[0, angle, 0]}>
            <mesh position={[2.02, 0.26 + (index % 2) * 0.035, 0]}>
              <capsuleGeometry args={[0.025, 0.075, 4, 8]} />
              <meshStandardMaterial color="#dff8ff" emissive={accent} emissiveIntensity={1.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function OuterCityDetails({ style, project }: { style: CityStyle; project: ProjectSummary }) {
  const buildingCount = Math.max(30, Math.min(54, project.taskCount + 22));
  const completedRatio = project.progress / 100;

  return (
    <group>
      <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.18, 2.34, 128]} />
        <meshStandardMaterial color="#071827" emissive={style.accent} emissiveIntensity={0.1} roughness={0.3} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle) => (
        <group key={`city-gate-${angle}`} rotation={[0, angle, 0]}>
          <mesh position={[2.26, 0.09, 0]}>
            <boxGeometry args={[0.34, 0.035, 0.13]} />
            <meshStandardMaterial color="#dff8ff" emissive={style.secondary} emissiveIntensity={0.44} />
          </mesh>
          <mesh position={[2.48, 0.18, 0]}>
            <boxGeometry args={[0.035, 0.28, 0.035]} />
            <meshBasicMaterial color={style.secondary} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: buildingCount }, (_, index) => {
        const angle = (index / buildingCount) * Math.PI * 2 + project.codename.length * 0.17;
        const radius = 2.5 + (index % 3) * 0.24;
        const completed = index / buildingCount <= completedRatio;
        const blocked = project.blockedTaskCount > 0 && index % Math.max(6, buildingCount - project.blockedTaskCount) === 0;
        const height = 0.16 + ((index * 7 + project.name.length) % 8) * 0.055;
        const width = 0.1 + (index % 3) * 0.025;
        const color = blocked ? "#fb7185" : completed ? style.secondary : style.baseColor;
        return (
          <group
            key={`outer-${index}`}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            rotation={[0, -angle, 0]}
          >
            <mesh position={[0, height / 2 + 0.045, 0]} castShadow>
              {index % 4 === 0 ? (
                <cylinderGeometry args={[width * 0.62, width, height, 8]} />
              ) : (
                <boxGeometry args={[width, height, width * 0.78]} />
              )}
              <meshStandardMaterial
                color={blocked ? "#30101c" : completed ? style.baseColor : "#101827"}
                emissive={color}
                emissiveIntensity={blocked ? 0.68 : completed ? 0.2 : 0.04}
                metalness={0.18}
                roughness={0.48}
              />
            </mesh>
            <mesh position={[0, height + 0.052, 0]}>
              <boxGeometry args={[width * 0.72, 0.018, width * 0.58]} />
              <meshBasicMaterial color={color} transparent opacity={completed ? 0.74 : 0.22} />
            </mesh>
            {index % 5 === 0 ? (
              <group position={[width * 1.3, 0.07, width * 0.9]}>
                <mesh position={[0, 0.07, 0]}>
                  <cylinderGeometry args={[0.012, 0.016, 0.12, 6]} />
                  <meshStandardMaterial color="#365314" />
                </mesh>
                <mesh position={[0, 0.16, 0]}>
                  <coneGeometry args={[0.07, 0.16, 7]} />
                  <meshStandardMaterial color={style.parkColor} emissive={style.parkColor} emissiveIntensity={0.1} />
                </mesh>
              </group>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function buildDistricts(project: ProjectSummary, style: CityStyle): DistrictPlan[] {
  const radius = 1.48;
  return project.planets.map((feature, index) => {
    const angle = (index / Math.max(1, project.planets.length)) * Math.PI * 2 + Math.PI / 4;
    return {
      feature,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
      rotation: -angle + Math.PI / 2,
      towers: buildTowers(feature, style),
      microBuildings: buildMicroBuildings(feature, style)
    };
  });
}

function buildTowers(feature: FeaturePlanet, style: CityStyle): TowerPlan[] {
  const count = Math.max(8, Math.min(22, Math.ceil(feature.taskCount * 0.68 + style.density * 3)));
  const completedCount = Math.round(count * (feature.progress / 100));
  const blockedCount = Math.min(feature.blockedTaskCount, count);
  const columns = Math.ceil(Math.sqrt(count));
  const kinds: TowerPlan["kind"][] = ["spire", "terrace", "dome", "slab", "needle"];

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const completed = index < completedCount;
    const blocked = index >= count - blockedCount;
    const width = 0.1 + ((index + feature.id.length) % 4) * 0.014;
    const depth = 0.1 + ((index + feature.name.length) % 3) * 0.018;
    return {
      id: `${feature.id}-${index}`,
      x: column * 0.19 - ((columns - 1) * 0.19) / 2,
      z: row * 0.19 - ((Math.ceil(count / columns) - 1) * 0.19) / 2,
      height: blocked
        ? 0.18 + (index % 2) * 0.08
        : completed
          ? 0.32 + ((index * 5 + feature.name.length) % 8) * 0.08
          : 0.12 + (index % 3) * 0.035,
      width,
      depth,
      kind: kinds[(index + feature.name.length) % kinds.length],
      completed,
      blocked
    };
  });
}

function buildMicroBuildings(feature: FeaturePlanet, style: CityStyle): MicroBuildingPlan[] {
  const count = Math.max(8, Math.min(18, Math.ceil(feature.taskCount * 0.38 + style.density * 4)));
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399 + feature.name.length;
    const radius = 0.2 + ((index * 17) % 42) / 100;
    return {
      id: `${feature.id}-micro-${index}`,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height: 0.08 + ((index * 11 + feature.progress) % 9) * 0.025,
      width: 0.045 + (index % 3) * 0.012,
      color: feature.blockedTaskCount > 0 && index % 5 === 0 ? "#3b101c" : style.baseColor
    };
  });
}

function getCityStyle(project: ProjectSummary): CityStyle {
  if (project.health === "at_risk" || project.blockedTaskCount >= 3) {
    return {
      name: "risk industrial",
      baseColor: "#1f1421",
      accent: "#f5c451",
      secondary: "#fb7185",
      parkColor: "#65a30d",
      density: 1.18,
      coreShape: "reactor"
    };
  }

  if (project.health === "excellent" || project.healthScore >= 84) {
    return {
      name: "crystal command",
      baseColor: "#081827",
      accent: project.accent,
      secondary: "#dff8ff",
      parkColor: "#4ade80",
      density: 1.08,
      coreShape: project.priority === "critical" ? "citadel" : "spire"
    };
  }

  return {
    name: "garden grid",
    baseColor: "#0b1728",
    accent: project.accent,
    secondary: "#8d67ff",
    parkColor: "#4ade80",
    density: 0.96,
    coreShape: "spire"
  };
}

function CityCamera({
  controls,
  mode,
  projectId,
  resetSignal
}: {
  controls: MutableRefObject<OrbitControlsHandle | null>;
  mode: CityViewMode;
  projectId: string;
  resetSignal: number;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = Math.max(0.6, size.width / Math.max(1, size.height));
    const radius = mode === "street" ? 1.55 : mode === "risk" ? 4.35 : 4.15;
    const padding = mode === "street" ? 1.06 : 1.24;
    const distance = fitPerspectiveDistance(camera.fov, aspect, radius) * padding;
    const direction =
      mode === "street"
        ? new THREE.Vector3(1.2, 0.17, 1.6)
        : mode === "risk"
          ? new THREE.Vector3(0.05, 1, 0.26)
          : new THREE.Vector3(0.78, 0.56, 1);

    camera.position.copy(CITY_TARGET).add(direction.normalize().multiplyScalar(distance));
    camera.near = 0.05;
    camera.far = 180;
    camera.updateProjectionMatrix();
    camera.lookAt(CITY_TARGET);
    controls.current?.target.copy(CITY_TARGET);
    controls.current?.update();
  }, [camera, controls, mode, projectId, resetSignal, size.height, size.width]);

  return null;
}

function fitPerspectiveDistance(fovDegrees: number, aspect: number, radius: number) {
  const verticalFov = THREE.MathUtils.degToRad(fovDegrees);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  return radius / Math.sin(limitingFov / 2);
}

export default function CityScene({
  project,
  mode = "overview",
  resetSignal = 0
}: {
  project: ProjectSummary;
  mode?: CityViewMode;
  resetSignal?: number;
}) {
  const style = getCityStyle(project);
  const controls = useRef<OrbitControlsHandle>(null);
  const minDistance = mode === "street" ? 1.4 : 2.2;
  const maxDistance = mode === "street" ? 18 : mode === "risk" ? 40 : 42;

  return (
    <Canvas camera={{ position: [5.4, 4.15, 6.1], fov: 52 }} dpr={[1, 1.75]} shadows>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 35, 90]} />
      <ambientLight intensity={0.64} />
      <directionalLight position={[2.5, 5, 3.5]} intensity={2.6} color="#dff8ff" castShadow />
      <pointLight position={[-3, 2.2, 1.6]} intensity={2.2} color="#8d67ff" />
      <pointLight position={[2.5, 1.2, -2]} intensity={1.8} color={style.accent} />
      <Grid
        position={[0, -0.005, 0]}
        args={[16, 16]}
        cellSize={0.25}
        cellThickness={0.28}
        cellColor="#102238"
        sectionSize={1}
        sectionThickness={0.7}
        sectionColor="#245b78"
        fadeDistance={34}
        infiniteGrid
      />
      <CityCamera controls={controls} mode={mode} projectId={project.id} resetSignal={resetSignal} />
      <ProjectCity project={project} mode={mode} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={0.82}
        rotateSpeed={0.68}
        panSpeed={0.48}
        screenSpacePanning
        zoomToCursor
        minDistance={minDistance}
        maxDistance={maxDistance}
        minPolarAngle={0.06}
        maxPolarAngle={mode === "street" ? Math.PI / 2 - 0.02 : Math.PI - 0.12}
        target={CITY_TARGET}
      />
    </Canvas>
  );
}
