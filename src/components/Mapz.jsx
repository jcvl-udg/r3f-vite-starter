import React, { useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { RigidBody } from "@react-three/rapier";
import Papa from "papaparse";

const dokmnt = "SNIB-P083-CSV-Validado.csv";

const Mapz = ({ model }) => {
  const [plants, setPlants] = useState([]); // State to store parsed plant data

  // Parse the CSV file on component mount
  useEffect(() => {
    fetch(dokmnt) // Fetch the CSV file
      .then((response) => response.text()) // Get the file content as text
      .then((csvText) => {
        // Remove the source map line
        // const cleanedCsvText = csvText.replace(
        //   /\/\/# sourceMappingURL=data:application\/json;base64,.*/,
        //   ""
        // );

        // Parse the cleaned CSV text
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (result) => {
            if (result.errors.length > 0) {
              console.error("Errors parsing CSV:", result.errors);
            } else {
              setPlants(result.data); // Store parsed data in state
            }
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
          },
        });
      })
      .catch((error) => {
        console.error("Error fetching CSV:", error);
      });
  }, []);

  // Generate Perlin noise terrain
  const terrain = useMemo(() => {
    const width = 100; // Terrain width
    const height = 100; // Terrain height
    const scale = 20; // Scale of the noise
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

    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: false });
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
        <mesh key={index} position={[x - width / 2, z, y - height / 2]}>
          <sphereGeometry args={[0.2, 8, 8]} /> {/* Simple sphere for plants */}
          <meshStandardMaterial color="red" />
        </mesh>
      );
    });
  }, [plants, terrain]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={terrainMesh} />
      {plantMeshes} {/* Render plants */}
    </RigidBody>
  );
};

export default Mapz;