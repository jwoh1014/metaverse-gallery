import '../style.css'
import * as THREE from 'three'

export class TargetCamera {
    constructor(params) {
        this._target = params.target;
        this._camera = params.camera;
        this._cameraCollisionBoxes = params.cameraCollisionBoxes;
        this._cameraRelativePosition = new THREE.Vector3();

        this._currentPosition = new THREE.Vector3();
        this._currentLookat = new THREE.Vector3();
        this._firstPerson = [false]; // default is third person camera

        this.changeCamera = () => this._ChangeCamera(this._firstPerson);
    }

    // 0: third person, 1: first person, 2: orbit control
    _ChangeCamera(firstPerson) {
        firstPerson[0] = !firstPerson[0];
    }

    _CalculateIdealOffset() {
        if (this._firstPerson[0]) {
            this._cameraRelativePosition.set(0, 300, 0);
        }

        const idealOffset = this._cameraRelativePosition.clone();
        idealOffset.applyQuaternion(this._target.Rotation);
        idealOffset.add(this._target.Position);
        return idealOffset;
    }

    _CalculateIdealLookat() {
        const idealLookat = new THREE.Vector3(0, 305, 30);
        idealLookat.applyQuaternion(this._target.Rotation);
        idealLookat.add(this._target.Position);
        return idealLookat;
    }

    Update() {
        if (!this._target.Rotation || !this._target.Position) {
            return;
        }

        this._cameraRelativePosition.set(0, 400, -500);
        let idealOffset = this._CalculateIdealOffset();
        const idealLookat = this._CalculateIdealLookat();

        this._currentPosition.copy(idealOffset);
        this._currentLookat.copy(idealLookat);

        for (let i = 0; i < this._cameraCollisionBoxes.length; i++) {
            while (this._cameraCollisionBoxes[i].containsPoint(this._currentPosition)) {
                this._cameraRelativePosition = this._cameraRelativePosition.multiplyScalar(0.99);
                idealOffset = this._CalculateIdealOffset();
                this._currentPosition.copy(idealOffset);
            }
        }
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);
    }
};