import * as THREE from 'three'

export class MoveLine {
    constructor() {
        this.start = new THREE.Vector3();
        this.end = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.raycaster.near = 0;
        this.distance = 0;
    }

    set(start, end) {
        this.start.copy(start);
        this.end.copy(end);
        this.distance = end.distanceTo(start);
        this.direction.subVectors(this.end, this.start).normalize();
        this.raycaster.set(this.start, this.direction);
        this.raycaster.far = this.distance;
    }

    intersectObjects(objects, movePoint) {
        if (this.distance == 0) // not moved
            return false;
        const resultArray = this.raycaster.intersectObjects(objects, false);
        if (resultArray.length > 0) {
            if (movePoint)
                movePoint.subVectors(resultArray[0].point, this.direction);
            return true;
        }
        return false;
    }
}

//     intersectBox(BBox, hit) {
//         const L1 = this.start;
//         const L2 = this.end;
//         const B1 = BBox.min;
//         const B2 = BBox.max;
//         if (L2.x < B1.x && L1.x < B1.x)
//             return false;
//         if (L2.x > B2.x && L1.x > B2.x)
//             return false;
//         if (L2.y < B1.y && L1.x < B1.y)
//             return false;
//         if (L2.y > B2.y && L1.y > B2.y)
//             return false;
//         if (L2.z < B1.z && L1.z < B1.z)
//             return false;
//         if (L2.z > B2.z && L1.z > B2.z)
//             return false;
//         if (L1.x > B1.x && L1.x < B2.x &&
//             L1.y > B1.y && L1.y < B2.y &&
//             L1.z > B1.z && L1.z < B2.z) {
//             hit.copy(L2);
//             return true;
//         }
//         if (getIntersection(L1.x - B1.x, L2.x - B1.x, L1, L2, hit))
//             return inBox(hit, B1, B2, 1, L1);
//         if (getIntersection(L1.y - B1.y, L2.y - B1.y, L1, L2, hit))
//             return inBox(hit, B1, B2, 2, L1);
//         if (getIntersection(L1.z - B1.z, L2.z - B1.z, L1, L2, hit))
//             return inBox(hit, B1, B2, 3, L1);
//         if (getIntersection(L1.x - B2.x, L2.x - B2.x, L1, L2, hit))
//             return inBox(hit, B1, B2, 1, L1);
//         if (getIntersection(L1.y - B2.y, L2.y - B2.y, L1, L2, hit))
//             return inBox(hit, B1, B2, 2, L1);
//         if (getIntersection(L1.z - B2.z, L2.z - B2.z, L1, L2, hit))
//             return inBox(hit, B1, B2, 3, L1);
//         return false;
//     }
// }

// function inBox(hit, B1, B2, axis, L1) {
//     if (axis == 1 && hit.z > B1.z && hit.z < B2.z && hit.y > B1.y && hit.y < B2.y) {
//         if (L1.x > hit.x)
//             hit.add(new THREE.Vector3(1, 0, 0));
//         else
//             hit.add(new THREE.Vector3(-1, 0, 0));
//         return true;
//     }
//     if (axis == 2 && hit.z > B1.z && hit.z < B2.z && hit.x > B1.x && hit.x < B2.x) {
//         if (L1.y > hit.y)
//             hit.add(new THREE.Vector3(0, 1, 0));
//         else
//             hit.add(new THREE.Vector3(0, -1, 0));
//         return true;
//     }
//     if (axis == 3 && hit.x > B1.x && hit.x < B2.x && hit.y > B1.y && hit.y < B2.y) {
//         if (L1.z > hit.z)
//             hit.add(new THREE.Vector3(0, 0, 1));
//         else
//             hit.add(new THREE.Vector3(0, 0, -1));
//         return true;
//     }
//     return false;
// }

// function getIntersection(dst1, dst2, p1, p2, hit) {
//     if (dst1 * dst2 >= 0)
//         return false;
//     hit.copy(p1);
//     const v = new THREE.Vector3();
//     v.subVectors(p2, p1);
//     v.multiplyScalar(-dst1 / (dst2 - dst1));
//     hit.add(v);
//     return true;
// }