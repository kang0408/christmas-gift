/* ============================================
   CHRISTMAS 3D SCENE - FULL VERSION
   Based on cconsta1/christmas-scene
   With Skybox, Fireflies, Snow Shaders
   ============================================ */

// Global variables
let scene, camera, renderer, controls;
let christmasTree, giftBoxes = [];
let snowParticleSystem;
let christmasLights = [];
let fireflies;
let isGiftOpen = false;
let memoryBook;
let clock;

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Initialize on load
window.addEventListener('DOMContentLoaded', init);

function init() {
    clock = new THREE.Clock();

    // Setup scene
    setupScene();

    // Create objects
    createSkybox();
    createGround();
    createChristmasTree();
    createGiftBoxes();
    createSnowParticles();
    createFireflies();
    createLights();
    createChristmasTreeLights();

    // Setup controls
    setupControls();

    // Event listeners
    setupEventListeners();

    // Initialize memory book
    memoryBook = new MemoryBook();

    // Start animation
    animate();
}

function setupScene() {
    // Scene with fog for atmosphere
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.025);

    // Camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 4, 12);
    camera.lookAt(0, 2.5, 0);

    // Renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    document.getElementById('scene-container').appendChild(renderer.domElement);
}

// ============================================
// SKYBOX with Gradient Shader
// ============================================
function createSkybox() {
    const skyboxSize = 50;
    const skyboxGeometry = new THREE.BoxGeometry(skyboxSize, skyboxSize, skyboxSize);

    // Gradient skybox shader
    const skyboxMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x000000) },
            bottomColor: { value: new THREE.Color(0x0a1529) },
            offset: { value: 10 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });

    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
}

// ============================================
// SNOWY GROUND with Displacement
// ============================================
function createGround() {
    const floorSize = 40;
    const segments = 128;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize, segments, segments);
    floorGeometry.rotateX(-Math.PI / 2);

    // Snow shader with displacement
    const snowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xdbeeff) },
            viewVector: { value: new THREE.Vector3() }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            varying float vDisplacement;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) {
                    v += a * noise(p);
                    p *= 2.0;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vNormal = normal;
                vPosition = position;
                
                float displacement = fbm(position.xz * 0.5) * 1.2;
                displacement += fbm(position.xz * 2.0) * 0.15;
                
                float dist = length(position.xz);
                float flatten = smoothstep(1.5, 5.0, dist);
                displacement *= flatten;

                vDisplacement = displacement;

                vec3 displacedPosition = position + vec3(0.0, displacement, 0.0);
                vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
                vWorldPosition = worldPosition.xyz;

                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform vec3 viewVector;
            varying vec3 vWorldPosition;
            varying float vDisplacement;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
                vec3 fdx = dFdx(vWorldPosition);
                vec3 fdy = dFdy(vWorldPosition);
                vec3 normal = normalize(cross(fdx, fdy));

                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                float brightness = max(0.0, dot(normal, lightDir));
                
                float ao = smoothstep(-0.5, 1.0, vDisplacement);

                vec3 viewDir = normalize(viewVector - vWorldPosition);
                float scale = 30.0;
                vec2 grid = floor(vWorldPosition.xz * scale);
                float noise = random(grid);
                
                float sparkle = 0.0;
                if (noise > 0.92) {
                    vec3 sparkleDir = normalize(vec3(random(grid), 1.0, random(grid + 1.0)));
                    float spec = max(0.0, dot(reflect(-viewDir, normal), sparkleDir));
                    sparkle = pow(spec, 30.0) * 2.5;
                }

                vec3 shadowColor = vec3(0.7, 0.8, 0.95) * color;
                vec3 highlightColor = vec3(1.0, 1.0, 0.95) * color;
                
                vec3 finalColor = mix(shadowColor, highlightColor, brightness);
                finalColor *= (0.8 + 0.2 * ao);
                finalColor += vec3(sparkle);

                float dist = length(vWorldPosition.xz);
                float fogFactor = smoothstep(15.0, 25.0, dist);
                finalColor = mix(finalColor, vec3(0.02, 0.02, 0.06), fogFactor);

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(floorGeometry, snowMaterial);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    floor.userData.material = snowMaterial;
    scene.add(floor);
}

