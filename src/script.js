import './style.css'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { CharacterController } from './control/characterControl'
import { TargetCamera } from './control/targetCamera'
import { Background } from './components/background'
import { connect, moveUser } from './network'


let scene, renderer, camera, stats;
let clock;
let controller;
let targetCamera;
let background;

let raycaster = new THREE.Raycaster();

// collision with camera
let cameraCollisionBoxes = [];

// collision with character
let collisionObjects = [];

let container;

let others = {};

function init() {
    // essential part for initialization
    container = document.getElementById('container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    stats = new Stats();
    container.appendChild(stats.dom);
    window.addEventListener('resize', onWindowResize);


    // make scene, camera and clock
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 1000000, 0);
    clock = new THREE.Clock();
    scene = new THREE.Scene();


    // essential objects
    background = new Background({
        scene: scene,
        collisionObjects: collisionObjects,
        cameraCollisionBoxes: cameraCollisionBoxes,
    });

    controller = new CharacterController({
        scene: scene,
        others: others,
        collisionObjects: collisionObjects,
        moveFunction: moveUser,
    });

    targetCamera = new TargetCamera({
        camera: camera,
        target: controller,
        cameraCollisionBoxes: cameraCollisionBoxes
    })

    const button = document.getElementById("button2");
    button.onclick = () => {
        targetCamera.changeCamera();
        controller.hideCharacter();
    };

    const button3 = document.getElementById("button3");
    button3.onclick = () => connect(others, scene);

    animate(0);
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate(now) {
    requestAnimationFrame(animate);

    let mixerUpdateDelta = clock.getDelta();
    controller.Update(mixerUpdateDelta);

    targetCamera.Update();

    for (const [_, value] of Object.entries(others)) {
        value.Update(mixerUpdateDelta);
    }
    background.Update(mixerUpdateDelta, now);

    stats.update();

    renderer.render(scene, camera);
}
init();