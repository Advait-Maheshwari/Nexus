import { Line, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { TimelineNode, WorkStatus } from "@/types/domain";

export type TimeTunnelMode = "mission" | "risk" | "forecast";

const statusColor: Record<WorkStatus, string> = {
  backlog: "#64748b",
  ready: "#48e5ff",
  in_progress: "#f5c451",
  blocked: "#fb7185",
  done: "#4ade80",
  archived: "#475569"
};

function nodeColor(node: TimelineNode, mode: TimeTunnelMode) {
  if (mode === "risk" && node.status !== "done") {
    return node.status === "blocked" ? "#fb7185" : "#f5c451";
  }
  if (mode === "forecast" && node.status === "backlog") {
    return "#8d67ff";
  }
  return statusColor[node.status];
}

function tunnelPoint(index: number, activeIndex: number): [number, number, number] {
  const depth = (index - activeIndex) * -1.25;
  const angle = index * 0.82;
  const radius = 1.08 + (index % 3) * 0.18;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.62, depth];
}

function TimeNode({
  node,
  index,
  activeIndex,
  mode,
  onSelect
}: {
  node: TimelineNode;
  index: number;
  activeIndex: number;
  mode: TimeTunnelMode;
  onSelect: (index: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const color = nodeColor(node, mode);
  const active = index === activeIndex;
  const completed = node.status === "done";
  const future = index > activeIndex;
  const position = tunnelPoint(index, activeIndex);
  const scale = active ? 1.28 : completed ? 0.9 : 1;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 2.1 + index) * (active ? 0.07 : 0.025);
    group.current.scale.setScalar(scale * pulse);
  });

  return (
    <group ref={group} position={position} onClick={(event) => {
      event.stopPropagation();
      onSelect(index);
    }}>
      <mesh>
        {node.type === "milestone" ? (
          <octahedronGeometry args={[0.18, 0]} />
        ) : node.type === "feature" ? (
          <boxGeometry args={[0.28, 0.28, 0.28]} />
        ) : node.type === "event" ? (
          <tetrahedronGeometry args={[0.21, 0]} />
        ) : (
          <sphereGeometry args={[0.18, 24, 24]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 1.1 : completed ? 0.6 : 0.28}
          metalness={0.25}
          roughness={0.3}
          transparent
          opacity={future ? 0.52 : 1}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.29, 0.305, 44]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.78 : 0.32} side={THREE.DoubleSide} />
      </mesh>
      {node.status === "blocked" ? (
        <group>
          <Line points={[[-0.28, 0.22, 0], [0.26, -0.22, 0]]} color="#fb7185" lineWidth={1.8} />
          <pointLight color="#fb7185" intensity={1.3} distance={1.4} />
        </group>
      ) : null}
      {active ? (
        <Text position={[0, -0.46, 0]} fontSize={0.085} color="#ffffff" anchorX="center" maxWidth={1.25}>
          {node.label}
        </Text>
      ) : null}
    </group>
  );
}

function TunnelRings({ nodes, activeIndex, mode }: { nodes: TimelineNode[]; activeIndex: number; mode: TimeTunnelMode }) {
  return (
    <group>
      {nodes.map((node, index) => {
        const z = (index - activeIndex) * -1.25;
        const active = index === activeIndex;
        const color = nodeColor(node, mode);
        return (
          <mesh key={`ring-${node.id}`} position={[0, 0, z]} rotation={[0, 0, index * 0.28]}>
            <torusGeometry args={[1.45 + (index % 2) * 0.13, active ? 0.014 : 0.007, 8, 96]} />
            <meshBasicMaterial color={color} transparent opacity={active ? 0.56 : 0.18} />
          </mesh>
        );
      })}
    </group>
  );
}

function EnergyStream({ nodes, activeIndex, mode }: { nodes: TimelineNode[]; activeIndex: number; mode: TimeTunnelMode }) {
  const stream = useRef<THREE.Group>(null);
  const anchors = useMemo(
    () => nodes.map((_, index) => new THREE.Vector3(...tunnelPoint(index, activeIndex))),
    [activeIndex, nodes]
  );

  useFrame(({ clock }) => {
    if (!stream.current || anchors.length === 0) return;
    stream.current.children.forEach((child, index) => {
      const phase = (clock.getElapsedTime() * 0.32 + index / 14) % 1;
      const scaled = phase * Math.max(1, anchors.length - 1);
      const from = Math.floor(scaled);
      const to = Math.min(anchors.length - 1, from + 1);
      const mixed = anchors[from].clone().lerp(anchors[to], scaled - from);
      child.position.copy(mixed);
    });
  });

  return (
    <group>
      {anchors.length > 1 ? (
        <Line
          points={anchors.map((point) => [point.x, point.y, point.z])}
          color={mode === "risk" ? "#fb7185" : "#48e5ff"}
          lineWidth={1.6}
          transparent
          opacity={0.34}
        />
      ) : null}
      <group ref={stream}>
        {Array.from({ length: 18 }, (_, index) => (
          <mesh key={`stream-${index}`}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshBasicMaterial color={mode === "forecast" ? "#8d67ff" : "#48e5ff"} transparent opacity={0.82} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function TimeTunnelCamera({ activeIndex, mode }: { activeIndex: number; mode: TimeTunnelMode }) {
  const { camera } = useThree();
  const target = useMemo(() => {
    if (mode === "risk") return new THREE.Vector3(0.35, 0.28, 4.1);
    if (mode === "forecast") return new THREE.Vector3(-0.55, 0.18, 4.7);
    return new THREE.Vector3(0, 0.1, 4.35);
  }, [mode]);
  useFrame(({ clock }) => {
    camera.position.lerp(target, 0.075);
    camera.rotation.z = Math.sin(clock.getElapsedTime() * 0.3 + activeIndex) * 0.015;
    camera.lookAt(0, 0, -1.2);
  });
  return null;
}

function Starfield() {
  const points = useMemo(() => {
    return Array.from({ length: 180 }, (_, index) => {
      const angle = index * 2.399;
      const radius = 2.2 + ((index * 37) % 100) / 42;
      const z = -((index * 19) % 170) / 8;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, z] as [number, number, number];
    });
  }, []);

  return (
    <group>
      {points.map((point, index) => (
        <mesh key={`star-${index}`} position={point}>
          <sphereGeometry args={[0.008 + (index % 3) * 0.004, 6, 6]} />
          <meshBasicMaterial color={index % 5 === 0 ? "#8d67ff" : "#94ccff"} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function TimeTunnelScene({
  nodes,
  activeIndex,
  mode = "mission",
  onSelect
}: {
  nodes: TimelineNode[];
  activeIndex: number;
  mode?: TimeTunnelMode;
  onSelect: (index: number) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0.1, 4.35], fov: 46 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 3.8, 13]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 0, 2.8]} intensity={2.2} color="#48e5ff" />
      <pointLight position={[1.8, 1.2, -2]} intensity={1.5} color="#8d67ff" />
      <TimeTunnelCamera activeIndex={activeIndex} mode={mode} />
      <Starfield />
      <TunnelRings nodes={nodes} activeIndex={activeIndex} mode={mode} />
      <EnergyStream nodes={nodes} activeIndex={activeIndex} mode={mode} />
      {nodes.map((node, index) => (
        <TimeNode
          key={node.id}
          node={node}
          index={index}
          activeIndex={activeIndex}
          mode={mode}
          onSelect={onSelect}
        />
      ))}
    </Canvas>
  );
}
