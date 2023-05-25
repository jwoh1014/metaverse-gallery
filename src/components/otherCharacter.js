import '../style.css'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export class OtherCharacter {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._scene = params.scene;
        this._animations = {};
        this._messages = [];
        this._stopCounter = 0;
        this.invite = null;
        this._LoadModels();
    }

    move(msg) {
        this._messages.push(msg);
    }

    remove() {
        this._scene.remove(this._model);
    }

    _LoadModels() {
        const loader = new FBXLoader();
        loader.setPath('/models/remy/');
        loader.load('main.fbx', (fbx) => {
            this._model = fbx;
            console.log(this._model);
            this._model.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true;
                }
            });
            this._model.position.set(100000, 0, 100000);
            this._model.scale.set(0.7, 0.7, 0.7);
            this._scene.add(this._model);

            this._mixer = new THREE.AnimationMixer(this._model);

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
                this._animations['walk'].action.setEffectiveTimeScale(1.8);
                this._animations['walk'].action.setEffectiveWeight(1);
            });
            loader.load('idle.fbx', (a) => {
                _OnLoad('idle', a);
                this._animations['idle'].action.play();
            });
        });
    }

    Update(timeInSeconds) {

        if (this._mixer == undefined || this._animations['walk'] == undefined || this._animations['idle'] == undefined) {
            return;
        }

        const msg = this._messages.pop();
        this._messages.length = 0;

        // if no message for 10 updates, stop
        if (!msg) {
            if (this._stopCounter != 10) {
                this._stopCounter++;
                if (this._stopCounter == 10) {
                    this._animations['walk'].action.setEffectiveWeight(0);
                    this._animations['idle'].action.setEffectiveWeight(1);
                }
            }
        }
        else {
            this._stopCounter = 0;

            const oldPosition = new THREE.Vector3();
            oldPosition.copy(this._model.position);

            this._model.position.set(msg.x, msg.y, msg.z);

            this._model.quaternion.set(0, msg.qy / 100, 0, msg.qw / 100);

            this._animations['walk'].action.setEffectiveWeight(1);
            this._animations['idle'].action.setEffectiveWeight(0);
        }

        if (this._mixer) {
            this._mixer.update(timeInSeconds);
        }
    }
}