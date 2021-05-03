import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'


const params = {
    enableWind: true,
    showBall: false,
    togglePins: togglePins
};

const DAMPING = 0.03;
const DRAG = 1 - DAMPING;
const MASS = 0.1;
const restDistance = 25;

const xSegs = 10;
const ySegs = 10;

const clothFunction = plane(restDistance * xSegs, restDistance * ySegs);

const cloths = [new Cloth(xSegs, ySegs), new Cloth(xSegs, ySegs), new Cloth(xSegs, ySegs)];


const GRAVITY = 981 * 1.4;
const gravity = new THREE.Vector3(0, - GRAVITY, 0).multiplyScalar(MASS);


const TIMESTEP = 18 / 1000;
const TIMESTEP_SQ = TIMESTEP * TIMESTEP;

let pins = [];

const windForce = new THREE.Vector3(0, 0, 0);

const ballPosition = new THREE.Vector3(0, - 45, 0);
const ballSize = 60; //40

const tmpForce = new THREE.Vector3();


function plane(width, height) {

    return function (u, v, target) {

        const x = (u - 0.5) * width;
        const y = (v + 0.5) * height;
        const z = 0;

        target.set(x, y, z);

    };

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


const diff = new THREE.Vector3();

function satisfyConstraints(p1, p2, distance) {

    diff.subVectors(p2.position, p1.position);
    const currentDist = diff.length();
    if (currentDist === 0) return; // prevents division by 0
    const correction = diff.multiplyScalar(1 - distance / currentDist);
    const correctionHalf = correction.multiplyScalar(0.5);
    p1.position.add(correctionHalf);
    p2.position.sub(correctionHalf);

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


    // While many systems use shear and bend springs,
    // the relaxed constraints model seems to be just fine
    // using structural springs.
    // Shear
    // const diagonalDist = Math.sqrt(restDistance * restDistance * 2);


    // for (v=0;v<h;v++) {
    // 	for (u=0;u<w;u++) {

    // 		constraints.push([
    // 			particles[index(u, v)],
    // 			particles[index(u+1, v+1)],
    // 			diagonalDist
    // 		]);

    // 		constraints.push([
    // 			particles[index(u+1, v)],
    // 			particles[index(u, v+1)],
    // 			diagonalDist
    // 		]);

    // 	}
    // }


    this.particles = particles;
    this.constraints = constraints;

    function index(u, v) {

        return u + v * (w + 1);

    }

    this.index = index;

}

function simulate(now, n) {
    let cloth = cloths[n];
    let clothGeometry = clothGeometrys[n];

    const windStrength = Math.cos(now / 7000) * 15 + 10;

    windForce.set(Math.sin(now / 2000), Math.cos(now / 3000), Math.sin(now / 1000));
    windForce.normalize();
    windForce.multiplyScalar(windStrength);

    // Aerodynamics forces

    const particles = cloth.particles;

    if (params.enableWind) {

        let indx;
        const normal = new THREE.Vector3();
        const indices = clothGeometry.index;
        const normals = clothGeometry.attributes.normal;

        for (let i = 0, il = indices.count; i < il; i += 3) {

            for (let j = 0; j < 3; j++) {

                indx = indices.getX(i + j);
                normal.fromBufferAttribute(normals, indx);
                tmpForce.copy(normal).normalize().multiplyScalar(normal.dot(windForce));
                particles[indx].addForce(tmpForce);

            }

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
        if (pos.y < - 250) {

            pos.y = - 250;

        }

    }

    // Pin Constraints

    for (let i = 0, il = pins.length; i < il; i++) {

        const xy = pins[i];
        const p = particles[xy];
        p.position.copy(p.original);
        p.previous.copy(p.original);

    }

}

/* testing cloth simulation */

const pinsFormation = [];
pins = [6];

pinsFormation.push(pins);

pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
pinsFormation.push(pins);

pins = [0];
pinsFormation.push(pins);

pins = []; // cut the rope ;)
pinsFormation.push(pins);

pins = [0, cloths[0].w]; // classic 2 pins
pinsFormation.push(pins);

pins = pinsFormation[1];

function togglePins() {

    pins = pinsFormation[~ ~(Math.random() * pinsFormation.length)];

}


let container, stats;
let camera, scene, renderer;

let clothGeometrys = [
    new THREE.ParametricBufferGeometry(clothFunction, 0, 0),
    new THREE.ParametricBufferGeometry(clothFunction, 0, 0),
    new THREE.ParametricBufferGeometry(clothFunction, 0, 0),
];

let objects = [];

init();
animate(0);

function make_one_block(n, image, scene, loader, mesh, centerX, centerZ) {
    // cloth material
    const cloth = cloths[n];

    const clothTexture = loader.load(image);
    clothTexture.anisotropy = 16;

    const clothMaterial = new THREE.MeshLambertMaterial({
        map: clothTexture,
        side: THREE.DoubleSide
    });

    // cloth geometry
    clothGeometrys[n] = new THREE.ParametricBufferGeometry(clothFunction, cloth.w, cloth.h);

    // cloth mesh
    let object = new THREE.Mesh(clothGeometrys[n], clothMaterial)
    objects.push(object);
    object.position.set(centerX, 0, centerZ);
    object.castShadow = true;
    scene.add(object);

    object.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: clothTexture,
        alphaTest: 0.5
    });

    const poleGeo = new THREE.BoxGeometry(5, 375, 5);
    const poleMat = new THREE.MeshLambertMaterial();

    mesh = new THREE.Mesh(poleGeo, poleMat);
    mesh.position.x = centerX - 125;
    mesh.position.y = - 62;
    mesh.position.z = centerZ;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    mesh = new THREE.Mesh(poleGeo, poleMat);
    mesh.position.x = centerX + 125;
    mesh.position.y = - 62;
    mesh.position.z = centerZ;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    mesh = new THREE.Mesh(new THREE.BoxGeometry(255, 5, 5), poleMat);
    mesh.position.y = - 250 + (750 / 2);
    mesh.position.x = centerX;
    mesh.position.z = centerZ;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    const gg = new THREE.BoxGeometry(10, 10, 10);
    mesh = new THREE.Mesh(gg, poleMat);
    mesh.position.y = - 250;
    mesh.position.x = centerX + 125;
    mesh.position.z = centerZ;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    mesh = new THREE.Mesh(gg, poleMat);
    mesh.position.y = - 250;
    mesh.position.x = centerX - 125;
    mesh.position.z = centerZ;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    // // name mesh
    // const nameMat = new THREE.MeshLambertMaterial({
    //     map: clothTexture,
    //     side: THREE.DoubleSide
    // });

    const hh = new THREE.BoxGeometry(80, 80, 10);
    mesh = new THREE.Mesh(hh, poleMat);
    mesh.position.y = - 250;
    mesh.position.x = centerX + 200;
    mesh.position.z = centerZ;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

}