// ============================================
// CHRISTMAS TREE
// ============================================
function createChristmasTree() {
    christmasTree = new THREE.Group();

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.35, 0.5, 1.5, 16);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3520,
        roughness: 0.95
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.25;
    trunk.castShadow = true;
    christmasTree.add(trunk);

    // Tree layers
    const layers = [
        { radius: 2.8, height: 2.0, y: 1.5 },
        { radius: 2.3, height: 1.8, y: 3.0 },
        { radius: 1.8, height: 1.6, y: 4.3 },
        { radius: 1.3, height: 1.4, y: 5.4 },
        { radius: 0.8, height: 1.2, y: 6.3 }
    ];

    const greenColors = [0x0d4d0d, 0x156315, 0x1d781d, 0x258d25, 0x2da32d];

    layers.forEach((layer, index) => {
        const coneGeometry = new THREE.ConeGeometry(layer.radius, layer.height, 12, 1);
        const coneMaterial = new THREE.MeshStandardMaterial({
            color: greenColors[index],
            roughness: 0.85,
            flatShading: true
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = layer.y;
        cone.castShadow = true;
        cone.receiveShadow = true;
        christmasTree.add(cone);

        // Snow on top
        const snowGeometry = new THREE.ConeGeometry(layer.radius * 0.4, 0.12, 12, 1);
        const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        const snow = new THREE.Mesh(snowGeometry, snowMaterial);
        snow.position.y = layer.y + layer.height / 2 - 0.03;
        christmasTree.add(snow);
    });

    createStar();
    createOrnaments();

    scene.add(christmasTree);
}

function createStar() {
    const starGroup = new THREE.Group();

    // Create 5-pointed star shape using THREE.Shape
    const starShape = new THREE.Shape();
    const outerRadius = 0.4;
    const innerRadius = 0.16;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            starShape.moveTo(x, y);
        } else {
            starShape.lineTo(x, y);
        }
    }
    starShape.closePath();

    // Extrude to make 3D star
    const extrudeSettings = {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2
    };
    const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    starGeometry.center();

    // Glowing gold material
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 1.5,
        metalness: 0.9,
        roughness: 0.1
    });

    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    // Xoay 180° để 1 cánh hướng LÊN TRÊN
    starMesh.rotation.z = Math.PI;
    starGroup.add(starMesh);

    // Inner glow sphere
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.35
    });
    const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), glowMaterial);
    starGroup.add(glowSphere);

    // Outer glow
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.15
    });
    const outerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), outerGlowMaterial);
    starGroup.add(outerGlow);

    // Light rays emanating from star
    // const rayMaterial = new THREE.MeshBasicMaterial({
    //     color: 0xfff8dc,
    //     transparent: true,
    //     opacity: 0.6
    // });

    // for (let i = 0; i < 8; i++) {
    //     const rayLength = 0.4 + (i % 2) * 0.25;
    //     const ray = new THREE.Mesh(
    //         new THREE.ConeGeometry(0.04, rayLength, 4),
    //         rayMaterial
    //     );
    //     const angle = (i / 8) * Math.PI * 2;
    //     // Rays emanate horizontally in XZ plane
    //     ray.position.set(
    //         Math.cos(angle) * 0.45,
    //         0,
    //         Math.sin(angle) * 0.45
    //     );
    //     ray.rotation.x = Math.PI / 2;
    //     ray.rotation.z = -angle;
    //     starGroup.add(ray);
    // }

    // Position star on top of tree
    starGroup.position.y = 7.4;
    starGroup.userData.glowSphere = glowSphere;
    starGroup.userData.outerGlow = outerGlow;
    christmasTree.add(starGroup);

    // Strong point light from star
    const starLight = new THREE.PointLight(0xffd700, 5, 15);
    starLight.position.y = 7.4;
    christmasTree.add(starLight);

    // Secondary warm light
    const warmLight = new THREE.PointLight(0xffaa00, 2.5, 10);
    warmLight.position.y = 7.4;
    christmasTree.add(warmLight);

    // Store reference for animation
    christmasTree.userData.starGroup = starGroup;
}

function createOrnaments() {
    const ornamentColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffd700, 0xff69b4, 0x00ffff, 0xff4500, 0x9400d3];
    const layers = [
        { y: 2.0, radius: 2.4, count: 12 },
        { y: 3.5, radius: 1.9, count: 10 },
        { y: 4.8, radius: 1.4, count: 8 },
        { y: 5.8, radius: 0.9, count: 6 }
    ];

    layers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            const angle = (i / layer.count) * Math.PI * 2 + Math.random() * 0.3;
            const color = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];
            const ornamentMaterial = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.8,
                roughness: 0.2,
                emissive: color,
                emissiveIntensity: 0.15
            });
            const ornament = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.06, 16, 16), ornamentMaterial);
            ornament.position.set(
                Math.cos(angle) * layer.radius * 0.85,
                layer.y + (Math.random() - 0.5) * 0.5,
                Math.sin(angle) * layer.radius * 0.85
            );
            ornament.castShadow = true;
            christmasTree.add(ornament);
        }
    });
}

// ============================================
// GIFT BOXES with Shader
// ============================================
function createGiftBoxes() {
    const palettes = [
        { base: 0xcc0000, ribbon: 0xffd700, puzzleType: 'date' },      // Red - Date puzzle
        { base: 0x006600, ribbon: 0xffffff, puzzleType: 'scramble' },  // Green - Word scramble
        { base: 0x0000cc, ribbon: 0xc0c0c0, puzzleType: 'equation' },  // Blue - Love equation
        { base: 0x800080, ribbon: 0xffd700, puzzleType: 'memory' },    // Purple - Memory match
        { base: 0xffffff, ribbon: 0xcc0000, puzzleType: null },        // White/Red - MAIN GIFT
        { base: 0x00aaaa, ribbon: 0xffd700, puzzleType: null },        // Extra decoration
        { base: 0xff6600, ribbon: 0xffffff, puzzleType: null }         // Extra decoration
    ];

    const positions = [
        { x: -4.5, z: 1.5, scale: 0.75, ry: 0.3 },   // Red - Date
        { x: 3.2, z: 3.2, scale: 0.6, ry: -2 },      // Green - Scramble
        { x: 3.5, z: 6.0, scale: 1.0, ry: 2.0 },     // Blue - Equation
        { x: 3.5, z: -2, scale: 0.75, ry: -1.5 },    // Purple - Memory
        { x: -2, z: 5, scale: 2, ry: 0 },         // MAIN GIFT (center front)
        { x: -2.5, z: 2.5, scale: 0.5, ry: 0.5 },    // Extra
        { x: 2.0, z: 2.0, scale: 0.55, ry: -0.4 }    // Extra
    ];

    positions.forEach((pos, index) => {
        const palette = palettes[index % palettes.length];
        const gift = createShaderGift(palette, pos.scale);
        gift.position.set(pos.x, 0, pos.z);
        gift.rotation.y = pos.ry;

        // Assign puzzle type
        gift.userData.puzzleType = palette.puzzleType;
        gift.userData.giftIndex = index;
        gift.userData.solved = false;

        if (index === 4) {
            gift.userData.isMainGift = true;
            gift.userData.originalY = 0;
        }

        giftBoxes.push(gift);
        scene.add(gift);
    });
}

