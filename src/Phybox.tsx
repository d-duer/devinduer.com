/* eslint-disable react/no-unknown-property */
import React, { createRef, useMemo } from "react";
import type { RefObject } from "react";
import type { Triplet } from "@react-three/cannon";
import {
  useConvexPolyhedron,
  useHingeConstraint,
  usePointToPointConstraint,
  useSpring,
} from "@react-three/cannon";
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  Mesh,
  Vector3,
  type Object3D,
} from "three";
import { GROUP_COLLIDE } from "./collisionGroups";
import { useDragConstraint } from "./CursorStuff";
import { IsMobile } from "./Ismobile";

// a triangle's corners in the XZ plane, as [x, z]
type Point = [number, number];
type Tri = [Point, Point, Point];

// how far each triangle is pulled in from its edges so neighbours don't overlap
const INSET = 0.01;

// builds a thin triangular prism lying in the XZ plane, centered on its centroid
// so the physics body's center of mass lines up with the mesh
function makeTrianglePrism(points: Tri, thickness: number) {
  const cx = (points[0][0] + points[1][0] + points[2][0]) / 3;
  const cz = (points[0][1] + points[1][1] + points[2][1]) / 3;
  const h = thickness / 2;
  const inset = points.map(([x, z]): Point => {
    const dx = x - cx;
    const dz = z - cz;
    const len = Math.hypot(dx, dz);
    const scale = Math.max(len - INSET * 2, 0) / len;
    return [dx * scale, dz * scale];
  });
  const vertices: Triplet[] = [
    ...inset.map(([x, z]): Triplet => [x, h, z]),
    ...inset.map(([x, z]): Triplet => [x, -h, z]),
  ];
  const rawFaces = [
    [0, 1, 2],
    [5, 4, 3],
    [0, 3, 4, 1],
    [1, 4, 5, 2],
    [2, 5, 3, 0],
  ];
  // flip any face whose winding points inwards (cannon needs outward CCW faces)
  const faces = rawFaces.map((face) => {
    const [a, b, c] = face.map((i) => new Vector3(...vertices[i]));
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    const center = face
      .reduce((sum, i) => sum.add(new Vector3(...vertices[i])), new Vector3())
      .divideScalar(face.length);
    return normal.dot(center) < 0 ? [...face].reverse() : face;
  });

  // non-indexed render geometry with a color per face: top, bottom, sides
  const faceColors = [
    [1, 1, 1],
    [0.2, 0.2, 0.2],
    [0.6, 0.6, 0.6],
    [0.6, 0.6, 0.6],
    [0.6, 0.6, 0.6],
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  faces.forEach((face, f) => {
    for (let i = 1; i < face.length - 1; i++) {
      for (const v of [face[0], face[i], face[i + 1]]) {
        positions.push(...vertices[v]);
        colors.push(...faceColors[f]);
      }
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return { vertices, faces, geometry, centroid: [cx, cz] as Point };
}

type Prism = ReturnType<typeof makeTrianglePrism>;

type HingeDef = {
  a: number;
  b: number;
  pivotA: Triplet;
  pivotB: Triplet;
  axis: Triplet;
  // distance between the two triangles' centroids when lying flat
  restLength: number;
};

// finds every edge shared by two triangles and describes a hinge along it,
// with pivots at the edge midpoint in each body's local space
function findHinges(tris: Tri[], prisms: Prism[]): HingeDef[] {
  // round so float noise doesn't split one corner into two (and -0 becomes 0)
  const key = ([x, z]: Point) =>
    `${Math.round(x * 1e5) + 0},${Math.round(z * 1e5) + 0}`;
  const edges = new Map<string, { tri: number; p: Point; q: Point }>();
  const hinges: HingeDef[] = [];
  tris.forEach((tri, t) => {
    for (let i = 0; i < 3; i++) {
      const p = tri[i];
      const q = tri[(i + 1) % 3];
      const edgeKey = [key(p), key(q)].sort().join("|");
      const other = edges.get(edgeKey);
      if (!other) {
        edges.set(edgeKey, { tri: t, p, q });
        continue;
      }
      const mid: Point = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const local = (prism: Prism): Triplet => [
        mid[0] - prism.centroid[0],
        0,
        mid[1] - prism.centroid[1],
      ];
      hinges.push({
        a: other.tri,
        b: t,
        pivotA: local(prisms[other.tri]),
        pivotB: local(prisms[t]),
        axis: [(q[0] - p[0]) / len, 0, (q[1] - p[1]) / len],
        restLength: Math.hypot(
          prisms[t].centroid[0] - prisms[other.tri].centroid[0],
          prisms[t].centroid[1] - prisms[other.tri].centroid[1],
        ),
      });
    }
  });
  return hinges;
}

type TriangleProps = {
  shape: Prism;
  position: Triplet;
  rotation: Triplet;
  color: string;
  mass: number;
  meshRef: RefObject<Mesh>;
};

const Triangle = ({
  shape,
  position,
  rotation,
  color,
  mass,
  meshRef,
}: TriangleProps) => {
  const [ref, api] = useConvexPolyhedron(
    () => ({
      args: [shape.vertices, shape.faces],
      collisionFilterGroup: GROUP_COLLIDE,
      collisionFilterMask: GROUP_COLLIDE,
      mass,
      position,
      rotation,
    }),
    meshRef,
  );
  const bind = useDragConstraint(ref);

  //need to make this only happen on window resize
  api.position.set(...position);
  api.velocity.set(0, 0, 0);

  return (
    <mesh
      ref={ref}
      geometry={shape.geometry}
      receiveShadow
      castShadow
      {...bind}
    >
      <meshBasicMaterial vertexColors color={color} />
    </mesh>
  );
};

const Hinge = ({
  refs,
  hinge,
}: {
  refs: RefObject<Mesh>[];
  hinge: HingeDef;
}) => {
  useHingeConstraint(refs[hinge.a], refs[hinge.b], {
    pivotA: hinge.pivotA,
    pivotB: hinge.pivotB,
    axisA: hinge.axis,
    axisB: hinge.axis,
    collideConnected: false,
  });
  return null;
};

// joins the two triangles at just the edge midpoint, so they can bend and
// twist in any direction like cloth instead of only folding along the edge
const BallJoint = ({
  refs,
  hinge,
}: {
  refs: RefObject<Mesh>[];
  hinge: HingeDef;
}) => {
  usePointToPointConstraint(refs[hinge.a], refs[hinge.b], {
    pivotA: hinge.pivotA,
    pivotB: hinge.pivotB,
    collideConnected: false,
  });
  return null;
};

// how far above/below each triangle's centroid the bend springs attach
const BEND_ANCHOR_OFFSET = 0.1;

// a spring across the joint, anchored above or below each centroid: folding the
// pair stretches one side's spring and squashes the other's, pushing it back flat
const BendSpring = ({
  refs,
  hinge,
  side,
  stiffness,
}: {
  refs: RefObject<Mesh>[];
  hinge: HingeDef;
  side: 1 | -1;
  stiffness: number;
}) => {
  useSpring(refs[hinge.a], refs[hinge.b], {
    localAnchorA: [0, side * BEND_ANCHOR_OFFSET, 0],
    localAnchorB: [0, side * BEND_ANCHOR_OFFSET, 0],
    restLength: hinge.restLength,
    stiffness,
    damping: 0.2,
  });
  return null;
};

// something to nail the mesh to: a physics body and where it starts in the world
export type NailTarget = {
  target: RefObject<Object3D>;
  targetPosition: Triplet;
};

// fixes the triangle's centroid to the target at the spot where they both start
const Nail = ({
  nailTo,
  triRef,
  at,
}: {
  nailTo: NailTarget;
  triRef: RefObject<Mesh>;
  at: Triplet;
}) => {
  usePointToPointConstraint(nailTo.target, triRef, {
    pivotA: [
      at[0] - nailTo.targetPosition[0],
      at[1] - nailTo.targetPosition[1],
      at[2] - nailTo.targetPosition[2],
    ],
    pivotB: [0, 0, 0],
    collideConnected: false,
  });
  return null;
};

type HingedMeshProps = {
  tris: Tri[];
  colors: string[];
  position?: Triplet;
  // euler angles applied to the whole mesh, which is built flat in the XZ plane
  rotation?: Triplet;
  thickness?: number;
  totalMass?: number;
  joint?: "hinge" | "ball";
  // how hard joints resist folding; 0 folds freely. above ~40 the springs start
  // fighting the joints, and around 150 the simulation blows up
  bendStiffness?: number;
  // optionally nail one triangle (by index) to another body
  nail?: NailTarget & { tri: number };
};

// a set of triangles joined along every edge they share, by a hinge or a ball joint
const HingedMesh = ({
  tris,
  colors,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  thickness = 0.1,
  totalMass = 1.5,
  joint = "hinge",
  bendStiffness = 0,
  nail,
}: HingedMeshProps) => {
  const Joint = joint === "ball" ? BallJoint : Hinge;
  const prisms = useMemo(
    () => tris.map((tri) => makeTrianglePrism(tri, thickness)),
    [tris, thickness],
  );
  const hinges = useMemo(() => findHinges(tris, prisms), [tris, prisms]);
  const refs = useMemo(() => tris.map(() => createRef<Mesh>()), [tris]);
  // each triangle's spawn point, rotated with the mesh around `position`
  const positions = useMemo(() => {
    const euler = new Euler(...rotation);
    return prisms.map((prism): Triplet => {
      const offset = new Vector3(prism.centroid[0], 0, prism.centroid[1]);
      offset.applyEuler(euler);
      return [
        position[0] + offset.x,
        position[1] + offset.y,
        position[2] + offset.z,
      ];
    });
  }, [prisms, ...position, ...rotation]);

  return (
    <>
      {prisms.map((prism, i) => (
        <Triangle
          key={i}
          shape={prism}
          position={positions[i]}
          rotation={rotation}
          color={colors[i % colors.length]}
          mass={totalMass / tris.length}
          meshRef={refs[i]}
        />
      ))}
      {nail && (
        <Nail nailTo={nail} triRef={refs[nail.tri]} at={positions[nail.tri]} />
      )}
      {hinges.map((hinge, i) => (
        <Joint key={i} refs={refs} hinge={hinge} />
      ))}
      {bendStiffness > 0 &&
        hinges.map((hinge, i) => (
          <React.Fragment key={i}>
            <BendSpring
              refs={refs}
              hinge={hinge}
              side={1}
              stiffness={bendStiffness}
            />
            <BendSpring
              refs={refs}
              hinge={hinge}
              side={-1}
              stiffness={bendStiffness}
            />
          </React.Fragment>
        ))}
    </>
  );
};

export const HingedTriangles = ({ position }: { position?: Triplet }) => {
  const isMobile = IsMobile();
  const size = isMobile ? 0.5 : 0.7;

  // the hinge edge runs along z at x = 0; each triangle points away from it
  const tris = useMemo(
    (): Tri[] => [
      [
        [0, -size],
        [0, size],
        [-size * 1.4, 0],
      ],
      [
        [0, -size],
        [0, size],
        [size * 1.4, 0],
      ],
    ],
    [size],
  );

  return (
    <HingedMesh
      tris={tris}
      colors={["#00FFFF", "#FF00FF"]}
      position={position}
    />
  );
};

const RECT_COLS = 10;
const RECT_ROWS = 5;

// a RECT_COLS x RECT_ROWS grid of squares, each split into two triangles
export const HingedRectangle = ({
  position,
  nailTo,
}: {
  position?: Triplet;
  nailTo?: NailTarget;
}) => {
  const isMobile = IsMobile();
  const cell = isMobile ? 0.25 : 0.4;

  const tris = useMemo(() => {
    const result: Tri[] = [];
    const x0 = (-RECT_COLS * cell) / 2;
    const z0 = (-RECT_ROWS * cell) / 2;
    for (let row = 0; row < RECT_ROWS; row++) {
      for (let col = 0; col < RECT_COLS; col++) {
        const left = x0 + col * cell;
        const top = z0 + row * cell;
        const right = left + cell;
        const bottom = top + cell;
        result.push([
          [left, top],
          [right, top],
          [left, bottom],
        ]);
        result.push([
          [right, top],
          [right, bottom],
          [left, bottom],
        ]);
      }
    }
    return result;
  }, [cell]);

  return (
    <HingedMesh
      tris={tris}
      colors={["#00FFFF", "#FF00FF"]}
      position={position}
      // stand the sheet upright facing the camera, turned to portrait (2 wide, 4 tall)
      rotation={[Math.PI / 2, Math.PI / 2, 0]}
      thickness={0.06}
      totalMass={3}
      joint="ball"
      bendStiffness={10}
      // the top-middle triangle: the last column is the top once stood upright
      nail={
        nailTo && {
          ...nailTo,
          tri: 2 * (Math.floor(RECT_ROWS / 2) * RECT_COLS + RECT_COLS - 1) + 1,
        }
      }
    />
  );
};
