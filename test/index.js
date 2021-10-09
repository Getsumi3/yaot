const test = require('tap').test;
const createTree = require('../');

test('it can query points', function (t) {
    const tree = createTree();
    // two points:
    tree.init([
        0, 0, 0,
        10, 0, 0
    ]);

    // sphere at 0, -1, 0 with radius 2
    let matches = tree.intersectSphere(0, -1, 0, 2);
    t.equals(matches.length, 1, 'Only one point intersects sphere');
    t.equals(matches[0], 0, 'That point is and index 0');

    matches = tree.intersectSphere(0, -3, 0, 2);
    t.equals(matches.length, 0, 'There are no points at 0, -3, 0');

    matches = tree.intersectSphere(0, 0, 0, 20);
    t.equals(matches.length, 2, 'Sphere with r=20 captures all');
    t.equals(matches[0], 0, 'First point is here');
    t.equals(matches[1], 3, 'Second point is here');

    t.end();
});

test('it can intersect ray', function (t) {
    const tree = createTree();
    // two points:
    tree.init([
        0, 0, 0,
        10, 0, 0
    ]);

    const rayOrigin = {
        x: 1, y: 0, z: 0
    };
    const rayDirection = {
        x: -1, y: 0, z: 0
    };
    let matches = tree.intersectRay(rayOrigin, rayDirection)
    t.equals(matches.length, 2, 'Ray intersects both points');
    t.equals(matches[0], 0, 'First point is at index 0');
    t.equals(matches[1], 3, 'Second point is at index 3');

    // Let's shoot at the same direction, but put `near` after the first point:
    let near = 2;
    matches = tree.intersectRay(rayOrigin, rayDirection, near)
    t.equals(matches.length, 1, 'Ray intersects only one point');
    t.equals(matches[0], 3, 'That point is at index 3');

    // now let's limit far
    let far = 5;
    matches = tree.intersectRay(rayOrigin, rayDirection, near, far)
    t.equals(matches.length, 0, 'No points intersect');

    // relax the near and far:
    near = 0.5;
    far = 15;
    matches = tree.intersectRay(rayOrigin, rayDirection, near, far)
    t.equals(matches.length, 2, 'Ray intersects both points with near and far');
    t.equals(matches[0], 0, 'First point is at index 0');
    t.equals(matches[1], 3, 'Second point is at index 3');
    t.end();
});
