// === index.html dan ajratildi (XOLERIC SEO) ===
{
    "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
    }
}

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

class XolericProCore {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.width = window.innerWidth; 
        this.height = window.innerHeight;
        this.isMobile = this.width < 768;

        this.mouse = new THREE.Vector2(0, 0); 
        this.targetRotation = new THREE.Vector2(0, 0);
        this.windowHalfX = this.width / 2; 
        this.windowHalfY = this.height / 2;
        
        this.baseHue = Math.random() * 360; // Har bir oyna o'zining unikal rangidan boshlaydi
        this.currentHue = this.baseHue;
        this.time = 0; 
        this.uiShown = false;
        
        // Birlashish o'zgaruvchilari
        this.mergeFactor = 0; // 0 dan 1 gacha
        this.smoothedMerge = 0;

        // UI elementlari
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fpsEl = document.getElementById('fps-counter');
        this.titleEl = document.getElementById('main-title');
        this.statusEl = document.getElementById('sync-status');
        this.mergeBar = document.getElementById('merge-bar');
        this.topPanel = document.getElementById('top-panel');
        this.bottomPanel = document.getElementById('bottom-panel');

        // BroadcastChannel Sozlamalari
        this.windowId = Math.random().toString(36).substring(2, 9);
        this.channel = new BroadcastChannel('xoleric-pro-sync');
        this.foreignCores = {};
        
        this.channel.onmessage = (e) => {
            if (e.data.type === 'sync' && e.data.id !== this.windowId) {
                this.foreignCores[e.data.id] = {
                    x: e.data.x,
                    y: e.data.y,
                    hue: e.data.hue,
                    lastUpdate: performance.now()
                };
            }
        };