function createShaderGift(palette, scale) {
    const size = 0.6 * scale;
    const boxGeometry = new THREE.BoxGeometry(size, size, size);

    // Gift shader with ribbon cross pattern
    const giftMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uBaseColor: { value: new THREE.Color(palette.base) },
            uRibbonColor: { value: new THREE.Color(palette.ribbon) },
            uTime: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 uBaseColor;
            uniform vec3 uRibbonColor;
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
                float ribbonWidth = 0.15;
                float inRibbonX = step(0.5 - ribbonWidth, vUv.x) * step(vUv.x, 0.5 + ribbonWidth);
                float inRibbonY = step(0.5 - ribbonWidth, vUv.y) * step(vUv.y, 0.5 + ribbonWidth);
                float isRibbon = max(inRibbonX, inRibbonY);
                vec3 color = mix(uBaseColor, uRibbonColor, isRibbon);
                
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);
                float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);
                
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diff = max(dot(normal, lightDir), 0.0);
                
                vec3 finalColor = color * (0.6 + 0.4 * diff) + (color * fresnel * 0.8);
                finalColor *= 1.0 + 0.1 * sin(uTime * 2.0);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `
    });

    const box = new THREE.Mesh(boxGeometry, giftMaterial);
    box.position.y = size / 2;
    box.castShadow = true;
    box.receiveShadow = true;

    const gift = new THREE.Group();
    gift.add(box);
    gift.userData.shaderMaterial = giftMaterial;

    return gift;
}

// ============================================
// SNOW PARTICLES (15,000 with wind)
// ============================================
function createSnowParticles() {
    const particleCount = 15000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = Math.random() * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xeeeeff) },
            size: { value: 0.08 * window.devicePixelRatio },
            scale: { value: window.innerHeight / 2 }
        },
        vertexShader: `
            uniform float size;
            uniform float scale;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (scale / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    snowParticleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(snowParticleSystem);
}

function updateSnowParticles(deltaTime) {
    if (!snowParticleSystem) return;
    const positions = snowParticleSystem.geometry.attributes.position.array;
    const time = clock.getElapsedTime();

    for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] -= deltaTime * 1.2;
        positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.5 + time) * deltaTime * 0.25;
        positions[i * 3 + 2] += Math.cos(positions[i * 3 + 1] * 0.3 + time * 0.7) * deltaTime * 0.15;

        if (positions[i * 3 + 1] < -0.5) {
            positions[i * 3 + 1] = 18 + Math.random() * 4;
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
    }
    snowParticleSystem.geometry.attributes.position.needsUpdate = true;
}

// ============================================
// FIREFLIES (Magical floating lights)
// ============================================
function createFireflies() {
    const firefliesCount = 40;
    const firefliesGeometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(firefliesCount * 3);
    const scaleArray = new Float32Array(firefliesCount);

    for (let i = 0; i < firefliesCount; i++) {
        positionArray[i * 3] = (Math.random() - 0.5) * 12;
        positionArray[i * 3 + 1] = Math.random() * 5 + 1;
        positionArray[i * 3 + 2] = (Math.random() - 0.5) * 12;
        scaleArray[i] = Math.random();
    }

    firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1));

    const firefliesMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            uSize: { value: 120 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uPixelRatio;
            uniform float uSize;
            attribute float aScale;
            void main() {
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                modelPosition.y += sin(uTime + modelPosition.x * 100.0) * aScale * 0.3;
                modelPosition.x += cos(uTime + modelPosition.y * 100.0) * aScale * 0.15;
                modelPosition.z += sin(uTime + modelPosition.z * 100.0) * aScale * 0.15;
                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;
                gl_PointSize = uSize * aScale * uPixelRatio;
                gl_PointSize *= (1.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            void main() {
                float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                float strength = 0.05 / distanceToCenter - 0.1;
                gl_FragColor = vec4(1.0, 0.9, 0.4, strength);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
    scene.add(fireflies);
}

// ============================================
// LIGHTS
// ============================================
function createLights() {
    // Ambient light - Cool blue night tint
    const ambientLight = new THREE.AmbientLight(0x1a234d, 0.5);
    scene.add(ambientLight);

    // Moonlight
    const moonLight = new THREE.DirectionalLight(0xcceeff, 1.5);
    moonLight.position.set(5, 10, 5);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.1;
    moonLight.shadow.camera.far = 30;
    moonLight.shadow.camera.left = -10;
    moonLight.shadow.camera.right = 10;
    moonLight.shadow.camera.top = 10;
    moonLight.shadow.camera.bottom = -10;
    moonLight.shadow.bias = -0.0005;
    scene.add(moonLight);

    // Warm glow from tree
    const treeLight = new THREE.PointLight(0xffaa33, 2.5, 12);
    treeLight.position.set(0, 3, 0);
    scene.add(treeLight);

    // Rim light
    const rimLight = new THREE.SpotLight(0x4d66cc, 1.5);
    rimLight.position.set(-5, 5, -5);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);
}

function createChristmasTreeLights() {
    const lightColors = [0xff0000, 0x00ff00, 0xffff00, 0x0088ff, 0xff00ff, 0xffffff];
    const layers = [
        { y: 2.0, radius: 2.2, count: 16 },
        { y: 3.5, radius: 1.7, count: 14 },
        { y: 4.8, radius: 1.3, count: 10 },
        { y: 5.8, radius: 0.8, count: 8 }
    ];

    layers.forEach(layer => {
        for (let i = 0; i < layer.count; i++) {
            const angle = (i / layer.count) * Math.PI * 2;
            const color = lightColors[Math.floor(Math.random() * lightColors.length)];

            const bulbGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const bulbMaterial = new THREE.MeshBasicMaterial({ color: color });
            const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
            bulb.position.set(
                Math.cos(angle) * layer.radius * 0.9,
                layer.y + (Math.random() - 0.5) * 0.8,
                Math.sin(angle) * layer.radius * 0.9
            );

            const pointLight = new THREE.PointLight(color, 0.3, 2);
            pointLight.position.copy(bulb.position);
            christmasTree.add(pointLight);

            bulb.userData.phase = Math.random() * Math.PI * 2;
            bulb.userData.light = pointLight;
            bulb.userData.baseIntensity = 0.3;

            christmasLights.push(bulb);
            christmasTree.add(bulb);
        }
    });
}

// ============================================
// CONTROLS
// ============================================
function setupControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.02;
    controls.minDistance = 5;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.update();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('bookClosed', onBookClosed);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkGiftClick();
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
        checkGiftClick();
    }
}

