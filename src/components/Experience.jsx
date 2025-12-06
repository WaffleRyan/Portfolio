import { PerspectiveCamera, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Euler, Group, Vector3 } from "three";
import { usePlay } from "../contexts/Play";
import { fadeOnBeforeCompile } from "../utils/fadeMaterial";
import { Bird } from "./Bird";
import { Background } from "./Background";
import { Cloud } from "./Cloud";
import { Speed } from "./Speed";
import { TextSection } from "./TextSection";
import { Ground } from "./Ground";
import { Water } from "./Water";
import { Deer } from "./Deer";
import { Stars } from "./Stars";
import { Title } from "./Title";

const LINE_NB_POINTS = 1000;
const CURVE_DISTANCE = 250;
const CURVE_AHEAD_CAMERA = 0.008;
const CURVE_AHEAD_AIRPLANE = 0.02;
const AIRPLANE_MAX_ANGLE = 35;
const FRICTION_DISTANCE = 42;

export const Experience = () => {
  const curvePoints = useMemo(
    () => [
      new THREE.Vector3(0, 0, 0),
      // new THREE.Vector3(0, 10, -0.25 * CURVE_DISTANCE),
      // new THREE.Vector3(0, 20, -0.5 * CURVE_DISTANCE),
      new THREE.Vector3(0, 31, -1 * CURVE_DISTANCE),
      new THREE.Vector3(100, 70, -2 * CURVE_DISTANCE),
      new THREE.Vector3(-50, 20, -2.3 * CURVE_DISTANCE),
      new THREE.Vector3(100, 200, -4 * CURVE_DISTANCE),
      new THREE.Vector3(0, 400, -5 * CURVE_DISTANCE),
      new THREE.Vector3(-100, 500, -6 * CURVE_DISTANCE),
      new THREE.Vector3(100, 300, -7 * CURVE_DISTANCE),
    ],
    []
  );

  const sceneOpacity = useRef(0);
  const lineMaterialRef = useRef();

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(curvePoints, false, "catmullrom", 0.5);
  }, []);

  const textSections = useMemo(() => {
    return [
      {
        cameraRailDist: -1,
        position: new Vector3(
          curvePoints[1].x + 1,
          curvePoints[1].y,
          curvePoints[1].z
        ),
        subtitle: `Hey, I'm Ryan!`,
      },
      {
        cameraRailDist: 1.5,
        position: new Vector3(
          curvePoints[2].x + 2,
          curvePoints[2].y,
          curvePoints[2].z
        ),
        title: "Talents",
        subtitle: `I have a lot of talents that I will write here`,
      },
      {
        cameraRailDist: -1,
        position: new Vector3(
          curvePoints[3].x - 3,
          curvePoints[3].y,
          curvePoints[3].z
        ),
        title: "Need help with a coding project?",
        subtitle: `Don't worry, I can help you as long as you pay me lots`,
      },
      {
        cameraRailDist: 1.5,
        position: new Vector3(
          curvePoints[4].x + 1.5,
          curvePoints[4].y+7,
          curvePoints[4].z - 12
        ),
        rotation: new Euler(0.7, 0, 0),
        title: "Services",
        subtitle: `I can help your company with websites or creating workflows`,
      },
      {
        cameraRailDist: -1,
        position: new Vector3(
          curvePoints[5].x - 1,
          curvePoints[5].y,
          curvePoints[5].z
        ),
        rotation: new Euler(0.7, 0, 0),
        title: "Shoot for the stars",
        subtitle: `Reach for the clouds just like Kanye said`,
      },
    ];
  }, []);

  const clouds = useMemo(
    () => [
      // // STARTING
      // {
      //   position: new Vector3(-3.5, -3.2, -7),
      // },
      // {
      //   position: new Vector3(3.5, -4, -10),
      // },
      // {
      //   scale: new Vector3(4, 4, 4),
      //   position: new Vector3(-18, 0.2, -68),
      //   rotation: new Euler(-Math.PI / 5, Math.PI / 6, 0),
      // },
      // {
      //   scale: new Vector3(2.5, 2.5, 2.5),
      //   position: new Vector3(10, -1.2, -52),
      // },
      // // FIRST POINT
      // {
      //   scale: new Vector3(4, 4, 4),
      //   position: new Vector3(
      //     curvePoints[1].x + 10,
      //     curvePoints[1].y - 4,
      //     curvePoints[1].z + 64
      //   ),
      // },
      // {
      //   scale: new Vector3(3, 3, 3),
      //   position: new Vector3(
      //     curvePoints[1].x - 20,
      //     curvePoints[1].y + 4,
      //     curvePoints[1].z + 28
      //   ),
      //   rotation: new Euler(0, Math.PI / 7, 0),
      // },
      // {
      //   rotation: new Euler(0, Math.PI / 7, Math.PI / 5),
      //   scale: new Vector3(5, 5, 5),
      //   position: new Vector3(
      //     curvePoints[1].x - 13,
      //     curvePoints[1].y + 4,
      //     curvePoints[1].z - 62
      //   ),
      // },
      // {
      //   rotation: new Euler(Math.PI / 2, Math.PI / 2, Math.PI / 3),
      //   scale: new Vector3(5, 5, 5),
      //   position: new Vector3(
      //     curvePoints[1].x + 54,
      //     curvePoints[1].y + 2,
      //     curvePoints[1].z - 82
      //   ),
      // },
      // {
      //   scale: new Vector3(5, 5, 5),
      //   position: new Vector3(
      //     curvePoints[1].x + 8,
      //     curvePoints[1].y - 14,
      //     curvePoints[1].z - 22
      //   ),
      // },
      // // SECOND POINT
      // {
      //   scale: new Vector3(3, 3, 3),
      //   position: new Vector3(
      //     curvePoints[2].x + 6,
      //     curvePoints[2].y - 7,
      //     curvePoints[2].z + 50
      //   ),
      // },
      // {
      //   scale: new Vector3(2, 2, 2),
      //   position: new Vector3(
      //     curvePoints[2].x - 2,
      //     curvePoints[2].y + 4,
      //     curvePoints[2].z - 26
      //   ),
      // },
      // {
      //   scale: new Vector3(4, 4, 4),
      //   position: new Vector3(
      //     curvePoints[2].x + 12,
      //     curvePoints[2].y + 1,
      //     curvePoints[2].z - 86
      //   ),
      //   rotation: new Euler(Math.PI / 4, 0, Math.PI / 3),
      // },
      // SECOND POINT (Talents)
      {
        scale: new Vector3(3, 3, 3),
        position: new Vector3(
          curvePoints[2].x + 3,
          curvePoints[2].y - 10,
          curvePoints[2].z + 50
        ),
      },
      {
        scale: new Vector3(3, 3, 3),
        position: new Vector3(
          curvePoints[2].x - 10,
          curvePoints[2].y,
          curvePoints[2].z + 30
        ),
        rotation: new Euler(Math.PI / 4, 0, Math.PI / 5),
      },
      {
        scale: new Vector3(4, 4, 4),
        position: new Vector3(
          curvePoints[2].x - 20,
          curvePoints[2].y - 5,
          curvePoints[2].z - 8
        ),
        rotation: new Euler(Math.PI, 0, Math.PI / 5),
      },
      {
        scale: new Vector3(5, 5, 5),
        position: new Vector3(
          curvePoints[2].x + 0,
          curvePoints[2].y - 5,
          curvePoints[2].z - 98
        ),
        rotation: new Euler(0, Math.PI / 3, 0),
      },
      // FOURTH POINT
      {
        scale: new Vector3(2, 2, 2),
        position: new Vector3(
          curvePoints[4].x + 3,
          curvePoints[4].y - 10,
          curvePoints[4].z + 2
        ),
      },
      {
        scale: new Vector3(3, 3, 3),
        position: new Vector3(
          curvePoints[4].x + 24,
          curvePoints[4].y - 6,
          curvePoints[4].z - 42
        ),
        rotation: new Euler(Math.PI / 4, 0, Math.PI / 5),
      },
      {
        scale: new Vector3(3, 3, 3),
        position: new Vector3(
          curvePoints[4].x - 4,
          curvePoints[4].y + 9,
          curvePoints[4].z - 62
        ),
        rotation: new Euler(Math.PI / 3, 0, Math.PI / 3),
      },
      // FINAL
      {
        scale: new Vector3(3, 3, 3),
        position: new Vector3(
          curvePoints[7].x + 12,
          curvePoints[7].y - 5,
          curvePoints[7].z + 60
        ),
        rotation: new Euler(-Math.PI / 4, -Math.PI / 6, 0),
      },
      {
        scale: new Vector3(3, 3, 3),
        position: new Vector3(
          curvePoints[7].x - 12,
          curvePoints[7].y + 5,
          curvePoints[7].z + 120
        ),
        rotation: new Euler(Math.PI / 4, Math.PI / 6, 0),
      },
    ],
    []
  );

  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.08);
    shape.lineTo(0, 0.08);

    return shape;
  }, [curve]);

  const cameraGroup = useRef();
  const cameraRail = useRef();
  const camera = useRef();
  const scroll = useScroll();
  const lastScroll = useRef(0);
  const flightStarted = useRef(false);
  const scrollScale = useRef(0.001); // initial slow factor
  const targetScrollScale = useRef(0.1);

  const { play, setHasScroll, end, setEnd } = usePlay();

  useFrame((_state, delta) => {
    if (window.innerWidth > window.innerHeight) {
      // LANDSCAPE
      camera.current.fov = 30;
      camera.current.position.z = 5;
    } else {
      // PORTRAIT
      camera.current.fov = 80;
      camera.current.position.z = 2;
    }

    if (lastScroll.current <= 0 && scroll.offset > 0) {
      setHasScroll(true);
    }

    if (play && !end && sceneOpacity.current < 1) {
      sceneOpacity.current = THREE.MathUtils.lerp(
        sceneOpacity.current,
        1,
        delta * 0.1
      );
    }

    if (end && sceneOpacity.current > 0) {
      sceneOpacity.current = THREE.MathUtils.lerp(
        sceneOpacity.current,
        0,
        delta
      );
    }

    lineMaterialRef.current.opacity = sceneOpacity.current;

    if (end) {
      return;
    }

  const scrollOffset = Math.max(0, scroll.offset);

  // Animate scroll scale toward target (ramps up after flight starts)
  scrollScale.current = THREE.MathUtils.lerp(scrollScale.current, targetScrollScale.current, delta * 3);

  // Effective offset is scaled version of raw scroll offset; keeps alignment (no accumulating lag)
  const effectiveOffset = scrollOffset * scrollScale.current;

    let friction = 1;
    let resetCameraRail = true;
    // LOOK TO CLOSE TEXT SECTIONS
    textSections.forEach((textSection) => {
      const distance = textSection.position.distanceTo(
        cameraGroup.current.position
      );

      if (distance < FRICTION_DISTANCE) {
        friction = Math.max(distance / FRICTION_DISTANCE, 0.1);
        const targetCameraRailPosition = new Vector3(
          (1 - distance / FRICTION_DISTANCE) * textSection.cameraRailDist,
          0,
          0
        );
        cameraRail.current.position.lerp(targetCameraRailPosition, delta);
        resetCameraRail = false;
      }
    });
    if (resetCameraRail) {
      const targetCameraRailPosition = new Vector3(0, 0, 0);
      cameraRail.current.position.lerp(targetCameraRailPosition, delta);
    }

    // CALCULATE LERPED SCROLL OFFSET using effective scaled offset
    let lerpedScrollOffset = THREE.MathUtils.lerp(
      lastScroll.current,
      effectiveOffset,
      delta * friction
    );
    // PROTECT BELOW 0 AND ABOVE 1
    lerpedScrollOffset = Math.min(lerpedScrollOffset, 1);
    lerpedScrollOffset = Math.max(lerpedScrollOffset, 0);

    lastScroll.current = lerpedScrollOffset;
    tl.current.seek(lerpedScrollOffset * tl.current.duration());

    const curPoint = curve.getPoint(lerpedScrollOffset);

    // Follow the curve points
    cameraGroup.current.position.lerp(curPoint, delta * 24);

    // Make the group look ahead on the curve

    const lookAtPoint = curve.getPoint(
      Math.min(lerpedScrollOffset + CURVE_AHEAD_CAMERA, 1)
    );

    const currentLookAt = cameraGroup.current.getWorldDirection(
      new THREE.Vector3()
    );

    // Raw target based on the curve
    const rawTargetLookAt = new THREE.Vector3()
      .subVectors(curPoint, lookAtPoint)
      .normalize();

    // Horizontal-only version (no vertical pitch)
    const horizontalTarget = rawTargetLookAt.clone();
    horizontalTarget.y = 0;
    horizontalTarget.normalize();

    // Smoothly interpolate from horizontal (at start) to full curve-based look
    const t = Math.min(1, lerpedScrollOffset / 0.05); // 0 -> 0.05 scroll range
    const targetLookAt = horizontalTarget.lerp(rawTargetLookAt, t);

    const lookAt = currentLookAt.lerp(targetLookAt, delta * 24);
    cameraGroup.current.lookAt(
      cameraGroup.current.position.clone().add(lookAt)
    );

    // Airplane rotation

    //testing this
    

    const tangent = curve.getTangent(lerpedScrollOffset + CURVE_AHEAD_AIRPLANE);

    const nonLerpLookAt = new Group();
    nonLerpLookAt.position.copy(curPoint);
    nonLerpLookAt.lookAt(nonLerpLookAt.position.clone().add(targetLookAt));

    tangent.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -nonLerpLookAt.rotation.y
    );

    let angle = Math.atan2(-tangent.z, tangent.x);
    angle = -Math.PI / 2 + angle;

    let angleDegrees = (angle * 180) / Math.PI;
    angleDegrees *= 2.4; // stronger angle

    // LIMIT PLANE ANGLE
    if (angleDegrees < 0) {
      angleDegrees = Math.max(angleDegrees, -AIRPLANE_MAX_ANGLE);
    }
    if (angleDegrees > 0) {
      angleDegrees = Math.min(angleDegrees, AIRPLANE_MAX_ANGLE);
    }

    // SET BACK ANGLE
    angle = (angleDegrees * Math.PI) / 180;

  
    const targetAirplaneQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        airplane.current.rotation.x,
        airplane.current.rotation.y,
        angle
      )
    );
    airplane.current.quaternion.slerp(targetAirplaneQuaternion, delta * 2);

    if (
      cameraGroup.current.position.z <
      curvePoints[curvePoints.length - 1].z + 100
    ) {
      setEnd(true);
      planeOutTl.current.play();
    }
  });

  const airplane = useRef();

  const tl = useRef();
  const backgroundColors = useRef({
    colorA: "#3535cc",
    colorB: "#abaadd",
  });

  const planeInTl = useRef();
  const planeOutTl = useRef();

  useLayoutEffect(() => {
    tl.current = gsap.timeline();

    tl.current.to(backgroundColors.current, {
      duration: 1,
      colorA: "#6f35cc",
      colorB: "#ffad30",
    });
    tl.current.to(backgroundColors.current, {
      duration: 1,
      colorA: "#81318b",
      colorB: "#55ab8f",
    });
    tl.current.to(backgroundColors.current, {
      duration: 1,
      colorA: "#424242",
      colorB: "#ffcc00",
    });
    tl.current.to(backgroundColors.current, {
      duration: 1,
      colorA: "#000000",
      colorB: "#000000",
    });
    tl.current.to(backgroundColors.current, {
      duration: 1,
      colorA: "#424242",
      colorB: "#ffcc00",
    });

    tl.current.pause();

    // Set airplane to final position immediately (no slide-in animation)
    if (airplane.current) {
      airplane.current.position.set(0, 0, 0);
    }

    planeInTl.current = gsap.timeline();
    planeInTl.current.pause();
    // Animation is set but won't be used - airplane already at final position
    planeInTl.current.from(airplane.current.position, {
      duration: 0,
      z: 0,
      y: 0,
    });

    planeOutTl.current = gsap.timeline();
    planeOutTl.current.pause();

    planeOutTl.current.to(
      airplane.current.position,
      {
        duration: 10,
        z: -250,
        y: 10,
      },
      0
    );
    planeOutTl.current.to(
      cameraRail.current.position,
      {
        duration: 8,
        y: 12,
      },
      0
    );
    planeOutTl.current.to(airplane.current.position, {
      duration: 1,
      z: -1000,
    });
  }, []);

  useEffect(() => {
    if (play) {
      // Bird is already at final position, no need to animate
      // planeInTl.current.play(); // Disabled - bird starts at final position
    }
  }, [play]);

  return useMemo(
    () => (
      <>
        <Title />
        <directionalLight position={[0, 3, 1]} intensity={0.1} />
        <group ref={cameraGroup}>
          <Speed />
          <Background backgroundColors={backgroundColors} />
          <group ref={cameraRail}>
            <PerspectiveCamera
              ref={camera}
              position={[0, 0, 5]}
              fov={30}
              makeDefault
            />
          </group>
          <group ref={airplane} position={[0, 0, 0]}>
            <Bird
              rotation-y={Math.PI}
              rotation-x={Math.PI/16}
              scale={[0.8, 0.8, 0.8]}
              position={[0, -0.9, 0]}
              clip="Teratorn_Flapping"
              clipTransitionGliding="Teratorn_Transition-Gliding"
              clipGliding="Teratorn_Gliding"
              clipGlidingFlapping="Teratorn_Gliding-Flapping"
              onFlightStart={() => { 
                flightStarted.current = true; 
                targetScrollScale.current = 1; // ramp scale to 1 so effective offset catches up smoothly
              }}
            />
            {/* Ground plane / tile */}
            {/* <Ground position={[-0.7, 1.5, -46]} scale={[0.1, 0.1, 0.1]} /> */}
          </group>
        </group>
        {/* TEXT */}
  {textSections.map((textSection, index) => (
          <TextSection {...textSection} key={index} />
        ))}
  {/* Fixed ground (world space) */}
  <Ground position={[-7, 25, -177]} scale={[1, 1, 1]} />
  {/* <Ground position={[-7, 125, -177]} scale={[1, 1, 1]} />
  <Ground position={[-7, 225, -177]} scale={[1, 1, 1]} /> */}
  
  {/* Water model behind ground - adjustable position (z value can be adjusted further back) */}
  <Water position={[70, 25, -570]} scale={[100, 100, 100]} />
  
  {/* Deer model at the beginning of the ground - adjustable position */}
  {/* Positioned near the start of the curve (0, 0, 0) and slightly ahead */}
  <Deer position={[-5, -1, -15]} scale={[5, 5, 5]} rotation={[0, Math.PI/2, 0]} />
  
  {/* Stars for space section at curvePoints[5] - positioned at (0, 400, -1250) */}
  <Stars 
    position={[0, 400, -1250]} 
    count={2000} 
    radius={300}
    targetPosition={new Vector3(0 + 1, 400, -5 * CURVE_DISTANCE)}
    cameraGroup={cameraGroup}
  />

        {/* LINE */}
        <group position-y={-2}>
          <mesh>
            <extrudeGeometry
              args={[
                shape,
                {
                  steps: LINE_NB_POINTS,
                  bevelEnabled: false,
                  extrudePath: curve,
                },
              ]}
            />
            <meshStandardMaterial
              color={"white"}
              ref={lineMaterialRef}
              transparent
              envMapIntensity={2}
              onBeforeCompile={fadeOnBeforeCompile}
            />
          </mesh>
        </group>

        {/* CLOUDS */}
        {clouds.map((cloud, index) => (
          <Cloud sceneOpacity={sceneOpacity} {...cloud} key={index} />
        ))}
      </>
    ),
    []
  );
};
