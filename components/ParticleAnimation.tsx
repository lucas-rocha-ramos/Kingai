import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { isWebGLAvailable } from '../services/webgl';

interface ParticleAnimationProps {
    aspectRatio?: string;
    duration?: number; // Duração da animação em segundos
}

export const ParticleAnimation: React.FC<ParticleAnimationProps> = ({ aspectRatio: propAspectRatio = '1:1', duration = 10 }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const particleSystemRef = useRef<THREE.Points | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        const supported = isWebGLAvailable();
        setWebglSupported(supported);
        
        if (!supported || !mountRef.current) return;

        const container = mountRef.current;
        const clock = new THREE.Clock();
        
        const vertexShader = `
            uniform float uTime;
            uniform float uProgress;
            uniform float uGlitchAmount;
            attribute float aScale;
            attribute vec3 aTargetPosition;

            // Função para gerar números pseudo-aleatórios
            float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            void main() {
                // Interpola a posição da partícula
                float progress = smoothstep(0.2, 0.8, uProgress);
                vec3 finalPos = mix(position, aTargetPosition, progress);
                
                // Movimento de "energia"
                float struggle = sin(progress * 3.14159) * 0.15;
                finalPos.x += cos(uTime * 2.0 + position.y * 10.0) * struggle;
                finalPos.y += sin(uTime * 2.0 + position.x * 10.0) * struggle;
                
                // Efeito de Glitch
                if (uGlitchAmount > 0.0) {
                    float glitchX = (rand(vec2(position.y * 0.1, uTime)) - 0.5) * uGlitchAmount;
                    float glitchY = (rand(vec2(position.x * 0.1, uTime)) - 0.5) * uGlitchAmount;
                    finalPos.x += glitchX;
                    finalPos.y += glitchY;
                }

                vec4 modelPosition = modelMatrix * vec4(finalPos, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;

                gl_Position = projectedPosition;
                
                float finalPointSize = aScale * 1.5;
                finalPointSize *= (1.0 - viewPosition.z / 10.0);

                // Efeito de dissipação: as partículas encolhem no final
                float dissipate = smoothstep(0.85, 1.0, uProgress);
                finalPointSize *= (1.0 - dissipate);

                gl_PointSize = finalPointSize;
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform float uProgress;

            void main() {
                float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                float strength = 1.0 - (distanceToCenter * 2.0);

                // Paleta de cores futurista
                vec3 colorCold = vec3(0.0, 0.1, 0.4); // Azul escuro
                vec3 colorHot = vec3(0.0, 1.0, 1.0);  // Ciano brilhante
                vec3 finalColor = mix(colorCold, colorHot, uProgress * 1.2);

                // Efeito de Scanline (linhas de varredura)
                float scanline = clamp(sin(gl_FragCoord.y * 0.8) * 10.0, 0.85, 1.0);
                vec3 colorWithScanline = finalColor * scanline;

                // Opacidade com fade-in e fade-out mais suave no final
                float alpha = smoothstep(0.0, 0.2, uProgress) - smoothstep(0.85, 1.0, uProgress);
                alpha += pow(uProgress, 15.0) * 0.3; // Pulso de brilho
                
                gl_FragColor = vec4(colorWithScanline * strength, strength * alpha);
            }
        `;

        const parseAspectRatio = (ratio: string | undefined): number => {
            if (!ratio) return 1;
            const parts = ratio.split(':');
            if (parts.length !== 2) return 1;
            const width = parseFloat(parts[0]);
            const height = parseFloat(parts[1]);
            return isNaN(width) || isNaN(height) || height === 0 ? 1 : width / height;
        }

        let aspectRatio = parseAspectRatio(propAspectRatio);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 3.5;
        cameraRef.current = camera;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(container.clientWidth, container.clientHeight);
            rendererRef.current = renderer;
            container.appendChild(renderer.domElement);
        } catch (e) {
            console.error("Failed to create WebGL context:", e);
            setWebglSupported(false);
            return;
        }

        const createParticleSystem = () => {
            const particleCount = 30000;
            const initialPositions = new Float32Array(particleCount * 3);
            const targetPositions = new Float32Array(particleCount * 3);
            const scales = new Float32Array(particleCount);
            
            const imageWidth = 4.5;
            const imageHeight = imageWidth / aspectRatio;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const radius = Math.random() * 5.0;
                const angle = Math.random() * Math.PI * 2;
                initialPositions[i3] = Math.cos(angle) * radius;
                initialPositions[i3 + 1] = Math.sin(angle) * radius;
                initialPositions[i3 + 2] = (Math.random() - 0.5) * 5;

                targetPositions[i3] = (Math.random() - 0.5) * imageWidth;
                targetPositions[i3 + 1] = (Math.random() - 0.5) * imageHeight;
                targetPositions[i3 + 2] = (Math.random() - 0.5) * 0.1;

                scales[i] = Math.random() * 2.0 + 1.0;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
            geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(targetPositions, 3));
            geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uProgress: { value: 0.0 },
                    uGlitchAmount: { value: 0.0 }
                },
                vertexShader,
                fragmentShader,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false,
            });

            const particleSystem = new THREE.Points(geometry, material);
            scene.add(particleSystem);
            particleSystemRef.current = particleSystem;
        };

        const animate = () => {
            animationFrameId.current = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            
            const particleSystem = particleSystemRef.current;
            if (!particleSystem) return;

            (particleSystem.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
            
            const progress = Math.min(elapsedTime / duration, 1.0);
            (particleSystem.material as THREE.ShaderMaterial).uniforms.uProgress.value = progress;

            let glitchAmount = 0.0;
            if (progress > 0.65 && progress < 0.7) {
                glitchAmount = Math.random() * 0.4;
            }
            (particleSystem.material as THREE.ShaderMaterial).uniforms.uGlitchAmount.value = glitchAmount;

            renderer.render(scene, camera);
        };
        
        const handleResize = () => {
            if (!container || !rendererRef.current || !cameraRef.current) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            const newAspectRatio = width / height;
            
            cameraRef.current.aspect = newAspectRatio;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
            
            const particleSystem = particleSystemRef.current;
            if(particleSystem) {
                const logicalAspectRatio = parseAspectRatio(propAspectRatio);
                const imageWidth = 4.5;
                const imageHeight = imageWidth / logicalAspectRatio;
                const targets = (particleSystem.geometry.attributes.aTargetPosition as THREE.BufferAttribute).array as Float32Array;
                for(let i=0; i < targets.length / 3; i++) {
                    targets[i*3 + 1] = (Math.random() - 0.5) * imageHeight;
                }
                (particleSystem.geometry.attributes.aTargetPosition as THREE.BufferAttribute).needsUpdate = true;
            }
        }

        createParticleSystem();
        handleResize(); // Initial size calculation
        animate();

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            const particleSystem = particleSystemRef.current;
            if (particleSystem) {
                particleSystem.geometry.dispose();
                (particleSystem.material as THREE.ShaderMaterial).dispose();
            }
            scene.clear();
            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (container && rendererRef.current.domElement) {
                     try {
                        container.removeChild(rendererRef.current.domElement);
                     } catch(e) {
                         // Ignore error if element is already gone
                     }
                }
            }
        };
    }, [propAspectRatio, duration]);

    if (webglSupported === false) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-background/50 rounded-xl border border-border">
                <div className="text-center p-4">
                    <p className="text-text-secondary text-sm">Animação não disponível (WebGL desativado)</p>
                </div>
            </div>
        );
    }

    return <div ref={mountRef} className="w-full h-full" />;
};
