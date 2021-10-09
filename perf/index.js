const Benchmark = require('benchmark');
const suite = new Benchmark.Suite;
const createTree = require('../');
const queryTree = createQueryTree(100000);

// add tests
suite.add('init tree with 10k points', function () {
    createQueryTree(10000);
}).add('Intersect sphere (r = 20) tree with 100k points', function () {
    const count = 100000;
    queryTree.intersectSphere(
        getRandomPoint(count),
        getRandomPoint(count),
        getRandomPoint(count),
        20
    );
}).add('Intersect sphere (r = 200) tree with 100k points', function () {
    const count = 100000;
    queryTree.intersectSphere(
        getRandomPoint(count),
        getRandomPoint(count),
        getRandomPoint(count),
        200
    );
}).add('Intersect sphere (r = 0) tree with 100k points', function () {
    const count = 100000;
    queryTree.intersectSphere(
        getRandomPoint(count),
        getRandomPoint(count),
        getRandomPoint(count),
        0
    );
}).add('Intersect ray shot from the center into random direction', function () {
    const count = 100000;
    const rayDirection = {
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
        z: Math.random() - 0.5
    }
    queryTree.intersectRay({x: 0, y: 0, z: 0}, rayDirection);
}).add('Intersect ray shot from the edge into center', function () {
    const count = 100000;
    const rayDirection = {
        x: -1,
        y: 0,
        z: 0
    }
    queryTree.intersectRay({x: 100000, y: 0, z: 0}, rayDirection);
}).add('Intersect ray shot from the edge outside', function () {
    const count = 100000;
    const rayDirection = {
        x: 1,
        y: 0,
        z: 0
    }
    queryTree.intersectRay({x: 100000, y: 0, z: 0}, rayDirection);
})
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        console.log('Done!');
    })
    .run({'async': true});

function createPoints(count) {
    const array = new Array(count * 3);
    for (let i = 0; i < count; ++i) {
        const idx = i * 3;
        array[idx] = getRandomPoint(count);
        array[idx + 1] = getRandomPoint(count);
        array[idx + 2] = getRandomPoint(count);
    }

    return array;
}

function getRandomPoint(count) {
    return 2 * Math.random() * count - count;
}

function createQueryTree(count) {
    const points = createPoints(count);
    const tree = createTree();
    tree.init(points);
    return tree;
}