function checkGiftClick() {
    raycaster.setFromCamera(mouse, camera);

    const allGiftMeshes = [];
    giftBoxes.forEach(gift => {
        gift.traverse(child => {
            if (child.isMesh) {
                child.userData.parentGift = gift;
                allGiftMeshes.push(child);
            }
        });
    });

    const intersects = raycaster.intersectObjects(allGiftMeshes);

    if (intersects.length > 0) {
        const clickedGift = intersects[0].object.userData.parentGift;

        if (!clickedGift || isGiftOpen) return;

        // Check if it's a puzzle gift
        if (clickedGift.userData.puzzleType && !clickedGift.userData.solved) {
            if (puzzleSystem) {
                puzzleSystem.open(clickedGift.userData.puzzleType, clickedGift.userData.giftIndex);
            }
            return;
        }

        // Check if it's main gift
        if (clickedGift.userData.isMainGift) {
            // Show unlock panel instead of directly opening
            showUnlockPanel(clickedGift);
        }
    }
}

function showUnlockPanel(gift) {
    const unlockModal = document.getElementById('unlock-modal');
    if (unlockModal) {
        // Update piece display in unlock panel
        updateUnlockPiecesDisplay();
        unlockModal.classList.remove('hidden');
        unlockModal.dataset.giftIndex = giftBoxes.indexOf(gift);
    }
}

function updateUnlockPiecesDisplay() {
    if (!puzzleSystem) return;

    for (let i = 1; i <= 4; i++) {
        const slot = document.getElementById(`unlock-piece-${i}`);
        if (slot) {
            const collected = puzzleSystem.collectedPieces[i - 1];
            slot.dataset.collected = collected ? 'true' : 'false';
            slot.textContent = collected ? puzzleSystem.pieceIcons[i - 1] : '❓';
        }
    }

    const unlockBtn = document.getElementById('unlock-btn');
    const unlockStatus = document.getElementById('unlock-status');

    if (puzzleSystem.canOpenMainGift()) {
        unlockBtn.disabled = false;
        unlockBtn.classList.add('ready');
        unlockStatus.textContent = '🎉 Đã sẵn sàng mở quà!';
    } else {
        const collected = puzzleSystem.collectedPieces.filter(p => p).length;
        unlockBtn.disabled = true;
        unlockBtn.classList.remove('ready');
        unlockStatus.textContent = `Thu thập ${collected}/4 mảnh để mở khóa`;
    }
}

function openGift(gift) {
    isGiftOpen = true;
    controls.autoRotate = false;

    const startY = gift.position.y;
    const duration = 800;
    const startTime = Date.now();

    function animateOpen() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        gift.position.y = startY + Math.sin(progress * Math.PI) * 0.5;
        gift.rotation.y += 0.05;
        gift.scale.setScalar(1 + eased * 0.3);

        if (progress < 1) {
            requestAnimationFrame(animateOpen);
        } else {
            createSparkles(gift.position);
            setTimeout(() => {
                if (memoryBook) memoryBook.open();
            }, 300);
        }
    }

    animateOpen();
}

function createSparkles(position) {
    const sparkleCount = 50;
    const sparkles = [];

    for (let i = 0; i < sparkleCount; i++) {
        const sparkleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        const sparkleMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xffd700 : 0xffffff,
            transparent: true,
            opacity: 1
        });
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        sparkle.position.copy(position);
        sparkle.position.y += 0.5;
        sparkle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.15 + 0.1,
            (Math.random() - 0.5) * 0.2
        );
        sparkles.push(sparkle);
        scene.add(sparkle);
    }

    function animateSparkles() {
        let allGone = true;
        sparkles.forEach(sparkle => {
            if (sparkle.material.opacity > 0) {
                sparkle.position.add(sparkle.userData.velocity);
                sparkle.userData.velocity.y -= 0.005;
                sparkle.material.opacity -= 0.02;
                sparkle.scale.multiplyScalar(0.98);
                allGone = false;
            }
        });

        if (!allGone) {
            requestAnimationFrame(animateSparkles);
        } else {
            sparkles.forEach(s => scene.remove(s));
        }
    }

    animateSparkles();
}

