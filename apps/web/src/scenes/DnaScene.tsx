import { Billboard, Line, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { TimelineNode, WorkStatus } from "@/types/domain";

export type GenomeMode = "sequence" | "risk" | "next";

const statusColor: Record<WorkStatus, string> = {
  backlog: "#64748b",
  ready: "#48e5ff",
  in_progress: "#4f8cff",
  blocked: "#fb7185",
  done: "#4ade80",
  archived: "#475569"
};

const typeShape: Record<TimelineNode["type"], "sphere" | "box" | "octa" | "cone"> = {
  milestone: "octa",
  task: "sphere",
  feature: "box",
  event: "cone"
};

function helixPoint(index: number, phase = 0): THREE.Vector3 {
  const angle = index * 1.02 + phase;
  return new THREE.Vector3(Math.cos(angle) * 0.92, Math.sin(angle) * 0.5, -index * 0.78);
}

function CameraRig({ activeIndex }: { activeIndex: number }) {
  const { camera } = useThree();
  const targetPosition = useMemo(
    () => new THREE.Vector3(0.18, 0.22, 3.05 - activeIndex * 0.78),
    [activeIndex]
  );
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0, -activeIndex * 0.78), [activeIndex]);

  useFrame(() => {
    camera.position.lerp(targetPosition, 0.075);
    camera.lookAt(lookTarget);
  });

  return null;
}

function GenomeNode({
  node,
  index,
  active,
  mode,
  onSelect
}: {
  node: TimelineNode;
  index: number;
  active: boolean;
  mode: GenomeMode;
  onSelect: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const position = helixPoint(index);
  const color = node.status === "blocked" || (mode === "risk" && node.status !== "done")
    ? "#fb7185"
    : mode === "next" && (node.status === "ready" || node.status === "in_progress")
      ? "#f5c451"
      : statusColor[node.status];
  const shape = typeShape[node.type];

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (mesh.current) {
      const pulse = active ? 1.28 + Math.sin(elapsed * 2.4) * 0.12 : 1;
      mesh.current.scale.setScalar(pulse);
      mesh.current.rotation.y = elapsed * 0.65 + index;
      mesh.current.rotation.x = Math.sin(elapsed * 0.45 + index) * 0.16;
    }
    if (halo.current) {
      halo.current.scale.setScalar(active ? 2.1 + Math.sin(elapsed * 2.2) * 0.2 : 1.45);
    }
  });

  return (
    <group position={position.toArray()}>
      <mesh
        ref={mesh}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        {shape === "sphere" ? <sphereGeometry args={[active ? 0.14 : 0.1, 32, 32]} /> : null}
        {shape === "box" ? <boxGeometry args={[0.18, 0.18, 0.18]} /> : null}
        {shape === "octa" ? <octahedronGeometry args={[active ? 0.17 : 0.12, 1]} /> : null}
        {shape === "cone" ? <coneGeometry args={[0.11, 0.22, 5]} /> : null}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={node.status === "done" ? 1.15 : active ? 1 : 0.38}
          transparent={node.status === "backlog" || node.status === "ready"}
          opacity={node.status === "backlog" ? 0.34 : node.status === "ready" ? 0.74 : 1}
          roughness={0.25}
          metalness={0.12}
        />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.16 : node.status === "blocked" ? 0.09 : 0.045}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {node.status === "blocked" || (mode === "risk" && node.status !== "done") ? (
        <RiskFracture color="#fb7185" />
      ) : null}
      {active ? (
        <Billboard position={[position.x > 0 ? 0.35 : -0.35, 0.03, 0]}>
          <Text
            fontSize={0.088}
            color="#dff8ff"
            anchorX={position.x > 0 ? "left" : "right"}
            maxWidth={1.45}
          >
            {node.label}
          </Text>
          <Text
            position={[0, -0.12, 0]}
            fontSize={0.047}
            color={color}
            anchorX={position.x > 0 ? "left" : "right"}
          >
            {node.type.toUpperCase()} / {node.date}
          </Text>
        </Billboard>
      ) : null}
    </group>
  );
}

function RiskFracture({ color }: { color: string }) {
  const pointsA: [number, number, number][] = [
    [-0.13, -0.1, 0.04],
    [-0.02, 0.02, -0.03],
    [0.1, 0.12, 0.04]
  ];
  const pointsB: [number, number, number][] = [
    [0.12, -0.1, -0.03],
    [0.01, 0.03, 0.05],
    [-0.09, 0.13, -0.02]
  ];
  return (
    <group>
      <Line points={pointsA} color={color} lineWidth={1.7} transparent opacity={0.85} />
      <Line points={pointsB} color={color} lineWidth={1.3} transparent opacity={0.65} />
    </group>
  );
}

