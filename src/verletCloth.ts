// a small verlet cloth: particles on a grid joined by distance constraints

export type Vec3 = [number, number, number];

export type Cylinder = {
  x: number;
  z: number;
  radius: number;
  yMin: number;
  yMax: number;
};

export type ClothOptions = {
  // grid size in cells; the sheet stands upright in the XY plane at center[2]
  cols: number;
  rows: number;
  cell: number;
  center: Vec3;
  // particles, as [col, row] with row 0 at the top, held fixed where they start
  pins?: [number, number][];
  // triangles, as [col, row, half] with half 0 = upper-left and 1 = lower-right
  // of that cell, whose centers are held fixed where they start
  nails?: [number, number, 0 | 1][];
  gravity?: number;
  // fraction of velocity kept each step, 1 = no damping
  damping?: number;
  iterations?: number;
  // 0..1, how strongly the skip-one constraints resist folding
  bendStiffness?: number;
  // the longest bending link, in particles; 2 is the minimum, higher is stiffer
  bendReach?: number;
  // how far particles are kept from colliders
  thickness?: number;
  floorY?: number;
  // which way is "up" from the floor, as a unit vector; tilt it to tilt the
  // floor, which always passes through (0, floorY, 0)
  floorNormal?: Vec3;
  cylinders?: Cylinder[];
  // 0..1, how much sliding motion is lost per step while touching the floor or
  // a cylinder
  friction?: number;
  // how strongly wind pushes on the cloth, per unit area per unit of wind speed
  windDrag?: number;
  // how far, in degrees, any part of the sheet may swing around the first nail
  // from where it started, so it can't swing up over the nail and show its back;
  // omit for no limit
  swingLimit?: number;
  // how far behind the first nail's depth (z) particles may go, so the sheet
  // can bend back some but not wrap around behind whatever it's nailed to;
  // omit for no limit
  maxBehindNail?: number;
};

type Constraint = { a: number; b: number; rest: number; stiffness: number };

export class Cloth {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly pos: Float32Array;
  readonly prev: Float32Array;
  // the 3 particle indices of each triangle, two per cell
  readonly triangles: [number, number, number][] = [];
  private readonly constraints: Constraint[] = [];
  private readonly pinned = new Map<number, Vec3>();
  // each nail holds one point of a triangle, given by barycentric weights on its
  // three corners (thirds for its center), fixed at a spot in the world
  // (`original` for the ones from the `nails` option, which clearAddedNails keeps)
  private nails: {
    tri: [number, number, number];
    weights: Vec3;
    at: Vec3;
    original: boolean;
  }[] = [];
  // the first original nail, which the swing limit, tether and maxBehindNail
  // are measured from; null once it's removed, which turns those off
  private anchor: Vec3 | null = null;
  private grabbed: { index: number; target: Vec3 } | null = null;
  // contacts found during a step, for friction: "floor", otherwise the
  // outward normal of the cylinder surface it's touching
  private readonly contacts = new Map<number, "floor" | [number, number]>();
  private readonly opts: Required<ClothOptions>;

  constructor(options: ClothOptions) {
    this.opts = {
      pins: [],
      nails: [],
      gravity: -11,
      damping: 0.99,
      iterations: 20,
      bendStiffness: 0.3,
      bendReach: 2,
      thickness: 0.03,
      floorY: -Infinity,
      floorNormal: [0, 1, 0],
      cylinders: [],
      friction: 0.2,
      windDrag: 15,
      swingLimit: 180,
      maxBehindNail: Infinity,
      ...options,
    };
    const { cols, rows, cell, center } = this.opts;
    this.cols = cols;
    this.rows = rows;
    this.count = (cols + 1) * (rows + 1);
    this.pos = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);

