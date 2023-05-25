import '../style.css'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MoveLine } from './moveLine'
import { tryInvite } from '../network'
import { math } from '../math';


export class CharacterController {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._scene = params.scene;
        this._collisionObjects = params.collisionObjects;
        this._decceleration = new THREE.Vector3(-0.05, -0.01, -500);
        this._accelaration = new THREE.Vector3(1, 20, 40000);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._wsCounter = 0;
        this._moveFunction = params.moveFunction;
        this._quaternion = new THREE.Quaternion(0, 1, 0, 0);
        this._oldPosition = new THREE.Vector3();
        this._newPosition = new THREE.Vector3();
        this._moveLine = new MoveLine();
        this._realOldPosition = new THREE.Vector3();
        this._others = params.others;

        this._input = new CharacterControllerInput();
        this._animations = {};
        this._visible = [true];
        this.hideCharacter = () => this._HideCharacter(this._object, this._visible);
        this._LoadObject();
    }

    _HideCharacter(object, visible) {
        visible[0] = !visible[0];
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.visible = visible[0];
            }
        });
    }

    _LoadObject() {
        const loader = new FBXLoader();
        loader.setPath('/models/remy/');
        loader.load('main.fbx', (fbx) => {
            this._object = fbx;
            console.log(this._object);
            this._object.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true;
                }
            });
            this._object.position.set(0, 1000, 2000); //캐릭터 위치
            this._object.quaternion.set(0, 1, 0, 0);
            this._object.scale.set(1.5, 1.5, 1.5);
            this._scene.add(this._object);

            this._previousLoadCenter = new THREE.Vector3();

            this._mixer = new THREE.AnimationMixer(this._object);

            this._manager = new THREE.LoadingManager();

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('/models/remy/');
            loader.load('walk.fbx', (a) => {
                _OnLoad('walk', a);
                this._animations['walk'].action.play();
                this._animations['walk'].action.setEffectiveTimeScale(1.5);
            });

            loader.load('idle.fbx', (a) => {
                _OnLoad('idle', a);
                this._animations['idle'].action.play();
            });
            this._onAirDuration = 0;
        });
    }

    Update(timeInSeconds) {
        if (this._mixer == undefined || this._animations['walk'] == undefined || this._animations['idle'] == undefined) {
            return;
        }

        const velocity = this._velocity;
        velocity.set(0, -10, 0);

        const controlObject = this._object;
        this._oldPosition.copy(controlObject.position);
        this._newPosition.copy(controlObject.position);

        const acc = this._accelaration.clone();

        if (this._input._keys.forward) {
            velocity.z += acc.z * timeInSeconds;
        }

        if (this._input._keys.backward) {
            velocity.z -= acc.z * timeInSeconds;
        }

        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();

        if (this._input._keys.left) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 0.04 * Math.PI * timeInSeconds * this._accelaration.y);
            this._quaternion.multiply(_Q);
        }

        if (this._input._keys.right) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, -0.04 * Math.PI * timeInSeconds * this._accelaration.y);
            this._quaternion.multiply(_Q);
        }

        if (this._input._keys.forward || this._input._keys.backward)
            controlObject.quaternion.copy(this._quaternion); //고개돌리기

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        forward.multiplyScalar(velocity.z * timeInSeconds);

        this._newPosition.add(forward);

        const walkWeight = Math.min(Math.abs(velocity.z / 600), 1.0);

        this._animations['walk'].action.setEffectiveWeight(walkWeight);
        this._animations['idle'].action.setEffectiveWeight(1 - walkWeight);

        if (this._input._keys.space) {
            this._onAirDuration = 0.5;
        }

        // x,z collision check
        this._moveLine.set(this._oldPosition, this._newPosition);
        if (this._moveLine.intersectObjects(this._collisionObjects, this._newPosition)) {
            this._oldPosition.copy(this._newPosition);
        }
        this._newPosition.y = this._newPosition.y + 20 * (1 - Math.min(this._onAirDuration, 4))
        this._onAirDuration = this._onAirDuration + timeInSeconds;

        // y collision check
        this._moveLine.set(this._oldPosition, this._newPosition)
        if (this._moveLine.intersectObjects(this._collisionObjects, null)) {
            this._newPosition.copy(this._oldPosition);
            this._onAirDuration = 1;
        }

        controlObject.position.copy(this._newPosition);

        if (this._mixer) {
            this._mixer.update(timeInSeconds);
        }

        if (this._wsCounter == 5) {
            this._wsCounter = 0;
            return;
        }

        if (this._newPosition.distanceToSquared(this._realOldPosition) > 20) {
            this._moveFunction(controlObject.position, controlObject.quaternion);
            this._realOldPosition.copy(this._newPosition);
        }

        Object.keys(this._others).forEach(id => {
            if (this._newPosition.distanceToSquared(this._others[id]._model.position) < 20000)
                tryInvite(id);
        });
    }

    get Position() {
        if (this._object)
            return this._object.position;
    }

    get Rotation() {
        if (!this._object) {
            return new THREE.Quaternion();
        }
        return this._quaternion;
    }
}