function GenomeHelix({
  nodes,
  activeIndex,
  mode,
  onSelect
}: {
  nodes: TimelineNode[];
  activeIndex: number;
  mode: GenomeMode;
  onSelect: (index: number) => void;
}) {
  const strandA = useMemo(
    () =>
      Array.from({ length: Math.max(72, nodes.length * 14) }, (_, index) =>
        helixPoint(index / 1.4).toArray() as [number, number, number]
      ),
    [nodes.length]
  );
  const strandB = useMemo(
    () => strandA.map(([x, y, z]) => [-x, -y, z] as [number, number, number]),
    [strandA]
  );
  const statusSegments = useMemo(
    () =>
      nodes.map((node, index) => {
        const a = helixPoint(index);
        const b = helixPoint(index, Math.PI);
        return { node, a, b };
      }),
    [nodes]
  );

  return (
    <group>
      <Line points={strandA} color="#48e5ff" lineWidth={1.45} transparent opacity={0.42} />
      <Line points={strandB} color="#8d67ff" lineWidth={1.45} transparent opacity={0.42} />
      <EnergyParticles activeIndex={activeIndex} nodes={nodes} />
      {statusSegments.map(({ node, a, b }, index) => {
        const bridgeColor =
          mode === "risk" && node.status !== "done" ? "#fb7185" : statusColor[node.status];
        return (
          <group key={node.id}>
            <Line
              points={[a.toArray() as [number, number, number], b.toArray() as [number, number, number]]}
              color={bridgeColor}
              lineWidth={node.status === "blocked" ? 1.5 : 0.85}
              transparent
              opacity={index === activeIndex ? 0.55 : node.status === "done" ? 0.32 : 0.22}
            />
            {index < nodes.length - 1 ? (
              <DependencyArc
                from={a}
                to={helixPoint(index + 1)}
                color={node.status === "blocked" ? "#fb7185" : "#48e5ff"}
                active={index === activeIndex || index + 1 === activeIndex}
              />
            ) : null}
            <GenomeNode
              node={node}
              index={index}
              active={index === activeIndex}
              mode={mode}
              onSelect={() => onSelect(index)}
            />
          </group>
        );
      })}
    </group>
  );
}

function DependencyArc({
  from,
  to,
  color,
  active
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
  active: boolean;
}) {
  const points = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.34;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return curve.getPoints(18).map((point) => point.toArray() as [number, number, number]);
  }, [from, to]);
  return (
    <Line
      points={points}
      color={color}
      lineWidth={active ? 1.5 : 0.8}
      transparent
      opacity={active ? 0.52 : 0.16}
    />
  );
}

function EnergyParticles({ nodes, activeIndex }: { nodes: TimelineNode[]; activeIndex: number }) {
  const particles = useRef<THREE.Group>(null);
  const count = Math.max(4, nodes.length);
  useFrame(({ clock }) => {
    if (!particles.current) return;
    particles.current.children.forEach((child, index) => {
      const phase = (clock.getElapsedTime() * 0.55 + index / count + activeIndex * 0.08) % 1;
      const nodeIndex = phase * Math.max(1, nodes.length - 1);
      const point = helixPoint(nodeIndex);
      child.position.copy(point);
      child.scale.setScalar(0.55 + Math.sin(clock.getElapsedTime() * 2 + index) * 0.16);
    });
  });

  return (
    <group ref={particles}>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={`dna-particle-${index}`}>
          <sphereGeometry args={[0.024, 12, 12]} />
          <meshBasicMaterial color={index % 2 ? "#48e5ff" : "#8d67ff"} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function TimeRuler({ nodes, activeIndex }: { nodes: TimelineNode[]; activeIndex: number }) {
  return (
    <group position={[-1.38, -0.78, 0]}>
      <Line
        points={[
          [0, 0, 0],
          [0, 0, -Math.max(1, nodes.length - 1) * 0.78]
        ]}
        color="#334155"
        lineWidth={1.1}
        transparent
        opacity={0.5}
      />
      {nodes.map((node, index) => (
        <group key={`ruler-${node.id}`} position={[0, 0, -index * 0.78]}>
          <mesh>
            <boxGeometry args={[index === activeIndex ? 0.16 : 0.08, 0.012, 0.012]} />
            <meshBasicMaterial color={index === activeIndex ? "#dff8ff" : statusColor[node.status]} />
          </mesh>
          {index === activeIndex ? (
            <Text position={[0.2, 0, 0]} fontSize={0.055} color="#94a3b8" anchorX="left">
              {node.date}
            </Text>
          ) : null}
        </group>
      ))}
    </group>
  );
}

export default function DnaScene({
  nodes,
  activeIndex,
  mode = "sequence",
  onSelect
}: {
  nodes: TimelineNode[];
  activeIndex: number;
  mode?: GenomeMode;
  onSelect: (index: number) => void;
}) {
  return (
    <Canvas camera={{ position: [0.18, 0.22, 3.05], fov: 48 }} dpr={[1, 1.75]}>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 5, 12]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[2, 2, 3]} intensity={2.35} color="#48e5ff" />
      <pointLight position={[-2, -1, 1]} intensity={1.9} color="#8d67ff" />
      <pointLight position={[0, 0.8, -activeIndex * 0.78]} intensity={1.2} color="#f5c451" />
      <CameraRig activeIndex={activeIndex} />
      <GenomeHelix nodes={nodes} activeIndex={activeIndex} mode={mode} onSelect={onSelect} />
      <TimeRuler nodes={nodes} activeIndex={activeIndex} />
    </Canvas>
  );
}
