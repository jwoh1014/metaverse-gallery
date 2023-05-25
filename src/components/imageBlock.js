import '../style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'dat.gui'

const clothFunction = plane(25 * 10, 25 * 10);
const restDistance = 25;
const GRAVITY = 981 * 1.4;
const DAMPING = 0.03;
const DRAG = 1 - DAMPING;
const MASS = 0.1;
const gravity = new THREE.Vector3(0, - GRAVITY, 0).multiplyScalar(MASS);

const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;

export class ImageBlock {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._scene = params.scene;
        this._image = params.image;
        this._centerX = params.centerX;
        this._centerZ = params.centerZ;

        this._LoadBlock();
    }

    _LoadBlock() {
        const loader = new THREE.TextureLoader();

        const clothTexture = loader.load(this._image);
        clothTexture.anistropy = 16;

        const clothMaterial = new THREE.MeshLambertMaterial({
            map: clothTexture,
            side: THREE.DoubleSide
        });

        this._cloth = new Cloth(10, 10);

        this._clothGeometry = new THREE.ParametricBufferGeometry(clothFunction, this._cloth.w, this._cloth.h);

        this._object = new THREE.Mesh(this._clothGeometry, clothMaterial);
        this._object.position.set(this._centerX, 175, this._centerZ);
        this._object.castShadow = true;
        this._scene.add(this._object);

        this._object.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: clothTexture,
            alphaTest: 0.5
        });

        const poleGeo = new THREE.BoxGeometry(5, 375, 5);
        const poleMat = new THREE.MeshLambertMaterial();

        let mesh = new THREE.Mesh(poleGeo, poleMat);
        mesh.position.x = this._centerX - 125;
        mesh.position.y = 175 - 62;
        mesh.position.z = this._centerZ;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this._scene.add(mesh);

        mesh = new THREE.Mesh(poleGeo, poleMat);
        mesh.position.x = this._centerX + 125;
        mesh.position.y = 175 - 62;
        mesh.position.z = this._centerZ;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this._scene.add(mesh);

        mesh = new THREE.Mesh(new THREE.BoxGeometry(255, 5, 5), poleMat);
        mesh.position.y = 300;
        mesh.position.x = this._centerX;
        mesh.position.z = this._centerZ;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this._scene.add(mesh);

        const gg = new THREE.BoxGeometry(10, 10, 10);
        mesh = new THREE.Mesh(gg, poleMat);
        mesh.position.y = -50;
        mesh.position.x = this._centerX + 125;
        mesh.position.z = this._centerZ;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this._scene.add(mesh);

        mesh = new THREE.Mesh(gg, poleMat);
        mesh.position.y = -50;
        mesh.position.x = this._centerX - 125;
        mesh.position.z = this._centerZ;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this._scene.add(mesh);

        const hh = new THREE.BoxGeometry(80, 80, 10);
        mesh = new THREE.Mesh(hh, poleMat);
        mesh.position.y = -25;
        mesh.position.x = this._centerX + 200;
        mesh.position.z = this._centerZ;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this._scene.add(mesh);
    }

    Update(now) {
        // Pin Constraints
        this.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        this.simulate(now);
        this.render();
    }

    render() {
        let cloth = this._cloth;
        let clothGeometry = this._clothGeometry;

        const p = cloth.particles;

        for (let i = 0, il = p.length; i < il; i++) {

            const v = p[i].position;

            clothGeometry.attributes.position.setXYZ(i, v.x, v.y, v.z);

        }

        clothGeometry.attributes.position.needsUpdate = true;

        clothGeometry.computeVertexNormals();
    }

    simulate(now) {
        let cloth = this._cloth;
        let clothGeometry = this._clothGeometry;

        const windStrength = Math.cos(now / 7000) * 15 + 10; //숫자를 올리면 바람이 부는 강도나 세기가 달라짐.
        const windForce = new THREE.Vector3(0, 0, 0);
        windForce.set(Math.sin(now / 2000), Math.cos(now / 3000), Math.sin(now / 1000)); //변화 감지 안됨.
        windForce.normalize();
        windForce.multiplyScalar(windStrength);

        // Aerodynamics forces 공기역학

        const particles = cloth.particles;

        let indx;
        const normal = new THREE.Vector3();
        const indices = clothGeometry.index;
        const normals = clothGeometry.attributes.normal;
        const tmpForce = new THREE.Vector3();
        for (let i = 0, il = indices.count; i < il; i += 3) {

            for (let j = 0; j < 3; j++) {
                indx = indices.getX(i + j);
                normal.fromBufferAttribute(normals, indx);
                tmpForce.copy(normal).normalize().multiplyScalar(normal.dot(windForce));
                particles[indx].addForce(tmpForce);
            }
        }


        for (let i = 0, il = particles.length; i < il; i++) {

            const particle = particles[i];
            particle.addForce(gravity);

            particle.integrate(TIMESTEP_SQ);

        }

        // Start Constraints

        const constraints = cloth.constraints;
        const il = constraints.length;

        for (let i = 0; i < il; i++) {

            const constraint = constraints[i];
            satisfyConstraints(constraint[0], constraint[1], constraint[2]);

        }


        // Floor Constraints

        for (let i = 0, il = particles.length; i < il; i++) {

            const particle = particles[i];
            const pos = particle.position;
            if (pos.y < -250) {

                pos.y = -250;

            }

        }

        // Pin Constraints

        for (let i = 0, il = this.pins.length; i < il; i++) {

            const xy = this.pins[i];
            const p = particles[xy];
            p.position.copy(p.original);
            p.previous.copy(p.original);

        }

    }
}


