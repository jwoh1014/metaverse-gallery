import * as THREE from 'three';

import { math } from '../math';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Box3 } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { ImageBlock } from './imageBlock';

// 통과할 수 없는 물체: collisionObjects 에 추가
// 카메라 가리는 물체: cameraCollisionBoxes 에 Bounding Box 추가

// 아래와 같은 방식으로
// this._collisionObjects.push(mesh);
// this._camraCollisionBoxes.push(new Box3().setFromObject(mesh));

// group 형태의 물체면 하나하나 다 넣어야됨

class BackgroundCar {
    constructor(params) {
        this.params = params;
        this.position = new THREE.Vector3();
        this.quaternion = new THREE.Quaternion();
        this.scale = 10;
        this.mesh = null;

        this.LoadModel();
    }

    LoadModel() {
        const loader = new FBXLoader();
        loader.setPath('/resources/benz/');
        loader.load('benz.fbx', (fbx) => {
            this.mesh = fbx;
            this.params.scene.add(this.mesh);
            this._model.position.copy(this.position);
            this._model.scale.setScalar(this.scale);
        });
    }
}

class BackgroundCloud {
    constructor(params) {
        this.params_ = params;
        this.position_ = new THREE.Vector3();
        this.quaternion_ = new THREE.Quaternion();
        this.scale_ = 1.0;
        this.mesh_ = null;

        this.LoadModel_();
    }

    LoadModel_() {
        const loader = new GLTFLoader();
        loader.setPath('/resources/Clouds/GLTF/');
        loader.load('Cloud' + math.rand_int(1, 3) + '.glb', (glb) => {
            this.mesh_ = glb.scene;
            this.params_.scene.add(this.mesh_);

            this.position_.x = math.rand_range(-4000, 4000);
            this.position_.y = math.rand_range(1000, 1500);
            this.position_.z = math.rand_range(-4000, 4000);
            this.scale_ = math.rand_range(100, 200);
            this.mesh_.position.copy(this.position_);
            this.mesh_.quaternion.copy(this.quaternion_);
            this.mesh_.scale.setScalar(this.scale_);

            const q = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), math.rand_range(0, 360));
            this.quaternion_.copy(q);

            this.mesh_.traverse(c => {
                if (c.geometry) {
                    c.geometry.computeBoundingBox();
                }

                let materials = c.material;
                if (!(c.material instanceof Array)) {
                    materials = [c.material];
                }

                for (let m of materials) {
                    if (m) {
                        m.specular = new THREE.Color(0x000000);
                        m.emissive = new THREE.Color(0xC0C0C0);
                    }
                }
                c.castShadow = true;
                c.receiveShadow = true;
            });
        });
    }

    Update(timeElapsed) {
        if (!this.mesh_) {
            return;
        }

        this.position_.x -= timeElapsed * 20;
        if (this.position_.x < -4000) {
            this.position_.x = math.rand_range();
        }

        this.mesh_.position.copy(this.position_);
        this.mesh_.quaternion.copy(this.quaternion_);
        this.mesh_.scale.setScalar(this.scale_);
    }
};

class BackgroundCrap {
    constructor(params) {
        this.params_ = params;
        this._collisionObjects = params.collisionObjects;
        this._camraCollisionBoxes = params.cameraCollisionBoxes;
        this.position_ = new THREE.Vector3();
        this.quaternion_ = new THREE.Quaternion();
        this.scale_ = 1.0;
        this.mesh_ = null;

        this.LoadModel_();
    }