function onBookClosed() {
    isGiftOpen = false;
    controls.autoRotate = true;

    giftBoxes.forEach(gift => {
        if (gift.userData.isMainGift) {
            gift.position.y = gift.userData.originalY;
            gift.scale.setScalar(1);
        }
    });
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = Math.min(clock.getDelta(), 0.1);
    const elapsedTime = clock.getElapsedTime();

    // Update snow
    updateSnowParticles(deltaTime);

    // Update fireflies
    if (fireflies) {
        fireflies.material.uniforms.uTime.value = elapsedTime;
    }

    // Update gift shaders
    giftBoxes.forEach(gift => {
        if (gift.userData.shaderMaterial) {
            gift.userData.shaderMaterial.uniforms.uTime.value = elapsedTime;
        }
        if (gift.userData.isMainGift && !isGiftOpen) {
            gift.position.y = gift.userData.originalY + Math.sin(elapsedTime * 2) * 0.05;
        }
    });

    // Update ground shader (view vector for sparkles)
    scene.traverse(child => {
        if (child.userData.material && child.userData.material.uniforms && child.userData.material.uniforms.viewVector) {
            child.userData.material.uniforms.viewVector.value.copy(camera.position);
        }
    });

    // Animate Christmas lights
    christmasLights.forEach(bulb => {
        const twinkle = 0.5 + Math.sin(elapsedTime * 4 + bulb.userData.phase) * 0.5;
        if (bulb.userData.light) {
            bulb.userData.light.intensity = bulb.userData.baseIntensity * twinkle;
        }
        bulb.material.opacity = 0.5 + twinkle * 0.5;
    });

    // Animate star glow
    if (christmasTree && christmasTree.userData.starGroup) {
        const starGroup = christmasTree.userData.starGroup;
        // Pulsing glow effect
        const pulse = 1 + Math.sin(elapsedTime * 2) * 0.15;
        if (starGroup.userData.glowSphere) {
            starGroup.userData.glowSphere.scale.setScalar(pulse);
            starGroup.userData.glowSphere.material.opacity = 0.2 + Math.sin(elapsedTime * 3) * 0.1;
        }
        if (starGroup.userData.outerGlow) {
            starGroup.userData.outerGlow.scale.setScalar(pulse * 1.1);
            starGroup.userData.outerGlow.material.opacity = 0.1 + Math.sin(elapsedTime * 2.5) * 0.05;
        }
        // Gentle rotation
        starGroup.rotation.y = elapsedTime * 0.3;
    }

    controls.update();
    renderer.render(scene, camera);
}

// ============================================
// AUDIO PLAYER
// ============================================
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const loadingScreen = document.getElementById('loading-screen');
const christmasMusic = document.getElementById('christmas-music');
const audioToggle = document.getElementById('audio-toggle');

christmasMusic.volume = 0.5;

startBtn.addEventListener('click', function () {
    christmasMusic.play().then(() => {
        audioToggle.classList.remove('muted');
        audioToggle.classList.add('playing');
    }).catch(err => console.log('Audio play error:', err));

    startOverlay.classList.add('hidden');
    loadingScreen.classList.remove('loading-hidden');

    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 2500);
});

audioToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (christmasMusic.paused) {
        christmasMusic.play().then(() => {
            this.classList.remove('muted');
            this.classList.add('playing');
        }).catch(err => console.log('Play failed:', err));
    } else {
        christmasMusic.pause();
        this.classList.add('muted');
        this.classList.remove('playing');
    }
});

christmasMusic.addEventListener('play', () => {
    audioToggle.classList.remove('muted');
    audioToggle.classList.add('playing');
});

christmasMusic.addEventListener('pause', () => {
    audioToggle.classList.add('muted');
    audioToggle.classList.remove('playing');
});

// ============================================
// PUZZLE SYSTEM
// ============================================
class PuzzleSystem {
    constructor() {
        this.modal = document.getElementById('puzzle-modal');
        this.puzzleContent = document.getElementById('puzzle-content');
        this.puzzleResult = document.getElementById('puzzle-result');
        this.puzzleWrong = document.getElementById('puzzle-wrong');
        this.puzzleTitle = document.getElementById('puzzle-title');
        this.puzzleIcon = document.getElementById('puzzle-icon');
        this.treasureIndicator = document.getElementById('treasure-indicator');
        this.treasureStatus = document.getElementById('treasure-status');

        this.collectedPieces = [false, false, false, false];
        this.currentPuzzle = null;
        this.memoryCards = [];
        this.memoryFlipped = [];
        this.memoryMoves = 0;
        this.memoryPairs = 0;

        this.pieceIcons = ['❤️', '💎', '⭐', '🎄'];

        this.init();
    }