class CharacterControllerInput {
    constructor() {
        this._Init();
    }

    _Init() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };
        document.addEventListener('keydown', (e) => this._onKeyDown(e.code), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e.code), false);

        const w_button = document.getElementById("w_button");
        w_button.addEventListener('mousedown', (e) => this._onKeyDown('KeyW'), false);
        w_button.addEventListener('touchstart', (e) => this._onKeyDown('KeyW'), false);
        w_button.addEventListener('mouseup', (e) => this._onKeyUp('KeyW'), false);
        w_button.addEventListener('touchend', (e) => this._onKeyUp('KeyW'), false);

        const a_button = document.getElementById("a_button");
        a_button.addEventListener('mousedown', (e) => this._onKeyDown('KeyA'), false);
        a_button.addEventListener('touchstart', (e) => this._onKeyDown('KeyA'), false);
        a_button.addEventListener('mouseup', (e) => this._onKeyUp('KeyA'), false);
        a_button.addEventListener('touchend', (e) => this._onKeyUp('KeyA'), false);

        const s_button = document.getElementById("s_button");
        s_button.addEventListener('mousedown', (e) => this._onKeyDown('KeyS'), false);
        s_button.addEventListener('touchstart', (e) => this._onKeyDown('KeyS'), false);
        s_button.addEventListener('mouseup', (e) => this._onKeyUp('KeyS'), false);
        s_button.addEventListener('touchend', (e) => this._onKeyUp('KeyS'), false);

        const d_button = document.getElementById("d_button");
        d_button.addEventListener('mousedown', (e) => this._onKeyDown('KeyD'), false);
        d_button.addEventListener('touchstart', (e) => this._onKeyDown('KeyD'), false);
        d_button.addEventListener('mouseup', (e) => this._onKeyUp('KeyD'), false);
        d_button.addEventListener('touchend', (e) => this._onKeyUp('KeyD'), false);

        const space_button = document.getElementById("space_button");
        space_button.addEventListener('mousedown', (e) => this._onKeyDown('Space'), false);
        space_button.addEventListener('touchstart', (e) => this._onKeyDown('Space'), false);
        space_button.addEventListener('mouseup', (e) => this._onKeyUp('Space'), false);
        space_button.addEventListener('touchend', (e) => this._onKeyUp('Space'), false);
    }

    IsInputIn() {
        return this._keys.forward || this._keys.backward || this._keys.left || this._keys.right;
    }

    _onKeyDown(keyCode) {
        switch (keyCode) {
            case 'KeyW':
                this._keys.forward = true;
                break;
            case 'KeyA':
                this._keys.left = true;
                break;
            case 'KeyS':
                this._keys.backward = true;
                break;
            case 'KeyD':
                this._keys.right = true;
                break;
            case 'Space':
                this._keys.space = true;
                break;
            case 'ShiftRight':
                this._keys.shift = true;
                break;
        }
    }
    _onKeyUp(keyCode) {
        switch (keyCode) {
            case 'KeyW':
                this._keys.forward = false;
                break;
            case 'KeyA':
                this._keys.left = false;
                break;
            case 'KeyS':
                this._keys.backward = false;
                break;
            case 'KeyD':
                this._keys.right = false;
                break;
            case 'Space':
                this._keys.space = false;
                break;
            case 'ShiftRight':
                this._keys.shift = false;
                break;
        }
    }
};