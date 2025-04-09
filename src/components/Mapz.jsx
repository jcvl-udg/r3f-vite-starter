import React, { useMemo, useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { RigidBody } from "@react-three/rapier";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Papa from "papaparse";

// Simplified Flower Component with only one petal
const Flower = ({ size, height, color, userData }) => {
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      // Gentle swaying animation
      group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
      group.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.02;
    }
  });

  // Create a single petal
  const petalGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const width = size;
    const height = size * 2;

    shape.moveTo(0, 0);
    shape.bezierCurveTo(
      width * 0.3, height * 0.2,
      width * 0.8, height * 0.3,
      width * 0.5, height
    );
    shape.bezierCurveTo(
      width * 0.2, height * 0.3,
      width * -0.3, height * 0.2,
      0, 0
    );

    const extrudeSettings = {
      steps: 1,
      depth: size * 0.1,
      bevelEnabled: true,
      bevelThickness: size * 0.05,
      bevelSize: size * 0.05,
      bevelOffset: 0,
      bevelSegments: 3
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [size]);

  const petalMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    flatShading: true
  }), [color]);

  return (
    <group ref={group} userData={userData}>
      {/* Stem */}
      <mesh position={[0, height * size / 2, 0]} userData={userData}>
        <cylinderGeometry args={[size * 0.1, size * 0.08, height * size, 8]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>

      {/* Center */}
      <mesh position={[0, height * size, 0]} userData={userData}>
        <sphereGeometry args={[size * 0.4, 16, 16]} />
        <meshStandardMaterial
          color="#FFEB3B"
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Single petal */}
      <mesh
        geometry={petalGeometry}
        material={petalMaterial}
        position={[size * 1.5, size * height, 0]}
        rotation={[Math.PI/2, 0, 0]}
        userData={userData}
        castShadow
      />
    </group>
  );
};

// Plant Info Component remains the same
const PlantInfo = ({ plant }) => {
  if (!plant) return null;
  console.log(plant);
  return (
    <Html position={[0, 1, 0]}>
      <div style={{ background: "white", padding: "10px", borderRadius: "5px" }}>
        <h3>{plant.nombreCientifico_snib}</h3>
        <p>Family: {plant.familia_snib}</p>
        <p>Status: {plant.estatus}</p>
      </div>
    </Html>
  );
};

// Main Map Component with improved walkable terrain
const Mapz = ({ model }) => {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const { camera, scene } = useThree();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const dokmnt = "public/SNIB-P083-CSV-Validado.csv";

  const getColorFromPlantData = (plant) => {
    const familyColors = {
      'Rosaceae': '#FF5252',
      'Orchidaceae': '#9C27B0',
      'Asteraceae': '#FF9800',
      'default': '#4CAF50'
    };
    return familyColors[plant.familia_snib] || familyColors.default;
  };

  useEffect(() => {
    fetch(dokmnt)
      .then((response) => response.ok ? response.text() : Promise.reject(response))
      .then((csvText) => {
        Papa.parse(csvText, {
          delimiter: ",",
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => setPlants(results.data),
          error: (err) => console.error("Error parsing CSV:", err)
        });
      })
      .catch((error) => console.error("Error fetching CSV:", error));
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const plantMesh = intersects[0].object;
        setSelectedPlant(plants[plantMesh.userData.index]);
      } else {
        setSelectedPlant(null);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [plants, camera, scene]);

  // Improved Terrain Generation with more walkable areas
  const terrain = useMemo(() => {
    const width = 100, height = 100;
    const noise2D = createNoise2D();
    const terrain = [];

    for (let x = 0; x < width; x++) {
      terrain[x] = [];
      for (let y = 0; y < height; y++) {
        // Base terrain (large scale)
        const baseScale = 30; // Increased for smoother terrain
        let elevation = noise2D(x / baseScale, y / baseScale) * 3; // Reduced height

        // Add medium details (reduced impact)
        const mediumScale = 15;
        elevation += noise2D(x / mediumScale, y / mediumScale) * 1.5;

        // Add fine details (reduced impact)
        const fineScale = 7;
        elevation += noise2D(x / fineScale, y / fineScale) * 0.5;

        // Create occasional mountains (less frequent)
        const mountainFactor = Math.max(0, noise2D(x / 50, y / 50) - 0.5) * 2;
        if (mountainFactor > 0) {
          elevation += mountainFactor * 8; // Reduced mountain height

          // Add extra peaks to mountains (less sharp)
          const peakFactor = Math.max(0, noise2D(x / 8, y / 8) - 0.8) * 1;
          elevation += peakFactor * 3;
        }

        // Flatten most areas for walkability
        const flatness = Math.max(0, noise2D(x / 30, y / 30) - 0.3) * 3;
        if (flatness > 0) {
          elevation *= 0.2; // More aggressive flattening
        }

        terrain[x][y] = elevation;
      }
    }
    return terrain;
  }, []);

  const terrainMesh = useMemo(() => {
    const width = terrain.length;
    const height = terrain[0].length;
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    const vertices = geometry.attributes.position.array;

    let min = Infinity, max = -Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
      const j = i / 3;
      const val = terrain[Math.floor(j / width)][j % width];
      min = Math.min(min, val);
      max = Math.max(max, val);
    }

    const colors = [];
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
      const x = Math.floor(j / width);
      const y = j % width;
      const val = terrain[x][y];

      vertices[i + 2] = val;

      const normalized = (val - min) / (max - min);
      const color = new THREE.Color();
      if (normalized < 0.4) { // More area considered low
        color.setHSL(0.3, 0.7, 0.4 + normalized * 0.3); // Brighter greens for walkable areas
      } else if (normalized < 0.7) {
        color.setHSL(0.25, 0.8, 0.5 + (normalized - 0.4) * 0.3);
      } else {
        color.setHSL(0.1, 0.5, 0.6 + (normalized - 0.7) * 0.2);
      }
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: false,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  }, [terrain]);

  // Flower Generation - only one per unique plant type
  const flowerModels = useMemo(() => {
    if (!plants?.length) return [];

    const width = terrain.length;
    const height = terrain[0].length;

    // Get unique plants by nombreCientifico_snib
    const uniquePlants = plants.reduce((acc, plant) => {
      if (plant.nombreCientifico_snib && !acc.some(p => p.nombreCientifico_snib === plant.nombreCientifico_snib)) {
        acc.push(plant);
      }
      return acc;
    }, []);

    return uniquePlants.map((plant, index) => {
      // Find a walkable location (not too steep)
      let x, y, z, attempts = 0;
      do {
        x = Math.floor(Math.random() * width);
        y = Math.floor(Math.random() * height);
        z = terrain[x][y];
        attempts++;
      } while ((Math.abs(z) > 3 || z < 0) && attempts < 50); // More strict walkability check

      if (attempts >= 50) return null;

      const size = 0.3;
      const heightFactor = 0.5 + Math.random() * 0.5;

      return (
        <group key={index} position={[x - width/2, z, y - height/2]}>
          <Flower
            size={size}
            height={heightFactor}
            color={getColorFromPlantData(plant)}
            userData={{ index }}
          />
        </group>
      );
    }).filter(Boolean);
  }, [plants, terrain]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={terrainMesh} />
      {flowerModels}
      {selectedPlant && <PlantInfo plant={selectedPlant} />}
    </RigidBody>
  );
};


export default Mapz;