function init() {
    const loader = new THREE.TextureLoader();

    container = document.createElement('div');
    document.body.appendChild(container);

    // scene

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);
    scene.fog = new THREE.Fog(0xcce0ff, 500, 10000);

    // camera

    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(1000, 50, 1500);

    // lights

    scene.add(new THREE.AmbientLight(0x666666));

    const light = new THREE.DirectionalLight(0xdfebff, 1);
    light.position.set(50, 200, 100);
    light.position.multiplyScalar(1.3);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    const d = 3000;

    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;

    light.shadow.camera.far = 50000;

    scene.add(light);

    // ground

    const groundTexture = loader.load('/textures/grasslight-big.jpg');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(25, 25);
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;

    const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });

    let mesh = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), groundMaterial);
    mesh.position.y = - 250;
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    make_one_block(0, '/images/bravegirls.jpg', scene, loader, mesh, 0, -500);
    make_one_block(1, '/images/just_drive.jpg', scene, loader, mesh, 500, 0);
    make_one_block(2, '/images/rollin.jpg', scene, loader, mesh, -500, 0);

    // renderer

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(renderer.domElement);

    renderer.outputEncoding = THREE.sRGBEncoding;

    renderer.shadowMap.enabled = true;

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minDistance = 1000;
    controls.maxDistance = 5000;

    // performance monitor

    stats = new Stats();
    container.appendChild(stats.dom);

    //

    window.addEventListener('resize', onWindowResize);

    //

    const gui = new dat.GUI();
    gui.add(params, 'enableWind').name('Enable wind');
    gui.add(params, 'showBall').name('Show ball');
    gui.add(params, 'togglePins').name('Toggle pins');

    if (typeof TESTING !== 'undefined') {

        for (let i = 0; i < 50; i++) {

            simulate(500 - 10 * i, 0);
            simulate(500 - 10 * i, 1);
            simulate(500 - 10 * i, 2);


        }

    }

}

//

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate(now) {

    requestAnimationFrame(animate);
    simulate(now, 0);
    simulate(now, 1);
    simulate(now, 2);

    render(0);
    render(1);
    render(2);

    stats.update();

}

function render(n) {
    let cloth = cloths[n]
    let clothGeometry = clothGeometrys[n];

    const p = cloth.particles;

    for (let i = 0, il = p.length; i < il; i++) {

        const v = p[i].position;

        clothGeometry.attributes.position.setXYZ(i, v.x, v.y, v.z);

    }

    clothGeometry.attributes.position.needsUpdate = true;

    clothGeometry.computeVertexNormals();


    renderer.render(scene, camera);

}