    LoadModel_() {
        const assets = [
            ['SmallPalmTree.glb', 'PalmTree.png', 60],
            ['BigPalmTree.glb', 'PalmTree.png', 100],
            ['Skull.glb', 'Ground.png', 20],
            ['Pyramid.glb', 'Ground.png', 400],
            ['Monument.glb', 'Ground.png', 200],
            ['Cactus1.glb', 'Ground.png', 100],
            ['Cactus2.glb', 'Ground.png', 100],
            ['Cactus3.glb', 'Ground.png', 100],
        ];
        const [asset, textureName, scale] = assets[math.rand_int(0, assets.length - 1)];

        const texLoader = new THREE.TextureLoader();
        const texture = texLoader.load('/resources/DesertPack/Blend/Textures/' + textureName);
        texture.encoding = THREE.sRGBEncoding;

        const loader = new GLTFLoader();
        loader.setPath('/resources/DesertPack/GLTF/');
        loader.load(asset, (glb) => {
            this.mesh_ = glb.scene;
            this.params_.scene.add(this.mesh_);

            this.position_.x = math.rand_range(-4000, 0);
            this.position_.z = math.rand_range(-4000, 0);
            this.scale_ = scale;

            const q = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), math.rand_range(0, 360));
            this.quaternion_.copy(q);
            this.mesh_.position.copy(this.position_);
            this.mesh_.quaternion.copy(this.quaternion_);
            this.mesh_.scale.setScalar(this.scale_);
            this.mesh_.traverse(c => {
                let materials = c.material;
                if (!(c.material instanceof Array)) {
                    materials = [c.material];
                }

                for (let m of materials) {
                    if (m) {
                        if (texture) {
                            m.map = texture;
                        }
                        m.specular = new THREE.Color(0x000000);
                    }
                }
                c.castShadow = true;
                c.receiveShadow = true;
                this._collisionObjects.push(c);
                this._camraCollisionBoxes.push(new Box3().setFromObject(c));
            });

        });

    }
};

export class Background {
    constructor(params) {
        this.params_ = params;
        this.clouds_ = [];
        this.crap_ = [];
        this.images_ = [];

        this._Init();
        // this.SpawnCar();
        this.SpawnClouds_();
        this.SpawnImages_();
        // this.SpawnCrap_();
    }

    _Init() {
        const scene = this.params_.scene;
        const collisionObjects = this.params_.collisionObjects;
        const cameraCollisionBoxes = this.params_.cameraCollisionBoxes;
        scene.background = new THREE.Color(0xe5f0f9);
        scene.fog = new THREE.Fog(0xffffff, 500, 20000)

        scene.add(new THREE.AmbientLight(0x666666));

        // const ambientLight = new THREE.AmbientLight(0x3f2806);
        // scene.add(ambientLight);

        // const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
        // sunLight.position.set(1000, 2000, 1000);
        // sunLight.castShadow = true;
        // sunLight.shadow.camera.top = 750;
        // sunLight.shadow.camera.bottom = - 750;
        // sunLight.shadow.camera.left = - 750;
        // sunLight.shadow.camera.right = 750;
        // sunLight.shadow.camera.near = 1000;
        // sunLight.shadow.camera.far = 5000;
        // sunLight.shadow.mapSize.set(1024, 1024);
        // sunLight.shadow.bias = 0;

        // scene.add(sunLight);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1000, 2000, 1000);
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

        const loader = new THREE.TextureLoader();

        const groundTexture = loader.load('/textures/texture.jpg'); //땅바닥 질감 변경
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(25, 25);
        groundTexture.anisotropy = 16;
        groundTexture.encoding = THREE.sRGBEncoding;
        const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });

        let mesh = new THREE.Mesh(new THREE.BoxGeometry(20000, 100, 20000), groundMaterial);

        mesh.receiveShadow = true;
        mesh.position.set(0, -100, 0);
        scene.add(mesh);
        collisionObjects.push(mesh);
        const bbox = new THREE.Box3().setFromObject(mesh);
        cameraCollisionBoxes.push(bbox);
    }

    SpawnImages_() {
        const block1 = new ImageBlock({
            scene: this.params_.scene,
            image: '/images/van.jpg',
            centerX: 500,
            centerZ: 0
        });
        this.images_.push(block1);
        const block2 = new ImageBlock({
            scene: this.params_.scene,
            image: '/images/123.jpg',
            centerX: -500,
            centerZ: 0
        });
        this.images_.push(block2);
        const block3 = new ImageBlock({
            scene: this.params_.scene,
            image: '/images/palette.jpg',
            centerX: 0,
            centerZ: 500
        });
        this.images_.push(block3);
    }

    SpawnCar() {
        const car = new BackgroundCar(this.params_);
    }

    SpawnClouds_() {
        for (let i = 0; i < 20; ++i) {
            const cloud = new BackgroundCloud(this.params_);

            this.clouds_.push(cloud);
        }
    }

    SpawnCrap_() {
        for (let i = 0; i < 20; ++i) {
            const crap = new BackgroundCrap(this.params_);

            this.crap_.push(crap);
        }
    }

    Update(timeElapsed, now) {
        for (let c of this.clouds_) {
            c.Update(timeElapsed);
        }

        for (let c of this.images_) {
            c.Update(now);
        }
    }
};