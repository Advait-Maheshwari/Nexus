import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";

interface SceneTextProps {
  children: ReactNode;
  position?: [number, number, number];
  fontSize?: number;
  color?: string;
  maxWidth?: number;
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "middle" | "bottom";
}

const FONT_SIZE_PX = 64;
const HORIZONTAL_PADDING_PX = 18;
const VERTICAL_PADDING_PX = 12;
const LINE_HEIGHT = 1.22;

export function SceneText({
  children,
  position = [0, 0, 0],
  fontSize = 0.08,
  color = "#ffffff",
  maxWidth,
  anchorX = "center",
  anchorY = "middle"
}: SceneTextProps) {
  const value = String(children ?? "");
  const label = useMemo(
    () => createLabelTexture(value, color, fontSize, maxWidth),
    [color, fontSize, maxWidth, value]
  );

  useEffect(() => () => label.texture.dispose(), [label.texture]);

  const centerX = anchorX === "left" ? 0 : anchorX === "right" ? 1 : 0.5;
  const centerY = anchorY === "top" ? 1 : anchorY === "bottom" ? 0 : 0.5;
  const center = useMemo(() => new THREE.Vector2(centerX, centerY), [centerX, centerY]);

  return (
    <sprite position={position} scale={[label.width, label.height, 1]} center={center}>
      <spriteMaterial
        map={label.texture}
        color="#ffffff"
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function createLabelTexture(
  value: string,
  color: string,
  fontSize: number,
  maxWidth?: number
): { texture: THREE.CanvasTexture; width: number; height: number } {
  const measuringCanvas = document.createElement("canvas");
  const measuringContext = measuringCanvas.getContext("2d");
  const fallbackTexture = new THREE.CanvasTexture(measuringCanvas);

  if (!measuringContext) {
    return {
      texture: fallbackTexture,
      width: Math.max(fontSize, maxWidth ?? fontSize * 4),
      height: fontSize * LINE_HEIGHT
    };
  }

  measuringContext.font = `600 ${FONT_SIZE_PX}px system-ui, sans-serif`;
  const maxTextWidthPx = maxWidth
    ? Math.max(FONT_SIZE_PX * 2, (maxWidth / fontSize) * FONT_SIZE_PX)
    : Number.POSITIVE_INFINITY;
  const lines = wrapText(measuringContext, value, maxTextWidthPx);
  const widestLinePx = Math.max(
    FONT_SIZE_PX,
    ...lines.map((line) => measuringContext.measureText(line).width)
  );
  const contentWidthPx = Math.min(widestLinePx, maxTextWidthPx);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.ceil(contentWidthPx + HORIZONTAL_PADDING_PX * 2));
  canvas.height = Math.max(
    2,
    Math.ceil(lines.length * FONT_SIZE_PX * LINE_HEIGHT + VERTICAL_PADDING_PX * 2)
  );

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `600 ${FONT_SIZE_PX}px system-ui, sans-serif`;
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    lines.forEach((line, index) => {
      const lineY =
        VERTICAL_PADDING_PX +
        FONT_SIZE_PX * LINE_HEIGHT * index +
        (FONT_SIZE_PX * LINE_HEIGHT) / 2;
      context.fillText(line, canvas.width / 2, lineY, contentWidthPx);
    });
  }

  fallbackTexture.dispose();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return {
    texture,
    width: maxWidth
      ? Math.min(maxWidth, (canvas.width / FONT_SIZE_PX) * fontSize)
      : (canvas.width / FONT_SIZE_PX) * fontSize,
    height: (canvas.height / FONT_SIZE_PX) * fontSize
  };
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidthPx: number
): string[] {
  if (!Number.isFinite(maxWidthPx) || context.measureText(value).width <= maxWidthPx) {
    return [value];
  }

  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidthPx || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [value];
}
