import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { Character } from "./Character";
import { useRef, useState, useEffect } from "react";
import { MathUtils, Vector3, Vector2, Raycaster } from "three";
import { useFrame , useThree } from "@react-three/fiber";
import { cameraPosition } from "three/tsl";
import { useControls } from "leva";
import { useKeyboardControls } from "@react-three/drei";
import { degToRad } from "three/src/math/MathUtils.js";

const normalizeAngle = (angle) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
};

const lerpAngle = (start, end, t) => {
    start = normalizeAngle(start);
    end = normalizeAngle(end);
  
    if (Math.abs(end - start) > Math.PI) {
      if (end > start) {
        start += 2 * Math.PI;
      } else {
        end += 2 * Math.PI;
      }
    }
    return normalizeAngle(start + (end - start) * t);
};

export const CharacterController = () => { 
    const container = useRef();
    const character = useRef();
    const cameraTarget = useRef();
    // Refs for cameras 
    // Vectors of views
    const cameraWorldPosition = useRef(new Vector3());
    const cameraLookAtWorldPosition = useRef(new Vector3());
    const cameraLookAt = useRef(new Vector3());
    // animations
    const [animation, setAnimation] = useState("idle"); 
    // Rigid body refs 
    const rb = useRef();
    const rotationTarget = useRef(0);
    const characterRotationTarget = useRef(0);
    const { WALK_SPEED, RUN_SPEED , ROTATION_SPEED} = useControls("Character Control" , {
        WALK_SPEED: { value: 1.8, min: 0.1, max: 4, step: 0.1 },
        RUN_SPEED: { value: 2.6, min: 0.2, max: 12, step: 0.1 },      
        ROTATION_SPEED: {
            value: degToRad(0.5),
            min: degToRad(0.1),
            max: degToRad(5),
            step: degToRad(0.1),
          },
    });
    const [, get] = useKeyboardControls();

    // Plants ref
    const [selectedPlant, setSelectedPlant] = useState(null);
    const mouse = new Vector2();
    const raycaster = new Raycaster();
    const { camera, scene } = useThree();
    // 
    useEffect(() => {
      const handleClick = (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
    
        if (intersects.length > 0) {
          // Find the first object with plant data
          const clickedObject = intersects[0].object;
          let current = clickedObject;
          let plantData = null;
          
          // Traverse up the hierarchy to find plant data
          while (current && !plantData) {
            if (current.userData?.plantData) {
              plantData = current.userData.plantData;
            }
            current = current.parent;
          }
          
          setSelectedPlant(plantData);
        } else {
          setSelectedPlant(null);
        }
      };
    
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }, [camera, scene]);
    // Useframe 4 update cameras 
    useFrame(({camera}) => {
        if(rb.current){
            const vel = rb.current.linvel();
            const movement = {
                x: 0,
                z: 0,
              };
        
              if (get().forward) {
                movement.z = 1;
              }
              if (get().backward) {
                movement.z = -1;
              }
        
              let speed = get().run ? RUN_SPEED : WALK_SPEED;
        
              if (get().left) {
                movement.x = 1;
              }
              if (get().right) {
                movement.x = -1;
              }
        
              if (movement.x !== 0){
                rotationTarget.current += ROTATION_SPEED * movement.x;
              }

              if (movement.x !== 0 || movement.z !== 0) {
                characterRotationTarget.current = Math.atan2(movement.x, movement.z);

                vel.x = Math.sin(rotationTarget.current + characterRotationTarget.current ) * speed;
                vel.z = Math.cos(rotationTarget.current + characterRotationTarget.current ) * speed;
                // vel.z = speed * movement.z;
                // if(speed == RUN_SPEED){
                //     // include some running animation
                //     setAnimation("Scene");
                // }else{
                //     setAnimation("Scene");
                // }
            }
            //   } else {
            //     setAnimation("idle");
            //   }
            character.current.rotation.y = lerpAngle(
                character.current.rotation.y,
                characterRotationTarget.current,
                0.1
            );

            rb.current.setLinvel(vel, true);
        }

        // Camaras
        container.current.rotation.y = MathUtils.lerp(
            container.current.rotation.y,
            rotationTarget.current,
            0.1
        );

        cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
        camera.position.lerp(cameraWorldPosition.current, 0.1);

        if(cameraTarget.current){
            cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
            cameraLookAt.current.lerp(cameraLookAtWorldPosition.current , 0.1);

            camera.lookAt(cameraLookAt.current);
        }
    });

    return (
    <RigidBody
        lockRotations
        colliders={false}
        position={[1, 1, 3]} // Initial position of the character
        ref={rb}
    >
        <group ref={container} >
            <group ref={cameraTarget} position-z={1.5} />    
            <group ref={cameraPosition} position-y={4} position-z={-4} /> 
                <group ref={character} >
                    <Character scale={0.034} animation={"Scene"} />
                </group>
        </group>
        <CapsuleCollider
          args={[0.05, 0.25]} // Adjust these values to fit your character
          position={[0, 0.3, 0]} // Adjust this to align with the character's center
        />
    </RigidBody>
    );
};