    init() {
        // Close button
        document.getElementById('puzzle-close').addEventListener('click', () => this.close());
        document.getElementById('puzzle-continue').addEventListener('click', () => this.close());
        document.getElementById('puzzle-retry').addEventListener('click', () => this.showPuzzle(this.currentPuzzle));

        // Date puzzle
        document.getElementById('date-submit').addEventListener('click', () => this.checkDateAnswer());
        document.getElementById('date-answer').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkDateAnswer();
        });

        // Scramble puzzle
        document.getElementById('scramble-submit').addEventListener('click', () => this.checkScrambleAnswer());
        document.getElementById('scramble-reset').addEventListener('click', () => this.resetScramble());

        // Equation puzzle
        document.querySelectorAll('.equation-choice').forEach(btn => {
            btn.addEventListener('click', (e) => this.checkEquation(e.target.dataset.value));
        });

        // Backdrop click to close
        this.modal.querySelector('.puzzle-backdrop').addEventListener('click', () => this.close());
    }

    open(puzzleType, giftIndex) {
        this.currentPuzzle = puzzleType;
        this.currentGiftIndex = giftIndex;
        this.modal.classList.remove('hidden');

        // Hide all puzzles first
        document.querySelectorAll('.puzzle-game').forEach(p => p.classList.add('hidden'));
        this.puzzleContent.classList.remove('hidden');
        this.puzzleResult.classList.add('hidden');
        this.puzzleWrong.classList.add('hidden');

        // Set title based on puzzle
        const titles = {
            'date': '🔴 Hộp quà Đỏ',
            'scramble': '🟢 Hộp quà Xanh lá',
            'equation': '🔵 Hộp quà Xanh dương',
            'memory': '🟣 Hộp quà Tím'
        };
        this.puzzleTitle.textContent = titles[puzzleType] || 'Giải đố!';

        this.showPuzzle(puzzleType);
    }

    showPuzzle(type) {
        this.puzzleContent.classList.remove('hidden');
        this.puzzleResult.classList.add('hidden');
        this.puzzleWrong.classList.add('hidden');

        document.querySelectorAll('.puzzle-game').forEach(p => p.classList.add('hidden'));

        switch (type) {
            case 'date':
                document.getElementById('puzzle-date').classList.remove('hidden');
                document.getElementById('date-answer').value = '';
                document.getElementById('date-answer').focus();
                break;
            case 'scramble':
                document.getElementById('puzzle-scramble').classList.remove('hidden');
                this.initScramble();
                break;
            case 'equation':
                document.getElementById('puzzle-equation').classList.remove('hidden');
                document.querySelectorAll('.equation-choice').forEach(c => {
                    c.classList.remove('correct', 'wrong');
                });
                break;
            case 'memory':
                document.getElementById('puzzle-memory').classList.remove('hidden');
                this.initMemory();
                break;
        }
    }

    // === DATE PUZZLE ===
    checkDateAnswer() {
        const answer = document.getElementById('date-answer').value.trim();
        const validAnswers = ['14/9', '14/09', '14-9', '14-09', '14.9', '14.09'];

        if (validAnswers.includes(answer)) {
            this.puzzleSolved(0);
        } else {
            this.showWrong();
        }
    }

    // === WORD SCRAMBLE (ULTRA HARD) ===
    initScramble() {
        // Clear previous timers
        if (this.scrambleTimer) clearInterval(this.scrambleTimer);
        if (this.scrambleShuffleTimer) clearInterval(this.scrambleShuffleTimer);

        // Three words: "ANH", "YÊU", "EM"
        this.scrambleWord1 = 'ANH';
        this.scrambleWord2 = 'YÊU';
        this.scrambleWord3 = 'EM';

        // All real letters + fake letters
        const realLetters = (this.scrambleWord1 + this.scrambleWord2 + this.scrambleWord3).split('');
        const fakeLetters = ['X', 'Z', 'Q', 'K'];
        this.allScrambleLetters = [...realLetters, ...fakeLetters];

        this.scrambleAnswer1 = [];
        this.scrambleAnswer2 = [];
        this.scrambleAnswer3 = [];
        this.currentWordSlot = 1; // Which word box is active
        this.scrambleTimeLeft = 45;

        this.renderScrambleLetters();
        this.renderScrambleAnswerBoxes();
        this.startScrambleTimer();
        this.startAutoShuffle();
    }

    renderScrambleLetters() {
        const container = document.getElementById('scramble-letters');
        const shuffled = [...this.allScrambleLetters].sort(() => Math.random() - 0.5);

        container.innerHTML = '';

        shuffled.forEach((letter, index) => {
            const div = document.createElement('div');
            div.className = 'scramble-letter';
            // Check if already used
            const usedCount = [...this.scrambleAnswer1, ...this.scrambleAnswer2, ...this.scrambleAnswer3].filter(l => l === letter).length;
            const totalCount = this.allScrambleLetters.filter(l => l === letter).length;

            if (usedCount >= totalCount) {
                div.classList.add('selected');
            }
            div.textContent = letter;
            div.dataset.index = index;
            div.dataset.letter = letter;
            div.addEventListener('click', () => this.selectScrambleLetter(div, letter));
            container.appendChild(div);
        });
    }

    renderScrambleAnswerBoxes() {
        const answerContainer = document.getElementById('scramble-answer');
        answerContainer.innerHTML = `
            <div class="scramble-word-box ${this.currentWordSlot === 1 ? 'active' : ''}" id="word-box-1" data-word="1">
                <div class="word-label">Từ 1 (3 chữ)</div>
                <div class="word-letters" id="word-letters-1"></div>
            </div>
            <div class="scramble-word-box ${this.currentWordSlot === 2 ? 'active' : ''}" id="word-box-2" data-word="2">
                <div class="word-label">Từ 2 (3 chữ)</div>
                <div class="word-letters" id="word-letters-2"></div>
            </div>
            <div class="scramble-word-box ${this.currentWordSlot === 3 ? 'active' : ''}" id="word-box-3" data-word="3">
                <div class="word-label">Từ 3 (2 chữ)</div>
                <div class="word-letters" id="word-letters-3"></div>
            </div>
        `;

        // Click to switch active box
        document.getElementById('word-box-1').addEventListener('click', () => {
            this.currentWordSlot = 1;
            this.updateActiveWordBox();
        });
        document.getElementById('word-box-2').addEventListener('click', () => {
            this.currentWordSlot = 2;
            this.updateActiveWordBox();
        });
        document.getElementById('word-box-3').addEventListener('click', () => {
            this.currentWordSlot = 3;
            this.updateActiveWordBox();
        });

        this.updateWordLettersDisplay();
    }

    updateActiveWordBox() {
        const box1 = document.getElementById('word-box-1');
        const box2 = document.getElementById('word-box-2');
        const box3 = document.getElementById('word-box-3');
        if (box1) box1.classList.toggle('active', this.currentWordSlot === 1);
        if (box2) box2.classList.toggle('active', this.currentWordSlot === 2);
        if (box3) box3.classList.toggle('active', this.currentWordSlot === 3);
    }

    updateWordLettersDisplay() {
        const box1 = document.getElementById('word-letters-1');
        const box2 = document.getElementById('word-letters-2');
        const box3 = document.getElementById('word-letters-3');

        if (box1) {
            box1.innerHTML = this.scrambleAnswer1.map(l =>
                `<span class="placed-letter">${l}</span>`
            ).join('');
        }
        if (box2) {
            box2.innerHTML = this.scrambleAnswer2.map(l =>
                `<span class="placed-letter">${l}</span>`
            ).join('');
        }
        if (box3) {
            box3.innerHTML = this.scrambleAnswer3.map(l =>
                `<span class="placed-letter">${l}</span>`
            ).join('');
        }
    }

    selectScrambleLetter(element, letter) {
        if (element.classList.contains('selected')) return;

        // Add to current word slot
        if (this.currentWordSlot === 1) {
            if (this.scrambleAnswer1.length < 3) {
                this.scrambleAnswer1.push(letter);
                element.classList.add('selected');
            }
        } else if (this.currentWordSlot === 2) {
            if (this.scrambleAnswer2.length < 3) {
                this.scrambleAnswer2.push(letter);
                element.classList.add('selected');
            }
        } else {
            if (this.scrambleAnswer3.length < 2) {
                this.scrambleAnswer3.push(letter);
                element.classList.add('selected');
            }
        }

        this.updateWordLettersDisplay();
    }

    startScrambleTimer() {
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'scramble-timer';
        timerDisplay.className = 'scramble-timer';

        const puzzleContent = document.getElementById('puzzle-scramble');
        const existingTimer = document.getElementById('scramble-timer');
        if (existingTimer) existingTimer.remove();
        puzzleContent.insertBefore(timerDisplay, puzzleContent.firstChild);

        this.scrambleTimer = setInterval(() => {
            this.scrambleTimeLeft--;
            timerDisplay.textContent = `⏱️ ${this.scrambleTimeLeft}s`;

            if (this.scrambleTimeLeft <= 10) {
                timerDisplay.classList.add('warning');
            }

            if (this.scrambleTimeLeft <= 0) {
                this.scrambleTimeout();
            }
        }, 1000);
    }

    startAutoShuffle() {
        this.scrambleShuffleTimer = setInterval(() => {
            // Only shuffle if not all letters are selected
            const unselectedCount = document.querySelectorAll('.scramble-letter:not(.selected)').length;
            if (unselectedCount > 0) {
                this.renderScrambleLetters();
            }
        }, 5000);
    }

    scrambleTimeout() {
        clearInterval(this.scrambleTimer);
        clearInterval(this.scrambleShuffleTimer);

        const container = document.getElementById('scramble-letters');
        container.innerHTML = '<div class="scramble-timeout">⏰ Hết giờ! Thử lại...</div>';

        setTimeout(() => {
            this.initScramble();
        }, 1500);
    }

    resetScramble() {
        clearInterval(this.scrambleTimer);
        clearInterval(this.scrambleShuffleTimer);
        this.initScramble();
    }

    checkScrambleAnswer() {
        clearInterval(this.scrambleTimer);
        clearInterval(this.scrambleShuffleTimer);

        const answer1 = this.scrambleAnswer1.join('');
        const answer2 = this.scrambleAnswer2.join('');
        const answer3 = this.scrambleAnswer3.join('');

        // ANH + YÊU + EM
        if (answer1 === 'ANH' && answer2 === 'YÊU' && answer3 === 'EM') {
            this.puzzleSolved(1);
        } else {
            this.showWrong();
        }
    }

    // === LOVE EQUATION ===
    checkEquation(value) {
        document.querySelectorAll('.equation-choice').forEach(c => c.classList.remove('correct', 'wrong'));

        const clickedBtn = document.querySelector(`.equation-choice[data-value="${value}"]`);

        if (value === 'heart') {
            clickedBtn.classList.add('correct');
            setTimeout(() => this.puzzleSolved(2), 500);
        } else {
            clickedBtn.classList.add('wrong');
            setTimeout(() => this.showWrong(), 500);
        }
    }

    // === MEMORY MATCH (Enhanced with timer) ===
    initMemory() {
        // 6 pairs = 12 cards
        const symbols = ['💕', '💕', '❤️', '❤️', '💗', '💗', '💖', '💖', '💝', '💝', '💞', '💞'];
        const shuffled = symbols.sort(() => Math.random() - 0.5);
        const grid = document.getElementById('memory-grid');

        // Clear previous timer
        if (this.memoryTimer) {
            clearInterval(this.memoryTimer);
        }

        grid.innerHTML = '';
        this.memoryCards = [];
        this.memoryFlipped = [];
        this.memoryMoves = 0;
        this.memoryPairs = 0;
        this.memoryTimeLeft = 30; // 30 seconds

        document.getElementById('memory-moves').textContent = 'Lượt: 0';
        document.getElementById('memory-pairs').textContent = 'Cặp: 0/6';

        // Update grid to 4x3
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

        shuffled.forEach((symbol, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.symbol = symbol;
            card.dataset.index = index;
            card.innerHTML = '<span class="card-back">❓</span>';
            card.addEventListener('click', () => this.flipCard(card));
            grid.appendChild(card);
            this.memoryCards.push(card);
        });

        // Start timer
        this.startMemoryTimer();
    }

    startMemoryTimer() {
        const timerDisplay = document.getElementById('memory-moves');

        this.memoryTimer = setInterval(() => {
            this.memoryTimeLeft--;
            timerDisplay.textContent = `⏱️ ${this.memoryTimeLeft}s`;

            if (this.memoryTimeLeft <= 5) {
                timerDisplay.style.color = '#ff6b6b';
            }

            if (this.memoryTimeLeft <= 0) {
                clearInterval(this.memoryTimer);
                this.memoryTimeOut();
            }
        }, 1000);
    }

    memoryTimeOut() {
        // Show timeout message and restart
        const grid = document.getElementById('memory-grid');
        grid.innerHTML = '<div class="memory-timeout">⏰ Hết giờ! Thử lại...</div>';

        setTimeout(() => {
            this.initMemory();
        }, 1500);
    }

    flipCard(card) {
        if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
        if (this.memoryFlipped.length >= 2) return;

        card.classList.add('flipped');
        card.innerHTML = card.dataset.symbol;
        this.memoryFlipped.push(card);

        if (this.memoryFlipped.length === 2) {
            this.memoryMoves++;
            setTimeout(() => this.checkMemoryMatch(), 600);
        }
    }

    checkMemoryMatch() {
        const [card1, card2] = this.memoryFlipped;

        if (card1.dataset.symbol === card2.dataset.symbol) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.memoryPairs++;
            document.getElementById('memory-pairs').textContent = `Cặp: ${this.memoryPairs}/6`;

            if (this.memoryPairs === 6) {
                clearInterval(this.memoryTimer);
                setTimeout(() => this.puzzleSolved(3), 500);
            }
        } else {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            card1.innerHTML = '<span class="card-back">❓</span>';
            card2.innerHTML = '<span class="card-back">❓</span>';
        }

        this.memoryFlipped = [];
    }

    // === RESULT HANDLING ===
    puzzleSolved(pieceIndex) {
        this.collectedPieces[pieceIndex] = true;

        // Update piece slot
        const slot = document.getElementById(`piece-${pieceIndex + 1}`);
        slot.dataset.collected = 'true';
        slot.textContent = this.pieceIcons[pieceIndex];

        // Show result
        this.puzzleContent.classList.add('hidden');
        this.puzzleResult.classList.remove('hidden');
        document.getElementById('piece-earned').textContent = this.pieceIcons[pieceIndex];

        // Mark gift as solved
        giftBoxes.forEach(gift => {
            if (gift.userData.giftIndex === this.currentGiftIndex) {
                gift.userData.solved = true;
            }
        });

        // Check if all pieces collected
        this.updateTreasureStatus();
    }

    showWrong() {
        this.puzzleContent.classList.add('hidden');
        this.puzzleWrong.classList.remove('hidden');
    }

    updateTreasureStatus() {
        const collected = this.collectedPieces.filter(p => p).length;

        if (collected === 4) {
            this.treasureStatus.textContent = '🎉 Đã sẵn sàng mở quà chính!';
            this.treasureIndicator.classList.add('complete');
        } else {
            this.treasureStatus.textContent = `Thu thập ${collected}/4 mảnh để mở quà!`;
        }
    }

    canOpenMainGift() {
        return this.collectedPieces.every(p => p);
    }

    close() {
        this.modal.classList.add('hidden');
    }
}