        this.init();
        this.addCores(); // Endi ham Box ham PRO shakl qo'shiladi
        this.addNeuralNetwork();
        this.initPostProcessing();
        this.addMatrixBackground();
        this.addEventListeners();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene(); 
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 100);
        this.camera.position.z = this.isMobile ? 7 : 5.5; 

        this.renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(this.width, this.height); 
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        this.ambientLight = new THREE.AmbientLight(0x222222, 2); 
        this.scene.add(this.ambientLight);
        this.pointLight1 = new THREE.PointLight(0xffffff, 40, 20); 
        this.scene.add(this.pointLight1);
        this.pointLight2 = new THREE.PointLight(0xffffff, 40, 20); 
        this.scene.add(this.pointLight2);
        
        // Markaziy kuchli yorug'lik (faqat birlashganda yonadi)
        this.coreLight = new THREE.PointLight(0xffffff, 0, 10);
        this.scene.add(this.coreLight);
    }

    addCores() {
        // 1. Asosiy Holat: KUB
        const boxGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
        
        this.canvas = document.createElement('canvas'); 
        this.canvas.width = 512; this.canvas.height = 512;
        this.texCtx = this.canvas.getContext('2d', { alpha: false }); 
        this.canvasTexture = new THREE.CanvasTexture(this.canvas);
        this.canvasTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        this.boxMaterial = new THREE.MeshPhysicalMaterial({
            map: this.canvasTexture, color: 0xffffff, metalness: 0.3, roughness: 0.1, 
            transmission: 0.5, thickness: 1.0, emissive: 0x000000, transparent: true
        });
        
        this.coreBox = new THREE.Mesh(boxGeo, this.boxMaterial); 
        this.scene.add(this.coreBox);

        // 2. Birlashgan Holat (PRO): Kvant Halqa (Torus Knot)
        const knotGeo = new THREE.TorusKnotGeometry(0.8, 0.25, 128, 32);
        this.knotMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.9, roughness: 0.0, 
            transmission: 0.9, thickness: 2.0, emissive: 0x000000, transparent: true, opacity: 0
        });
        this.coreKnot = new THREE.Mesh(knotGeo, this.knotMaterial);
        // Boshida kichkina va ko'rinmas bo'ladi
        this.coreKnot.scale.set(0, 0, 0);
        this.scene.add(this.coreKnot);

        // Himoya qafasi
        const cageGeo = new THREE.IcosahedronGeometry(1.5, 1);
        this.cageMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.15 });
        this.cage = new THREE.Mesh(cageGeo, this.cageMaterial); 
        this.scene.add(this.cage);
        
        // Global konteyner harakatlanishi uchun
        this.masterGroup = new THREE.Group();
        this.masterGroup.add(this.coreBox);
        this.masterGroup.add(this.coreKnot);
        this.masterGroup.add(this.cage);
        this.masterGroup.add(this.pointLight1);
        this.masterGroup.add(this.pointLight2);
        this.masterGroup.add(this.coreLight);
        this.scene.add(this.masterGroup);
    }

    addNeuralNetwork() {
        this.neurons = []; 
        const neuronCount = this.isMobile ? 50 : 120;
        const neuronGeo = new THREE.SphereGeometry(this.isMobile ? 0.04 : 0.03, 8, 8);
        this.neuronMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

        for(let i = 0; i < neuronCount; i++) {
            const neuron = new THREE.Mesh(neuronGeo, this.neuronMat);
            neuron.position.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
            neuron.scale.set(0.01, 0.01, 0.01);
            this.scene.add(neuron);
            
            this.neurons.push({
                mesh: neuron,
                basePos: neuron.position.clone(),
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01)
            });
        }

        this.neuronLinesGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(neuronCount * neuronCount * 3 * 2);
        this.neuronLinesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.neuronLinesMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.2 });
        this.neuronLines = new THREE.LineSegments(this.neuronLinesGeo, this.neuronLinesMat); 
        this.scene.add(this.neuronLines);
    }

    initPostProcessing() {
        const renderScene = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width / (this.isMobile ? 2 : 1), this.height / (this.isMobile ? 2 : 1)), 
            1.2, 0.5, 0.2
        );
        this.composer = new EffectComposer(this.renderer); 
        this.composer.addPass(renderScene); 
        this.composer.addPass(this.bloomPass);
    }

    addMatrixBackground() {
        this.bgCanvas = document.createElement('canvas'); 
        Object.assign(this.bgCanvas.style, { position: 'fixed', top: '0', left: '0', zIndex: '0', opacity: '0.15', pointerEvents: 'none' });
        document.body.appendChild(this.bgCanvas);
        this.bgCtx = this.bgCanvas.getContext('2d', { alpha: false }); 
        this.matrixDrops = []; 
        this.resizeMatrix();
    }

    resizeMatrix() { 
        this.bgCanvas.width = window.innerWidth; 
        this.bgCanvas.height = window.innerHeight;
        const columns = Math.floor(this.bgCanvas.width / (this.isMobile ? 12 : 16)); 
        this.matrixDrops = Array(columns).fill(1);
    }

    updateMatrix() {
        if(this.frameCount % 2 !== 0) return;
        this.bgCtx.fillStyle = `rgba(3, 3, 3, ${0.1 + this.smoothedMerge * 0.2})`; // Birlashganda orqa fon qorayadi
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.fillStyle = `hsl(${this.currentHue}, 100%, 50%)`; 
        
        const fontSize = this.isMobile ? 12 : 16;
        this.bgCtx.font = `${fontSize}px Courier New`;
        const chars = "QUANTUM01<>{}[]XOLERIC"; 
        
        for(let i = 0; i < this.matrixDrops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            this.bgCtx.fillText(text, i * fontSize, this.matrixDrops[i] * fontSize);
            // Birlashish vaqtida yomg'ir tezlashadi
            if(this.matrixDrops[i] * fontSize > this.bgCanvas.height && Math.random() > (0.95 - this.smoothedMerge * 0.1)) {
                this.matrixDrops[i] = 0;
            }
            this.matrixDrops[i] += 1 + this.smoothedMerge;
        }
    }

    updateTexture() {
        if(this.frameCount % 3 !== 0) return;
        this.texCtx.fillStyle = '#050505'; 
        this.texCtx.fillRect(0, 0, 512, 512);
        this.texCtx.lineWidth = 15; 
        this.texCtx.strokeStyle = `hsl(${this.currentHue}, 80%, 40%)`; 
        this.texCtx.strokeRect(30, 30, 452, 452);
        
        this.texCtx.font = 'bold 60px Courier New'; 
        this.texCtx.textAlign = 'center'; 
        this.texCtx.textBaseline = 'middle';
        this.texCtx.fillStyle = `hsl(${this.currentHue}, 100%, 65%)`;
        this.texCtx.fillText("X O L E R I C", 256, 256);
        this.texCtx.font = '24px Courier New';
        this.texCtx.fillText(this.smoothedMerge > 0.5 ? "QUANTUM MERGE" : "NEURAL CORE", 256, 320);
        this.canvasTexture.needsUpdate = true;
    }

    addEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX - this.windowHalfX) * 0.001; 
            this.mouse.y = (e.clientY - this.windowHalfY) * 0.001;
        });
        document.addEventListener('touchmove', (e) => {
            if(e.touches.length > 0) { 
                this.mouse.x = (e.touches[0].clientX - this.windowHalfX) * 0.002; 
                this.mouse.y = (e.touches[0].clientY - this.windowHalfY) * 0.002; 
            } 
        }, { passive: false });
    }

    onWindowResize() { 
        this.width = window.innerWidth; this.height = window.innerHeight;
        this.isMobile = this.width < 768;
        this.windowHalfX = this.width / 2; this.windowHalfY = this.height / 2;
        this.camera.aspect = this.width / this.height; 
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height); 
        this.composer.setSize(this.width, this.height); 
        this.resizeMatrix();
    }

    updateFPS() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        if(delta >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / delta);
            this.fpsEl.innerText = fps;
            this.fpsEl.style.color = fps < 30 ? '#ff3333' : fps < 50 ? '#ffaa00' : 'var(--primary)';
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        this.frameCount++;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.time += 0.01; 
        
        // Agar yakkalangan bo'lsa o'zining rangini aylantiradi
        if (this.smoothedMerge < 0.05) {
            this.baseHue = (this.baseHue + 0.3) % 360;
            this.currentHue = this.baseHue;
        }
        
        this.updateFPS();

        // 1. Oynaning global markazini aniqlash
        let leftChrome = (window.outerWidth - window.innerWidth) / 2;
        let topChrome = window.outerHeight - window.innerHeight - leftChrome;
        let myGlobalX = window.screenX + Math.max(0, leftChrome) + this.width / 2;
        let myGlobalY = window.screenY + Math.max(0, topChrome) + this.height / 2;

        this.channel.postMessage({
            type: 'sync', id: this.windowId, x: myGlobalX, y: myGlobalY, hue: this.baseHue
        });

        // 2. Magnit mexanikasi va Rang sinxronizatsiyasi
        let closestId = null;
        let minDist = Infinity;
        let targetGlobalX = myGlobalX;
        let targetGlobalY = myGlobalY;

        for (let id in this.foreignCores) {
            if (performance.now() - this.foreignCores[id].lastUpdate < 1000) {
                let dist = Math.hypot(this.foreignCores[id].x - myGlobalX, this.foreignCores[id].y - myGlobalY);
                if (dist < minDist) { minDist = dist; closestId = id; }
            } else { delete this.foreignCores[id]; }
        }

        let magnetDistance = 1000; 
        let isMagnetized = false;
        let targetHue = this.baseHue;

        if (closestId && minDist < magnetDistance) {
            targetGlobalX = (myGlobalX + this.foreignCores[closestId].x) / 2;
            targetGlobalY = (myGlobalY + this.foreignCores[closestId].y) / 2;
            isMagnetized = true;
            
            // Masofaga qarab birlashish kuchini hisoblash (0 dan 1 gacha)
            this.mergeFactor = 1.0 - (minDist / magnetDistance);
            
            // Ranglarni birlashtirish: Bitta ID ustunlik qiladi (bir xil rang bo'lishi uchun)
            if (this.windowId > closestId) {
                targetHue = this.foreignCores[closestId].hue;
            } else {
                targetHue = this.baseHue;
            }
            
            // Maksimal birlashganda super energiya rangi (Pushti-Qizil / Kvant effekti)
            if(this.mergeFactor > 0.8) targetHue = 330; // Neon Pink
        } else {
            this.mergeFactor = 0;
        }

        // Birlashish o'tishini silliqlash
        this.smoothedMerge += (this.mergeFactor - this.smoothedMerge) * 0.05;
        
        // Rangni silliq o'tkazish
        let hueDiff = targetHue - this.currentHue;
        if(hueDiff > 180) hueDiff -= 360; else if(hueDiff < -180) hueDiff += 360;
        this.currentHue += hueDiff * 0.05;
        if(this.currentHue < 0) this.currentHue += 360;

        // 3. 3D joylashuvni hisoblash
        let vFOV = THREE.MathUtils.degToRad(this.camera.fov);
        let visibleHeight = 2 * Math.tan(vFOV / 2) * this.camera.position.z;
        let visibleWidth = visibleHeight * this.camera.aspect;

        let targetWorldX = (targetGlobalX - myGlobalX) * (visibleWidth / this.width);
        let targetWorldY = -(targetGlobalY - myGlobalY) * (visibleHeight / this.height);

        this.masterGroup.position.x += (targetWorldX - this.masterGroup.position.x) * (0.02 + this.smoothedMerge * 0.05);
        this.masterGroup.position.y += (targetWorldY - this.masterGroup.position.y) * (0.02 + this.smoothedMerge * 0.05);

        // 4. SHAKL MORPHING (KUB -> TORUS KNOT)
        // Kub kichrayib yo'qoladi, Halqa kattalashib paydo bo'ladi
        let boxScale = Math.max(0.01, 1.0 - (this.smoothedMerge * 1.5));
        let knotScale = this.smoothedMerge * 1.8; 
        
        this.coreBox.scale.setScalar(boxScale);
        this.coreBox.material.opacity = 1.0 - this.smoothedMerge;
        
        this.coreKnot.scale.setScalar(knotScale);
        this.coreKnot.material.opacity = this.smoothedMerge;

        // Aylanish tezligi birlashganda ortadi
        let rotSpeed = 0.003 + (this.smoothedMerge * 0.02);
        this.targetRotation.x = this.mouse.y * 3; 
        this.targetRotation.y = this.mouse.x * 3;
        
        this.coreBox.rotation.x += (this.targetRotation.x - this.coreBox.rotation.x) * 0.05;
        this.coreBox.rotation.y += (this.targetRotation.y - this.coreBox.rotation.y) * 0.05;
        this.coreBox.rotation.z += rotSpeed;
        
        this.coreKnot.rotation.x += rotSpeed * 2;
        this.coreKnot.rotation.y -= rotSpeed * 1.5;
        this.coreKnot.rotation.z += rotSpeed * 3;

        this.cage.rotation.copy(this.coreBox.rotation); 
        this.cage.rotation.x *= -1.5;
        this.cage.scale.setScalar(1.0 + this.smoothedMerge * 0.5); // Qafas ham kattalashadi

        // 5. Ranglar va Effektlarni yangilash
        const colorHex = new THREE.Color(`hsl(${this.currentHue}, 100%, 50%)`);
        const dimColorHex = new THREE.Color(`hsl(${this.currentHue}, 100%, 20%)`);
        const mergeColorHex = new THREE.Color(`hsl(${this.currentHue}, 100%, ${50 + this.smoothedMerge * 30}%)`);
        
        document.documentElement.style.setProperty('--primary', `hsl(${this.currentHue}, 100%, 50%)`);
        this.cageMaterial.color = colorHex; 
        this.boxMaterial.emissive = dimColorHex;
        this.knotMaterial.emissive = new THREE.Color(`hsl(${this.currentHue}, 100%, ${30 + this.smoothedMerge * 20}%)`);
        this.neuronMat.color = mergeColorHex;
        this.neuronLinesMat.color = mergeColorHex;
        
        // Yorug'lik va Post-processing intensivligi
        this.pointLight1.color = colorHex;
        this.pointLight1.position.set(2, 2, 2).multiplyScalar(1 + this.smoothedMerge);
        this.pointLight2.color = new THREE.Color(`hsl(${(this.currentHue + 180) % 360}, 100%, 50%)`);
        this.pointLight2.position.set(-2, -2, 2).multiplyScalar(1 + this.smoothedMerge);
        
        this.coreLight.color = colorHex;
        this.coreLight.intensity = this.smoothedMerge * 100; // Markazda yorqin chaqnash
        
        this.bloomPass.strength = 1.2 + (this.smoothedMerge * 2.5); // Yorqinlik birlashganda portlaydi

        // UI Yangilash
        this.titleEl.style.textShadow = `0 0 ${15 + this.smoothedMerge*20}px var(--primary)`;
        if (this.smoothedMerge > 0.8) {
            this.statusEl.innerText = "CRITICAL MASS";
            this.statusEl.style.color = "#fff";
            document.documentElement.style.setProperty('--primary', '#ff0055');
            this.topPanel.style.borderColor = "var(--primary)";
        } else if (this.smoothedMerge > 0.1) {
            this.statusEl.innerText = "ENTANGLING...";
            this.statusEl.style.color = "var(--primary)";
            this.topPanel.style.borderColor = "var(--primary)";
        } else {
            this.statusEl.innerText = "ISOLATED";
            this.statusEl.style.color = "var(--primary)";
            this.topPanel.style.borderColor = "rgba(255,255,255,0.1)";
        }
        this.mergeBar.style.width = `${this.smoothedMerge * 100}%`;

        // 6. Neyronlar gravitatsiyasi (Markazga so'rilish)
        let completeCount = 0;
        const globalCenter = new THREE.Vector3(0,0,0);
        const mouseVec3 = new THREE.Vector3(this.mouse.x * 5, -this.mouse.y * 5, 0);

        this.neurons.forEach(n => {
            if(n.mesh.scale.x < 1) {
                const s = Math.min(n.mesh.scale.x + 0.02, 1);
                n.mesh.scale.set(s, s, s);
            } else { completeCount++; }

            n.mesh.position.add(n.vel);
            
            // Chegaralar birlashganda kengayadi
            let bounds = 1.5 + this.smoothedMerge; 
            for(const axis of ['x','y','z']){
                if(n.mesh.position[axis] > bounds || n.mesh.position[axis] < -bounds) n.vel[axis] *= -1;
            }

            // Birlashish vaqtida neyronlar markazga aylanib tortiladi (Qora tuynuk effekti)
            if (this.smoothedMerge > 0.1) {
                let pullStrength = this.smoothedMerge * 0.05;
                n.mesh.position.lerp(globalCenter, pullStrength);
                // Orbitada aylanish effekti
                n.mesh.position.applyAxisAngle(new THREE.Vector3(0,1,0), this.smoothedMerge * 0.05);
            }

            const dist = n.mesh.position.distanceTo(mouseVec3);
            if(dist < 1.0) n.mesh.position.lerp(n.basePos, 0.05);
        });

        if(!this.uiShown && completeCount === this.neurons.length) {
            this.uiShown = true;
            document.getElementById('ui-layer').style.opacity = '1';
            document.getElementById('ui-layer').style.transform = 'scale(1)';
        }

        // Neyron chiziqlari masofasi o'zgarishi
        const positions = this.neuronLinesGeo.attributes.position.array; 
        let idx = 0;
        const connectDist = (this.isMobile ? 0.6 : 0.45) + (this.smoothedMerge * 0.5);

        for(let i = 0; i < this.neurons.length; i++) {
            for(let j = i + 1; j < this.neurons.length; j++) {
                const dx = this.neurons[i].mesh.position.x - this.neurons[j].mesh.position.x;
                const dy = this.neurons[i].mesh.position.y - this.neurons[j].mesh.position.y;
                const dz = this.neurons[i].mesh.position.z - this.neurons[j].mesh.position.z;
                if((dx*dx + dy*dy + dz*dz) < (connectDist * connectDist)) {
                    positions[idx++] = this.neurons[i].mesh.position.x; positions[idx++] = this.neurons[i].mesh.position.y; positions[idx++] = this.neurons[i].mesh.position.z;
                    positions[idx++] = this.neurons[j].mesh.position.x; positions[idx++] = this.neurons[j].mesh.position.y; positions[idx++] = this.neurons[j].mesh.position.z;
                }
            }
        }
        
        this.neuronLinesGeo.setDrawRange(0, idx / 3); 
        this.neuronLinesGeo.attributes.position.needsUpdate = true;

        this.updateTexture(); 
        this.updateMatrix(); 
        this.composer.render();
    }
}

new XolericProCore();