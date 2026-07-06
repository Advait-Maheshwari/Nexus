import { Billboard, Line, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { TimelineNode, WorkStatus } from "@/types/domain";

const statusColor: Record<WorkStatus, string> = {
  backlog: "#64748b",
  ready: "#48e5ff",
  in_progress: "#4f8cff",
  blocked: "#fb7185",
  done: "#4ade80",
  archived: "#475569"
};

function CameraRig({ activeIndex }: { activeIndex: number }) {
  const { camera } = useThree();
  const targetPosition = useMemo(() => new THREE.Vector3(0, 0.15, 3 - activeIndex * 0.78), [activeIndex]);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0, -activeIndex * 0.78), [activeIndex]);
  useFrame(() => {
    camera.position.lerp(targetPosition, 0.075);
    camera.lookAt(lookTarget);
  });
  return null;
}

function TimelinePoint({
  node,
  index,
  active,
  onSelect
}: {
  node: TimelineNode;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const angle = index * 1.05;
  const position: [number, number, number] = [
    Math.cos(angle) * 0.82,
    Math.sin(angle) * 0.46,
    -index * 0.78
  ];
  const color = statusColor[node.status];

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const pulse = active ? 1.2 + Math.sin(clock.getElapsedTime() * 2.2) * 0.12 : 1;
    mesh.current.scale.setScalar(pulse);
  });

  return (
    <group position={position}>
      <mesh
        ref={mesh}
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
        <sphereGeometry args={[active ? 0.13 : 0.095, 28, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={node.status === "done" ? 1.15 : active ? 0.92 : 0.34}
          transparent={node.status === "backlog" || node.status === "ready"}
          opacity={node.status === "backlog" ? 0.38 : node.status === "ready" ? 0.7 : 1}
          roughness={0.28}
        />
      </mesh>
      <mesh scale={active ? 1.9 : 1.45}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.13 : 0.05} depthWrite={false} />
      </mesh>
      {active ? (
        <Billboard position={[position[0] > 0 ? 0.32 : -0.32, 0.02, 0]}>
          <Text
            fontSize={0.085}
            color="#dff8ff"
            anchorX={position[0] > 0 ? "left" : "right"}
            maxWidth={1.4}
          >
            {node.label}
          </Text>
          <Text
            position={[0, -0.12, 0]}
            fontSize={0.047}
            color="#94a3b8"
            anchorX={position[0] > 0 ? "left" : "right"}
          >
            {node.date}
          </Text>
        </Billboard>
      ) : null}
    </group>
  );
}

function Helix({
  nodes,
  activeIndex,
  onSelect
}: {
  nodes: TimelineNode[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const strandA = useMemo(
    () =>
      Array.from({ length: Math.max(40, nodes.length * 10) }, (_, index) => {
        const step = index / 10;
        return [Math.cos(step * 1.05) * 0.82, Math.sin(step * 1.05) * 0.46, -step * 0.78] as [
          number,
          number,
          number
        ];
      }),
    [nodes.length]
  );
  const strandB = useMemo(
    () => strandA.map(([x, y, z]) => [-x, -y, z] as [number, number, number]),
    [strandA]
  );

  return (
    <group>
      <Line points={strandA} color="#48e5ff" lineWidth={1.1} transparent opacity={0.36} />
      <Line points={strandB} color="#8d67ff" lineWidth={1.1} transparent opacity={0.36} />
      {nodes.map((node, index) => {
        const angle = index * 1.05;
        const a: [number, number, number] = [
          Math.cos(angle) * 0.82,
          Math.sin(angle) * 0.46,
          -index * 0.78
        ];
        const b: [number, number, number] = [-a[0], -a[1], a[2]];
        return (
          <group key={node.id}>
            <Line points={[a, b]} color={statusColor[node.status]} lineWidth={0.7} transparent opacity={0.2} />
            <TimelinePoint
              node={node}
              index={index}
              active={index === activeIndex}
              onSelect={() => onSelect(index)}
            />
          </group>
        );
      })}
    </group>
  );
}

export default function DnaScene({
  nodes,
  activeIndex,
  onSelect
}: {
  nodes: TimelineNode[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0.15, 3], fov: 48 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 5, 12]} />
      <ambientLight intensity={0.85} />
      <pointLight position={[2, 2, 3]} intensity={2.2} color="#48e5ff" />
      <pointLight position={[-2, -1, 1]} intensity={1.8} color="#8d67ff" />
      <CameraRig activeIndex={activeIndex} />
      <Helix nodes={nodes} activeIndex={activeIndex} onSelect={onSelect} />
    </Canvas>
  );
}