function satisfyConstraints(p1, p2, distance) {
    const diff = new THREE.Vector3();
    diff.subVectors(p2.position, p1.position);
    const currentDist = diff.length();
    if (currentDist === 0) return; // prevents division by 0
    const correction = diff.multiplyScalar(1 - distance / currentDist);
    const correctionHalf = correction.multiplyScalar(0.5);
    p1.position.add(correctionHalf);
    p2.position.sub(correctionHalf);

}

function plane(width, height) {

    return function (u, v, target) {

        const x = (u - 0.5) * width;
        const y = (v + 0.5) * height;
        const z = 0;

        target.set(x, y, z);

    };

}

function Cloth(w, h) {

    w = w || 10;
    h = h || 10;
    this.w = w;
    this.h = h;

    const particles = [];
    const constraints = [];

    // Create particles
    for (let v = 0; v <= h; v++) {

        for (let u = 0; u <= w; u++) {

            particles.push(
                new Particle(u / w, v / h, 0, MASS)
            );

        }

    }

    // Structural

    for (let v = 0; v < h; v++) {

        for (let u = 0; u < w; u++) {

            constraints.push([
                particles[index(u, v)],
                particles[index(u, v + 1)],
                restDistance
            ]);

            constraints.push([
                particles[index(u, v)],
                particles[index(u + 1, v)],
                restDistance
            ]);

        }

    }

    for (let u = w, v = 0; v < h; v++) {

        constraints.push([
            particles[index(u, v)],
            particles[index(u, v + 1)],
            restDistance

        ]);

    }

    for (let v = h, u = 0; u < w; u++) {

        constraints.push([
            particles[index(u, v)],
            particles[index(u + 1, v)],
            restDistance
        ]);

    }
    this.particles = particles;
    this.constraints = constraints;

    function index(u, v) {

        return u + v * (w + 1);

    }

    this.index = index;

}

function Particle(x, y, z, mass) {

    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();
    this.a = new THREE.Vector3(0, 0, 0); // acceleration
    this.mass = mass;
    this.invMass = 1 / mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    // init

    clothFunction(x, y, this.position); // position
    clothFunction(x, y, this.previous); // previous
    clothFunction(x, y, this.original);

}

// Force -> Acceleration

Particle.prototype.addForce = function (force) {

    this.a.add(
        this.tmp2.copy(force).multiplyScalar(this.invMass)
    );

};

// Performs Verlet integration

Particle.prototype.integrate = function (timesq) {

    const newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DRAG).add(this.position);
    newPos.add(this.a.multiplyScalar(timesq));

    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;

    this.a.set(0, 0, 0);

};