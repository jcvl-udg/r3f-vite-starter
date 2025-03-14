import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { Character } from "./Character";
import { useRef } from "react";
import { Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import { cameraPosition } from "three/tsl";


export const CharacterController = () => { 
    const container = useRef();
    const character = useRef();
    const cameraTarget = useRef();
    // Refs for cameras 
    // Vectors of views
    const cameraWorldPosition = useRef(new Vector3());
    const cameraLookAtWorldPosition = useRef(new Vector3());
    const cameraLookAt = useRef(new Vector3());

    // Useframe 4 update cameras 
    useFrame(({camera}) => {
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
>
        <group ref={container} >
            <group ref={cameraTarget} position-z={1.5} />    
            <group ref={cameraPosition} position-y={4} position-z={-4} /> 
                <group ref={character} >
                    <Character scale={0.034} animation={"idle"} />
                </group>
        </group>
        <CapsuleCollider
          args={[0.05, 0.25]} // Adjust these values to fit your character
          position={[0, 0.3, 0]} // Adjust this to align with the character's center
        />
      </RigidBody>
    );
};