// Initialize puzzle system
let puzzleSystem;
window.addEventListener('load', () => {
    puzzleSystem = new PuzzleSystem();
});

// Override gift click handler to check for puzzles
const originalOnDocumentClick = onDocumentClick;
function onDocumentClick(event) {
    if (isGiftOpen) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const giftMeshes = giftBoxes.map(g => g.children[0]).filter(Boolean);
    const intersects = raycaster.intersectObjects(giftMeshes);

    if (intersects.length > 0) {
        const clickedGift = intersects[0].object.parent;

        // Check if it's a puzzle gift
        if (clickedGift.userData.puzzleType && !clickedGift.userData.solved) {
            puzzleSystem.open(clickedGift.userData.puzzleType, clickedGift.userData.giftIndex);
            return;
        }

        // Check if it's main gift
        if (clickedGift.userData.isMainGift) {
            if (puzzleSystem && puzzleSystem.canOpenMainGift()) {
                openGiftAnimation(clickedGift);
            } else {
                // Show hint that pieces are needed
                const status = document.getElementById('treasure-status');
                status.textContent = '⚠️ Thu thập đủ 4 mảnh ghép trước!';
                status.style.color = '#ff6b6b';
                setTimeout(() => {
                    puzzleSystem.updateTreasureStatus();
                    status.style.color = '';
                }, 2000);
            }
        }
    }
}

// ============================================
// UNLOCK MODAL EVENT BINDINGS
// ============================================
window.addEventListener('load', () => {
    const unlockModal = document.getElementById('unlock-modal');
    const unlockClose = document.getElementById('unlock-close');
    const unlockBackdrop = unlockModal?.querySelector('.unlock-backdrop');
    const unlockBtn = document.getElementById('unlock-btn');

    // Close unlock modal
    if (unlockClose) {
        unlockClose.addEventListener('click', () => {
            unlockModal.classList.add('hidden');
        });
    }

    if (unlockBackdrop) {
        unlockBackdrop.addEventListener('click', () => {
            unlockModal.classList.add('hidden');
        });
    }

    // Unlock button click
    if (unlockBtn) {
        unlockBtn.addEventListener('click', () => {
            if (puzzleSystem && puzzleSystem.canOpenMainGift()) {
                unlockModal.classList.add('hidden');
                // Find and open main gift
                const mainGift = giftBoxes.find(g => g.userData.isMainGift);
                if (mainGift) {
                    openGift(mainGift);
                }
            }
        });
    }
});
