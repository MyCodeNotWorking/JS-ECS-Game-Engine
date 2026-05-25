// src/math/index.js
const EPSILON = 1e-6;

function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}

export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    length() {
        return Math.hypot(this.x, this.y);
    }

    normalize() {
        const len = this.length();
        if (len > EPSILON) {
            this.scale(1 / len);
        }
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
}

export class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    length() {
        return Math.hypot(this.x, this.y, this.z);
    }

    normalize() {
        const len = this.length();
        if (len > EPSILON) {
            this.scale(1 / len);
        }
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        return new Vec3(x, y, z);
    }
}

export class Quat {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    copy(q) {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }

    clone() {
        return new Quat(this.x, this.y, this.z, this.w);
    }

    identity() {
        return this.set(0, 0, 0, 1);
    }

    normalize() {
        const len = Math.hypot(this.x, this.y, this.z, this.w);
        if (len > EPSILON) {
            const inv = 1 / len;
            this.x *= inv;
            this.y *= inv;
            this.z *= inv;
            this.w *= inv;
        }
        return this;
    }

    multiply(q) {
        const ax = this.x, ay = this.y, az = this.z, aw = this.w;
        const bx = q.x, by = q.y, bz = q.z, bw = q.w;

        this.x = ax * bw + aw * bx + ay * bz - az * by;
        this.y = ay * bw + aw * by + az * bx - ax * bz;
        this.z = az * bw + aw * bz + ax * by - ay * bx;
        this.w = aw * bw - ax * bx - ay * by - az * bz;
        return this;
    }

    invert() {
        const dot = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
        if (dot > EPSILON) {
            const inv = 1 / dot;
            this.x *= -inv;
            this.y *= -inv;
            this.z *= -inv;
            this.w *= inv;
        }
        return this;
    }

    fromAxisAngle(axis, radians) {
        const half = radians * 0.5;
        const s = Math.sin(half);
        this.x = axis.x * s;
        this.y = axis.y * s;
        this.z = axis.z * s;
        this.w = Math.cos(half);
        return this;
    }

    fromEuler(x, y, z) {
        const cx = Math.cos(x * 0.5);
        const sx = Math.sin(x * 0.5);
        const cy = Math.cos(y * 0.5);
        const sy = Math.sin(y * 0.5);
        const cz = Math.cos(z * 0.5);
        const sz = Math.sin(z * 0.5);

        this.x = sx * cy * cz + cx * sy * sz;
        this.y = cx * sy * cz - sx * cy * sz;
        this.z = cx * cy * sz + sx * sy * cz;
        this.w = cx * cy * cz - sx * sy * sz;
        return this;
    }

    slerp(q, t) {
        let cos = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;

        if (cos < 0) {
            cos = -cos;
            q = new Quat(-q.x, -q.y, -q.z, -q.w);
        }

        if (cos > 0.9995) {
            this.x += t * (q.x - this.x);
            this.y += t * (q.y - this.y);
            this.z += t * (q.z - this.z);
            this.w += t * (q.w - this.w);
            return this.normalize();
        }

        const theta = Math.acos(clamp(cos, -1, 1));
        const sinTheta = Math.sin(theta);
        const a = Math.sin((1 - t) * theta) / sinTheta;
        const b = Math.sin(t * theta) / sinTheta;

        this.x = this.x * a + q.x * b;
        this.y = this.y * a + q.y * b;
        this.z = this.z * a + q.z * b;
        this.w = this.w * a + q.w * b;
        return this;
    }

    toMat4() {
        return new Mat4().fromQuat(this);
    }
}

