/**
 * Represents octree data structure
 *
 * https://en.wikipedia.org/wiki/Octree
 */
const Bounds3 = require('./lib/bounds3.js');
const TreeNode = require('./lib/treeNode.js');
const EmptyRegion = new Bounds3();
const asyncFor = require('rafor');

module.exports = createTree;

function createTree(options) {
    options = options || {};
    const noPoints = [];

    let root;
    let originalArray;
    const api = {
        /**
         * Initializes tree asynchronously. Very useful when you have millions
         * of points and do not want to block rendering thread for too long.
         *
         * @param {number[]} points array of points for which we are building the
         * tree. Flat sequence of (x, y, z) coordinates. Array length should be
         * multiple of 3.
         *
         * @param {Function=} progressCallback called while iterating over array. The
         * callback will be called with single argument which represent current progress.
         *
         * @param {Function=} doneCallback called when tree is initialized. The
         * callback will be called with single argument which represent current
         * tree.
         */
        initAsync: initAsync,

        /**
         * Synchronous version of `initAsync()`. Should only be used for small
         * trees (less than 50-70k of points).
         *
         * @param {number[]} points array of points for which we are building the
         * tree. Flat sequence of (x, y, z) coordinates. Array length should be
         * multiple of 3.
         */
        init: init,

        /**
         * Gets bounds of the root node. Bounds are represented by center of the
         * node (x, y, z) and `half` attribute - distance from the center to an
         * edge of the root node.
         */
        bounds: getBounds,

        /**
         * Fires a ray from `rayOrigin` into `rayDirection` and collects all points
         * that lie in the octants intersected by the ray.
         *
         * This method implements An Efficient Parametric Algorithm for Octree Traversal
         * described in http://wscg.zcu.cz/wscg2000/Papers_2000/X31.pdf
         *
         * @param {Vector3} rayOrigin x,y,z coordinates where ray starts
         * @param {Vector3} rayDirection normalized x,y,z direction where ray shoots.
         * @param {number+} near minimum distance from the ray origin. 0 by default.
         * @param {number+} far maximum length of the ray. POSITIVE_INFINITY by default
         *
         * @return {Array} of indices in the source array. Each index represnts a start
         * of the x,y,z triplet of a point, that lies in the intersected octant.
         */
        intersectRay: intersectRay,

        /**
         * Once you have collected points from the octants intersected by a ray
         * (`intersectRay()` method), it may be worth to query points from the surrouning
         * area.
         */
        intersectSphere: intersectSphere,

        /**
         * Gets root node of the tree
         */
        getRoot: getRoot
    };

    return api;

    function getRoot() {
        return root;
    }

    function intersectSphere(cx, cy, cz, r) {
        if (!root) {
            // Most likely we are not initialized yet
            return noPoints;
        }
        const indices = [];
        const r2 = r * r;
        root.query(indices, originalArray, intersectCheck, preciseCheck);
        return indices;

        // http://stackoverflow.com/questions/4578967/cube-sphere-intersection-test
        function intersectCheck(candidate) {
            let dist = r2;
            const half = candidate.half;
            if (cx < candidate.x - half) dist -= sqr(cx - (candidate.x - half));
            else if (cx > candidate.x + half) dist -= sqr(cx - (candidate.x + half));

            if (cy < candidate.y - half) dist -= sqr(cy - (candidate.y - half));
            else if (cy > candidate.y + half) dist -= sqr(cy - (candidate.y + half));

            if (cz < candidate.z - half) dist -= sqr(cz - (candidate.z - half));
            else if (cz > candidate.z + half) dist -= sqr(cz - (candidate.z + half));
            return dist > 0;
        }

        function preciseCheck(x, y, z) {
            return sqr(x - cx) + sqr(y - cy) + sqr(z - cz) < r2;
        }
    }

    function sqr(x) {
        return x * x;
    }

    function intersectRay(rayOrigin, rayDirection, near, far) {
        if (!root) {
            // Most likely we are not initialized yet
            return noPoints;
        }

        if (near === undefined) near = 0;
        if (far === undefined) far = Number.POSITIVE_INFINITY;
        // we save as squar, to avoid expensive sqrt() operation
        near *= near;
        far *= far;

        const indices = [];
        root.query(indices, originalArray, intersectCheck, farEnough);
        return indices.sort(byDistanceToCamera);

        function intersectCheck(candidate) {
            // using http://wscg.zcu.cz/wscg2000/Papers_2000/X31.pdf
            const half = candidate.half;
            let t1 = (candidate.x - half - rayOrigin.x) / rayDirection.x,
                t2 = (candidate.x + half - rayOrigin.x) / rayDirection.x,
                t3 = (candidate.y + half - rayOrigin.y) / rayDirection.y,
                t4 = (candidate.y - half - rayOrigin.y) / rayDirection.y,
                t5 = (candidate.z - half - rayOrigin.z) / rayDirection.z,
                t6 = (candidate.z + half - rayOrigin.z) / rayDirection.z,
                tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6)),
                tmin;

            if (tmax < 0) return false;

            tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
            return tmin <= tmax && tmin <= far;
        }

        function farEnough(x, y, z) {
            const dist = (x - rayOrigin.x) * (x - rayOrigin.x) +
                (y - rayOrigin.y) * (y - rayOrigin.y) +
                (z - rayOrigin.z) * (z - rayOrigin.z);
            return near <= dist && dist <= far;
        }

        function byDistanceToCamera(idx0, idx1) {
            const x0 = rayOrigin[idx0];
            const y0 = rayOrigin[idx0 + 1];
            const z0 = rayOrigin[idx0 + 2];
            const dist0 = (x0 - rayOrigin.x) * (x0 - rayOrigin.x) +
                (y0 - rayOrigin.y) * (y0 - rayOrigin.y) +
                (z0 - rayOrigin.z) * (z0 - rayOrigin.z);

            const x1 = rayOrigin[idx1];
            const y1 = rayOrigin[idx1 + 1];
            const z1 = rayOrigin[idx1 + 2];

            const dist1 = (x1 - rayOrigin.x) * (x1 - rayOrigin.x) +
                (y1 - rayOrigin.y) * (y1 - rayOrigin.y) +
                (z1 - rayOrigin.z) * (z1 - rayOrigin.z);
            return dist0 - dist1;
        }
    }

    function init(points) {
        verifyPointsInconstiant(points);
        originalArray = points;
        root = createRootNode(points);
        for (let i = 0; i < points.length; i += 3) {
            root.insert(i, originalArray, 0);
        }
    }

    function initAsync(points, progressCallback, doneCallback) {
        verifyPointsInconstiant(points);

        const tempRoot = createRootNode(points);
        const total = points.length / 3;
        let processed = 0;

        asyncFor(points, insertToRoot, doneInternal, {step: 3});

        function insertToRoot(element, i) {
            tempRoot.insert(i, points, 0);
            if (typeof progressCallback === 'function') {
                reportProgress();
            }
        }

        function reportProgress() {
            processed += 1;

            if (processed % 10000 === 0) {
                progressCallback({
                    message: 'Loading ',
                    completed: Math.round((processed / total) * 100) + '%'
                });
            }
        }

        function doneInternal() {
            originalArray = points;
            root = tempRoot;
            if (typeof doneCallback === 'function') {
                doneCallback(api);
            }
        }
    }

    function verifyPointsInconstiant(points) {
        if (!points) throw new Error('Points array is required for quadtree to work');
        if (typeof points.length !== 'number') throw new Error('Points should be array-like object');
        if (points.length % 3 !== 0) throw new Error('Points array should consist of series of x,y,z coordinates and be multiple of 3');
    }

    function getBounds() {
        if (!root) return EmptyRegion;
        return root.bounds;
    }

    function createRootNode(points) {
        // Edge case deserves empty region:
        if (points.length === 0) {
            const empty = new Bounds3();
            return new TreeNode(empty);
        }

        // Otherwise let's figure out how big should be the root region
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < points.length; i += 3) {
            const x = points[i],
                y = points[i + 1],
                z = points[i + 2];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }

        // Make bounds square:
        let side = Math.max(Math.max(maxX - minX, maxY - minY), maxZ - minZ);
        // since we need to have both sides inside the area, let's artificially
        // grow the root region:
        side += 2;
        minX -= 1;
        minY -= 1;
        minZ -= 1;
        const half = side / 2;

        const bounds = new Bounds3(minX + half, minY + half, minZ + half, half);
        return new TreeNode(bounds);
    }
}