    const left = center[0] - (cols * cell) / 2;
    const top = center[1] + (rows * cell) / 2;
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= cols; col++) {
        const i = this.index(col, row);
        // a tiny out-of-plane wrinkle: a perfectly flat sheet that's only ever
        // pulled within its own plane can never fold or billow out of it
        const wrinkle = 0.002 * Math.sin(col * 1.7 + row * 2.3);
        this.pos.set(
          [left + col * cell, top - row * cell, center[2] + wrinkle],
          i * 3,
        );
      }
    }
    this.prev.set(this.pos);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tl = this.index(col, row);
        const tr = this.index(col + 1, row);
        const bl = this.index(col, row + 1);
        const br = this.index(col + 1, row + 1);
        // wound counter-clockwise seen from +z, so the front faces the camera
        this.triangles.push([tl, bl, tr], [tr, bl, br]);
      }
    }

    // structural: every triangle edge
    const seen = new Set<string>();
    for (const [a, b, c] of this.triangles) {
      for (const [p, q] of [
        [a, b],
        [b, c],
        [c, a],
      ]) {
        const key = p < q ? `${p},${q}` : `${q},${p}`;
        if (seen.has(key)) continue;
        seen.add(key);
        this.addConstraint(p, q, 1);
      }
    }
    // bending: links that skip particles along rows and columns, from 2 apart up
    // to bendReach apart. longer links resist gentle curves spread over many cells
    const { bendReach, bendStiffness } = this.opts;
    for (let skip = 2; skip <= bendReach; skip++) {
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          if (col + skip <= cols)
            this.addConstraint(
              this.index(col, row),
              this.index(col + skip, row),
              bendStiffness,
            );
          if (row + skip <= rows)
            this.addConstraint(
              this.index(col, row),
              this.index(col, row + skip),
              bendStiffness,
            );
        }
      }
    }

    for (const [col, row] of this.opts.pins) {
      const i = this.index(col, row);
      this.pinned.set(i, [
        this.pos[i * 3],
        this.pos[i * 3 + 1],
        this.pos[i * 3 + 2],
      ]);
    }
    for (const [col, row, half] of this.opts.nails) {
      const tri = this.triangles[2 * (row * cols + col) + half];
      const weights: Vec3 = [1 / 3, 1 / 3, 1 / 3];
      this.nails.push({
        tri,
        weights,
        at: this.pointOn(tri, weights),
        original: true,
      });
    }
    this.anchor = this.nails[0]?.at ?? null;
    const nail = this.anchor;
    if (nail) {
      this.restDirections = new Float32Array(this.count * 3);
      this.restDistances = new Float32Array(this.count);
      for (let i = 0; i < this.count; i++) {
        const dx = this.pos[i * 3] - nail[0];
        const dy = this.pos[i * 3 + 1] - nail[1];
        const dz = this.pos[i * 3 + 2] - nail[2];
        const len = Math.hypot(dx, dy, dz);
        this.restDistances[i] = len;
        if (len > 1e-6)
          this.restDirections.set([dx / len, dy / len, dz / len], i * 3);
      }
    }
  }

  // the point at these barycentric weights on a triangle, as it is right now
  private pointOn([a, b, c]: [number, number, number], [wa, wb, wc]: Vec3) {
    const p = this.pos;
    return [0, 1, 2].map(
      (k) => p[a * 3 + k] * wa + p[b * 3 + k] * wb + p[c * 3 + k] * wc,
    ) as Vec3;
  }

  // nails a point on triangle `t` (an index into `triangles`), given by
  // barycentric weights, to the spot `at` in the world, or right where that
  // point is now if `at` is left out
  addNail(t: number, weights: Vec3, at?: Vec3) {
    const tri = this.triangles[t];
    if (!tri) return;
    // keep the weights on the triangle and summing to 1
    const clamped = weights.map((w) => Math.max(w, 0)) as Vec3;
    const sum = clamped[0] + clamped[1] + clamped[2] || 1;
    const w = clamped.map((v) => v / sum) as Vec3;
    this.nails.push({
      tri,
      weights: w,
      at: at ?? this.pointOn(tri, w),
      original: false,
    });
  }

  // how far particles are kept from colliders' surfaces
  // swaps in new cylinders to collide with, e.g. when the pole moves
  setCylinders(cylinders: Cylinder[]) {
    this.opts.cylinders = cylinders;
  }

  get thickness() {
    return this.opts.thickness;
  }

  // where every nail is, for drawing them
  nailPositions(): Vec3[] {
    return this.nails.map((n) => n.at);
  }

  // which nails (in nailPositions() order) the cloth was made with
  nailIsOriginal(): boolean[] {
    return this.nails.map((n) => n.original);
  }

  // removes the nails added with addNail, keeping the ones the cloth was made
  // with (from the `nails` option)
  clearAddedNails() {
    this.nails = this.nails.filter((n) => n.original);
  }

  // removes the nail at this index into nailPositions(). removing the anchor
  // (the first original nail) also turns off the swing limit and tether
  removeNail(index: number) {
    const [removed] = this.nails.splice(index, 1);
    if (removed && removed.at === this.anchor) this.anchor = null;
  }

  index(col: number, row: number) {
    return row * (this.cols + 1) + col;
  }

  // the particle closest to a world point
  nearest(point: Vec3) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.count; i++) {
      const d =
        (this.pos[i * 3] - point[0]) ** 2 +
        (this.pos[i * 3 + 1] - point[1]) ** 2 +
        (this.pos[i * 3 + 2] - point[2]) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  grab(index: number, target: Vec3) {
    this.grabbed = { index, target };
  }

  moveGrab(target: Vec3) {
    if (this.grabbed) this.grabbed.target = target;
  }

  // the wind's velocity; change it every frame for gusts
  wind: Vec3 = [0, 0, 0];
  // per-particle acceleration from the wind, refilled each step
  private windAccel = new Float32Array(0);

  release() {
    this.grabbed = null;
  }

  step(dt: number) {
    const { gravity, damping, iterations } = this.opts;
    const g = gravity * dt * dt;
    const wind = this.windForces(dt);
    for (let i = 0; i < this.count; i++) {
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        const v = (this.pos[j] - this.prev[j]) * damping;
        this.prev[j] = this.pos[j];
        this.pos[j] += v + (k === 1 ? g : 0) + wind[j] * dt * dt;
      }
    }
    this.contacts.clear();
    for (let it = 0; it < iterations; it++) {
      for (const c of this.constraints) this.solve(c);
      this.holdFixed();
      this.collide();
    }
    this.applyFriction();
  }

  // each triangle is pushed along its normal by the wind it faces head-on,
  // relative to how it's already moving, in proportion to its area; the push
  // is shared between its three corners
  private windForces(dt: number) {
    if (this.windAccel.length !== this.count * 3)
      this.windAccel = new Float32Array(this.count * 3);
    const acc = this.windAccel;
    acc.fill(0);
    const [wx, wy, wz] = this.wind;
    if (wx === 0 && wy === 0 && wz === 0) return acc;
    const p = this.pos;
    const q = this.prev;
    for (const [a, b, c] of this.triangles) {
      const e1x = p[b * 3] - p[a * 3];
      const e1y = p[b * 3 + 1] - p[a * 3 + 1];
      const e1z = p[b * 3 + 2] - p[a * 3 + 2];
      const e2x = p[c * 3] - p[a * 3];
      const e2y = p[c * 3 + 1] - p[a * 3 + 1];
      const e2z = p[c * 3 + 2] - p[a * 3 + 2];
      // normal whose length is twice the triangle's area
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;
      const len = Math.hypot(nx, ny, nz);
      if (len < 1e-12) continue;
      // wind relative to the triangle's own velocity
      let rx = wx;
      let ry = wy;
      let rz = wz;
      for (const i of [a, b, c]) {
        rx -= (p[i * 3] - q[i * 3]) / dt / 3;
        ry -= (p[i * 3 + 1] - q[i * 3 + 1]) / dt / 3;
        rz -= (p[i * 3 + 2] - q[i * 3 + 2]) / dt / 3;
      }
      // area * (unit normal . relative wind) * unit normal, split three ways
      const f =
        (this.opts.windDrag * (nx * rx + ny * ry + nz * rz)) / (2 * len) / 3;
      for (const i of [a, b, c]) {
        acc[i * 3] += f * nx;
        acc[i * 3 + 1] += f * ny;
        acc[i * 3 + 2] += f * nz;
      }
    }
    return acc;
  }

  private addConstraint(a: number, b: number, stiffness: number) {
    const dx = this.pos[a * 3] - this.pos[b * 3];
    const dy = this.pos[a * 3 + 1] - this.pos[b * 3 + 1];
    const dz = this.pos[a * 3 + 2] - this.pos[b * 3 + 2];
    this.constraints.push({ a, b, rest: Math.hypot(dx, dy, dz), stiffness });
  }

  private isFixed(i: number) {
    return this.pinned.has(i) || this.grabbed?.index === i;
  }

  // move both ends toward the rest length, all of it onto the free end if one is held
  private solve({ a, b, rest, stiffness }: Constraint) {
    const fixedA = this.isFixed(a);
    const fixedB = this.isFixed(b);
    if (fixedA && fixedB) return;
    const dx = this.pos[b * 3] - this.pos[a * 3];
    const dy = this.pos[b * 3 + 1] - this.pos[a * 3 + 1];
    const dz = this.pos[b * 3 + 2] - this.pos[a * 3 + 2];
    const dist = Math.hypot(dx, dy, dz) || 1e-9;
    const diff = ((dist - rest) / dist) * stiffness;
    const shareA = fixedA ? 0 : fixedB ? 1 : 0.5;
    const shareB = fixedB ? 0 : fixedA ? 1 : 0.5;
    this.pos[a * 3] += dx * diff * shareA;
    this.pos[a * 3 + 1] += dy * diff * shareA;
    this.pos[a * 3 + 2] += dz * diff * shareA;
    this.pos[b * 3] -= dx * diff * shareB;
    this.pos[b * 3 + 1] -= dy * diff * shareB;
    this.pos[b * 3 + 2] -= dz * diff * shareB;
  }

  private holdFixed() {
    // move each nailed triangle's corners, each in proportion to its weight, so
    // the nailed point is back on its nail; it can still turn and tilt around it
    for (const { tri, weights, at } of this.nails) {
      const c = this.pointOn(tri, weights);
      const sq =
        weights[0] * weights[0] +
        weights[1] * weights[1] +
        weights[2] * weights[2];
      tri.forEach((p, j) => {
        const share = weights[j] / sq;
        for (let k = 0; k < 3; k++)
          this.pos[p * 3 + k] += (at[k] - c[k]) * share;
      });
    }
    this.pinned.forEach((p, i) => this.pos.set(p, i * 3));
    if (this.grabbed) this.pos.set(this.grabbed.target, this.grabbed.index * 3);
  }

  // each particle's direction from the first nail when the cloth was made, for
  // the swing limit
  private restDirections: Float32Array | null = null;
  // and its distance from it, which a flat sheet can't exceed without stretching
  private restDistances = new Float32Array(0);

  // keeps a particle within its starting distance of the first nail, and its
  // direction from the nail within swingLimit degrees of its starting direction
  // (rotating it back while keeping its distance), so the sheet can tilt but
  // never swing far enough to show its back
  private limitSwing(i: number) {
    const { swingLimit } = this.opts;
    const nail = this.anchor;
    if (!nail || swingLimit >= 180 || !this.restDirections) return;
    const x = i * 3;
    const ux = this.restDirections[x];
    const uy = this.restDirections[x + 1];
    const uz = this.restDirections[x + 2];
    // particles right at the nail have no direction to limit
    if (ux === 0 && uy === 0 && uz === 0) return;
    let vx = this.pos[x] - nail[0];
    let vy = this.pos[x + 1] - nail[1];
    let vz = this.pos[x + 2] - nail[2];
    let r = Math.hypot(vx, vy, vz);
    if (r < 1e-6) return;
    // tether: no farther from the nail than it started, so a drag or gust can't
    // stretch the sheet out past its own size
    const tether = this.restDistances[i] * 1.02;
    if (r > tether) {
      const k = tether / r;
      vx *= k;
      vy *= k;
      vz *= k;
      r = tether;
      this.pos[x] = nail[0] + vx;
      this.pos[x + 1] = nail[1] + vy;
      this.pos[x + 2] = nail[2] + vz;
    }
    const max = (swingLimit * Math.PI) / 180;
    const cos = (vx * ux + vy * uy + vz * uz) / r;
    if (cos >= Math.cos(max)) return;
    // the part of the current direction perpendicular to the rest direction
    let px = vx / r - cos * ux;
    let py = vy / r - cos * uy;
    let pz = vz / r - cos * uz;
    const pl = Math.hypot(px, py, pz);
    if (pl < 1e-9) {
      // swung straight opposite: tip it toward the camera
      px = 0;
      py = 0;
      pz = 1;
    } else {
      px /= pl;
      py /= pl;
      pz /= pl;
    }
    const c = Math.cos(max) * r;
    const sn = Math.sin(max) * r;
    this.pos[x] = nail[0] + ux * c + px * sn;
    this.pos[x + 1] = nail[1] + uy * c + py * sn;
    this.pos[x + 2] = nail[2] + uz * c + pz * sn;
  }

  private collide() {
    const { thickness, floorY, floorNormal, cylinders, maxBehindNail } =
      this.opts;
    const [fx, fy, fz] = floorNormal;
    const nailZ = this.anchor?.[2];
    // a grabbed particle still collides, so it can't be dragged into the pole
    for (let i = 0; i < this.count; i++) {
      if (this.pinned.has(i)) continue;
      const x = i * 3;
      const y = x + 1;
      const z = x + 2;
      this.limitSwing(i);
      if (nailZ !== undefined && this.pos[z] < nailZ - maxBehindNail)
        this.pos[z] = nailZ - maxBehindNail;
      // height above the floor along its normal; push out along it if too low
      const above =
        this.pos[x] * fx + (this.pos[y] - floorY) * fy + this.pos[z] * fz;
      if (above < thickness) {
        const push = thickness - above;
        this.pos[x] += fx * push;
        this.pos[y] += fy * push;
        this.pos[z] += fz * push;
        this.contacts.set(i, "floor");
      }
      for (const c of cylinders) {
        if (
          this.pos[y] < c.yMin - thickness ||
          this.pos[y] > c.yMax + thickness
        )
          continue;
        const dx = this.pos[x] - c.x;
        const dz = this.pos[z] - c.z;
        const dist = Math.hypot(dx, dz);
        const min = c.radius + thickness;
        if (dist >= min) continue;
        // push straight out from the axis (toward +z if exactly on it)
        const nx = dist > 1e-9 ? dx / dist : 0;
        const nz = dist > 1e-9 ? dz / dist : 1;
        this.pos[x] = c.x + nx * min;
        this.pos[z] = c.z + nz * min;
        this.contacts.set(i, [nx, nz]);
      }
    }
  }

  // slows sliding along whatever each particle touched this step. done once per
  // step rather than per solver pass, where it would compound into pure grip
  private applyFriction() {
    const { friction } = this.opts;
    this.contacts.forEach((contact, i) => {
      if (this.isFixed(i)) return;
      const x = i * 3;
      const vx = this.pos[x] - this.prev[x];
      const vy = this.pos[x + 1] - this.prev[x + 1];
      const vz = this.pos[x + 2] - this.prev[x + 2];
      if (contact === "floor") {
        // floor: slow the motion along its surface
        const [fx, fy, fz] = this.opts.floorNormal;
        const out = vx * fx + vy * fy + vz * fz;
        this.prev[x] += (vx - fx * out) * friction;
        this.prev[x + 1] += (vy - fy * out) * friction;
        this.prev[x + 2] += (vz - fz * out) * friction;
        return;
      }
      // cylinder: slow the vertical motion and the motion around it
      const [nx, nz] = contact;
      const along = -vx * nz + vz * nx;
      this.prev[x] += -nz * along * friction;
      this.prev[x + 1] += vy * friction;
      this.prev[x + 2] += nx * along * friction;
    });
  }
}