export class Mat4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    clone() {
        const m = new Mat4();
        m.elements.set(this.elements);
        return m;
    }

    copy(m) {
        this.elements.set(m.elements);
        return this;
    }

    identity() {
        const e = this.elements;
        e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
        e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
        e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        return this;
    }

    multiply(m) {
        return this.multiplyMatrices(this, m);
    }

    multiplyMatrices(a, b) {
        const ae = a.elements;
        const be = b.elements;
        const te = this.elements;

        const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3];
        const a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7];
        const a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11];
        const a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];

        let b0, b1, b2, b3;

        b0 = be[0]; b1 = be[1]; b2 = be[2]; b3 = be[3];
        te[0] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
        te[1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
        te[2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
        te[3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

        b0 = be[4]; b1 = be[5]; b2 = be[6]; b3 = be[7];
        te[4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
        te[5] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
        te[6] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
        te[7] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

        b0 = be[8]; b1 = be[9]; b2 = be[10]; b3 = be[11];
        te[8] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
        te[9] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
        te[10] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
        te[11] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

        b0 = be[12]; b1 = be[13]; b2 = be[14]; b3 = be[15];
        te[12] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
        te[13] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
        te[14] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
        te[15] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

        return this;
    }

    translate(v) {
        const x = v.x, y = v.y, z = v.z;
        const te = this.elements;

        te[12] += te[0] * x + te[4] * y + te[8] * z;
        te[13] += te[1] * x + te[5] * y + te[9] * z;
        te[14] += te[2] * x + te[6] * y + te[10] * z;
        te[15] += te[3] * x + te[7] * y + te[11] * z;

        return this;
    }

    scale(v) {
        const te = this.elements;
        const x = v.x, y = v.y, z = v.z;

        te[0] *= x; te[1] *= x; te[2] *= x; te[3] *= x;
        te[4] *= y; te[5] *= y; te[6] *= y; te[7] *= y;
        te[8] *= z; te[9] *= z; te[10] *= z; te[11] *= z;

        return this;
    }

    rotateX(rad) {
        const te = this.elements;
        const s = Math.sin(rad);
        const c = Math.cos(rad);

        const a10 = te[4], a11 = te[5], a12 = te[6], a13 = te[7];
        const a20 = te[8], a21 = te[9], a22 = te[10], a23 = te[11];

        te[4] = a10 * c + a20 * s;
        te[5] = a11 * c + a21 * s;
        te[6] = a12 * c + a22 * s;
        te[7] = a13 * c + a23 * s;

        te[8] = a20 * c - a10 * s;
        te[9] = a21 * c - a11 * s;
        te[10] = a22 * c - a12 * s;
        te[11] = a23 * c - a13 * s;

        return this;
    }

    rotateY(rad) {
        const te = this.elements;
        const s = Math.sin(rad);
        const c = Math.cos(rad);

        const a00 = te[0], a01 = te[1], a02 = te[2], a03 = te[3];
        const a20 = te[8], a21 = te[9], a22 = te[10], a23 = te[11];

        te[0] = a00 * c - a20 * s;
        te[1] = a01 * c - a21 * s;
        te[2] = a02 * c - a22 * s;
        te[3] = a03 * c - a23 * s;

        te[8] = a00 * s + a20 * c;
        te[9] = a01 * s + a21 * c;
        te[10] = a02 * s + a22 * c;
        te[11] = a03 * s + a23 * c;

        return this;
    }

    rotateZ(rad) {
        const te = this.elements;
        const s = Math.sin(rad);
        const c = Math.cos(rad);

        const a00 = te[0], a01 = te[1], a02 = te[2], a03 = te[3];
        const a10 = te[4], a11 = te[5], a12 = te[6], a13 = te[7];

        te[0] = a00 * c + a10 * s;
        te[1] = a01 * c + a11 * s;
        te[2] = a02 * c + a12 * s;
        te[3] = a03 * c + a13 * s;

        te[4] = a10 * c - a00 * s;
        te[5] = a11 * c - a01 * s;
        te[6] = a12 * c - a02 * s;
        te[7] = a13 * c - a03 * s;

        return this;
    }

    fromQuat(q) {
        const te = this.elements;
        const x = q.x, y = q.y, z = q.z, w = q.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        te[0] = 1 - (yy + zz);
        te[1] = xy + wz;
        te[2] = xz - wy;
        te[3] = 0;

        te[4] = xy - wz;
        te[5] = 1 - (xx + zz);
        te[6] = yz + wx;
        te[7] = 0;

        te[8] = xz + wy;
        te[9] = yz - wx;
        te[10] = 1 - (xx + yy);
        te[11] = 0;

        te[12] = 0;
        te[13] = 0;
        te[14] = 0;
        te[15] = 1;

        return this;
    }

    compose(position, rotation, scale) {
        return this.fromQuat(rotation).scale(scale).translate(position);
    }

    invert() {
        const m = this.elements;
        const inv = new Float32Array(16);

        inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
        inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
        inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
        inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
        inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
        inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
        inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
        inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
        inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
        inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
        inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
        inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
        inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
        inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
        inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
        inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

        let det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
        if (Math.abs(det) <= EPSILON) {
            return this.identity();
        }

        det = 1 / det;
        for (let i = 0; i < 16; i += 1) {
            m[i] = inv[i] * det;
        }

        return this;
    }

    perspective(fovRadians, aspect, near, far) {
        const te = this.elements;
        const f = 1 / Math.tan(fovRadians / 2);
        const nf = 1 / (near - far);

        te[0] = f / aspect;
        te[1] = 0;
        te[2] = 0;
        te[3] = 0;

        te[4] = 0;
        te[5] = f;
        te[6] = 0;
        te[7] = 0;

        te[8] = 0;
        te[9] = 0;
        te[10] = (far + near) * nf;
        te[11] = -1;

        te[12] = 0;
        te[13] = 0;
        te[14] = 2 * far * near * nf;
        te[15] = 0;

        return this;
    }

    lookAt(eye, target, up) {
        const te = this.elements;

        let zx = eye.x - target.x;
        let zy = eye.y - target.y;
        let zz = eye.z - target.z;

        let len = Math.hypot(zx, zy, zz);
        if (len === 0) {
            zz = 1;
        } else {
            len = 1 / len;
            zx *= len;
            zy *= len;
            zz *= len;
        }

        let xx = up.y * zz - up.z * zy;
        let xy = up.z * zx - up.x * zz;
        let xz = up.x * zy - up.y * zx;

        len = Math.hypot(xx, xy, xz);
        if (len === 0) {
            xx = 1;
            xy = 0;
            xz = 0;
        } else {
            len = 1 / len;
            xx *= len;
            xy *= len;
            xz *= len;
        }

        const yx = zy * xz - zz * xy;
        const yy = zz * xx - zx * xz;
        const yz = zx * xy - zy * xx;

        te[0] = xx; te[1] = yx; te[2] = zx; te[3] = 0;
        te[4] = xy; te[5] = yy; te[6] = zy; te[7] = 0;
        te[8] = xz; te[9] = yz; te[10] = zz; te[11] = 0;
        te[12] = -(xx * eye.x + xy * eye.y + xz * eye.z);
        te[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);
        te[14] = -(zx * eye.x + zy * eye.y + zz * eye.z);
        te[15] = 1;

        return this;
    }
}