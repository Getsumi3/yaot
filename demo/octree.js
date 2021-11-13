const THREE = require('three');
const tree = require('../')();

let container, stats, particleArray;

let camera, scene, renderer, mouse = {x: 0, y: 0};
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 10;

init();

function init() {
    container = document.getElementById('container');
    camera = new THREE.PerspectiveCamera(27, window.innerWidth / window.innerHeight, 5, 3500);
    camera.position.z = 2750;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050505, 2000, 3500);

    const particles = 500000;

    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particles * 3);
    const colors = new Float32Array(particles * 3);

    const color = new THREE.Color();

    const n = 1000,
        n2 = n / 2; // particles spread in the cube

    for (let i = 0; i < positions.length; i += 3) {

        // positions

        const x = Math.random() * n - n2;
        const y = Math.random() * n - n2;
        const z = Math.random() * n - n2;

        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;

        // colors

        const vx = (x / n) + 0.5;
        const vy = (y / n) + 0.5;
        const vz = (z / n) + 0.5;

        color.setRGB(vx, vy, vz);

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }

    tree.initAsync(positions, reportBuildProgress, listenToMouse);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    geometry.computeBoundingSphere();

    const material = new THREE.PointsMaterial({
        size: 15,
        vertexColors: THREE.VertexColors
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
    particleArray = [particleSystem];

    renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    renderer.setClearColor(scene.fog.color);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(renderer.domElement);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    window.addEventListener('resize', onWindowResize, false);
}

function reportBuildProgress(progress) {
    console.log(progress);
}

function listenToMouse() {
    animate();
    document.body.addEventListener('mousemove', queryPoints);
}

function queryPoints(e) {
    mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const ray = raycaster.ray;
    console.time('ray');

    //const items = raycaster.intersectObjects(particleArray);
    const items = tree.intersectRay(ray.origin, ray.direction);

    console.timeEnd('ray');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update();
}

function render() {
    const time = Date.now() * 0.001;
    particleSystem.rotation.x = time * 0.25;
    particleSystem.rotation.y = time * 0.5;
    renderer.render(scene, camera);
}
