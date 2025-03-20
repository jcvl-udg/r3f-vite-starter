import React, { useMemo, useEffect, useState, useRef } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { RigidBody } from "@react-three/rapier";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Papa from "papaparse";

const dokmnt = "public/SNIB-P083-CSV-Validado.csv"; // Ensure the file is in the public folder

const Mapz = ({ model }) => {
  const [plants, setPlants] = useState([]); // State to store parsed plant data
  const [selectedPlant, setSelectedPlant] = useState(null); // State to store the selected plant
  const { camera, scene } = useThree(); // Access the camera and scene
  const raycaster = new THREE.Raycaster(); // Raycaster for interaction
  const mouse = new THREE.Vector2(); // Mouse position

  // Parse the CSV file on component mount
  useEffect(() => {
    fetch(dokmnt)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      })
      .then((csvText) => {
        Papa.parse(csvText, {
          delimiter: ",",
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function (results) {
            console.log("Parsed CSV:", results.data);
            setPlants(results.data); // Update state with parsed data
          },
          error: function (err) {
            console.error("Error parsing CSV:", err);
          },
        });
      })
      .catch((error) => {
        console.error("Error fetching CSV:", error);
      });
  }, []);

  // Handle mouse clicks
  useEffect(() => {
    const handleClick = (event) => {
      // Convert mouse position to normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Raycast from the camera to the mouse position
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      // Check if a plant was clicked
      if (intersects.length > 0) {
        const plantMesh = intersects[0].object;
        const plantIndex = plantMesh.userData.index; // Store plant index in userData
        setSelectedPlant(plants[plantIndex]);
      } else {
        setSelectedPlant(null); // Deselect if no plant was clicked
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [plants, camera, scene]);

  // Generate Perlin noise terrain
  const terrain = useMemo(() => {
    const width = 100; // Terrain width
    const height = 100; // Terrain height
    const scale = 15; // Scale of the noise
    const noise2D = createNoise2D(); // Create a 2D noise function
    const terrain = [];

    for (let x = 0; x < width; x++) {
      terrain[x] = [];
      for (let y = 0; y < height; y++) {
        terrain[x][y] = noise2D(x / scale, y / scale); // Generate noise
      }
    }

    return terrain;
  }, []);

  // Create a 3D terrain mesh
  const terrainMesh = useMemo(() => {
    const width = terrain.length;
    const height = terrain[0].length;
    const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
    const vertices = geometry.attributes.position.array;

    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
      vertices[i + 2] = terrain[Math.floor(j / width)][j % width] * 10; // Adjust height
    }

    const material = new THREE.MeshStandardMaterial({ color: 0x7570b3, wireframe: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    return mesh;
  }, [terrain]);

  // Place plants on the terrain
  const plantMeshes = useMemo(() => {
    if (!plants || plants.length === 0) return [];

    const width = terrain.length;
    const height = terrain[0].length;

    return plants.map((plant, index) => {
      if (!plant.nombreCientifico_snib) return null; // Skip rows with missing data

      // Randomly place plants on the terrain
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const z = terrain[x][y] * 10; // Adjust height based on terrain

      return (
        <mesh
          key={index}
          position={[x - width / 2, z, y - height / 2]}
          userData={{ index }} // Store plant index in userData
        >
          <sphereGeometry args={[0.2, 8, 8]} /> {/* Simple sphere for plants */}
          <meshStandardMaterial color="red" />
        </mesh>
      );
    });
  }, [plants, terrain]);

  // UI Component for displaying plant data
  const PlantInfo = ({ plant }) => {
    if (!plant) return null;

    return (
      <Html position={[0, 1, 0]}> {/* Position the UI above the plant */}
        <div style={{ background: "white", padding: "10px", borderRadius: "5px" }}>
          <h3>{plant.nombreCientifico_snib}</h3>
          <p>Family: {plant.familia_snib}</p>
          <p>Status: {plant.estatus}</p>
          {/* Add more fields as needed */}
        </div>
      </Html>
    );
  };

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={terrainMesh} />
      {plantMeshes} {/* Render plants */}
      {selectedPlant && <PlantInfo plant={selectedPlant} />} {/* Display plant info */}
    </RigidBody>
  );
};

export default Mapz;