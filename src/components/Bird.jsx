/*
Animated bird loader: plays the first animation clip in the GLB.
*/

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Center, useAnimations, useGLTF, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FlapAudio } from "./FlapAudio";

// Ensure each existing track in each clip has a key at t=0 that matches its first keyed value.
// Handles GLTF cubic-spline tracks by inserting a full triplet (inTangent, value, outTangent)
// so the data layout remains valid. Prevents pose pops at the start of a clip during cross-fades.
function ensureStartKeysFromFirstSample(gltf) {
  if (!gltf || !Array.isArray(gltf.animations)) return;

  for (const clip of gltf.animations) {
    for (let i = 0; i < clip.tracks.length; i++) {
      const track = clip.tracks[i];
      const times = track.times;
      const values = track.values;

      // Skip if no samples or already starts at t=0
      if (!times || times.length === 0 || times[0] === 0) continue;

      const itemSize = track.getValueSize();
      const isCubic = values && values.length === times.length * itemSize * 3; // GLTF cubic-spline layout

      // Build new times with a prepended 0
      const newTimes = new Float32Array(times.length + 1);
      newTimes[0] = 0;
      newTimes.set(times, 1);

      let newValues;

      if (isCubic) {
        // Prepend a full triplet [inTangent, value, outTangent] from the first keyframe
        const tripletSize = itemSize * 3;
        const firstTriplet = values.slice(0, tripletSize);

        // Normalize quaternion "value" portion if needed (index range [itemSize, 2*itemSize))
        if (track instanceof THREE.QuaternionKeyframeTrack) {
          const base = itemSize; // start of the center value in the triplet
          const q = new THREE.Quaternion(
            firstTriplet[base + 0],
            firstTriplet[base + 1],
            firstTriplet[base + 2],
            firstTriplet[base + 3]
          ).normalize();
          firstTriplet[base + 0] = q.x;
          firstTriplet[base + 1] = q.y;
          firstTriplet[base + 2] = q.z;
          firstTriplet[base + 3] = q.w;
        }

        newValues = new Float32Array(values.length + tripletSize);
        newValues.set(firstTriplet, 0);
        newValues.set(values, tripletSize);
      } else {
        // Linear/step tracks: prepend the first value sample
        const firstVals = values.slice(0, itemSize);
        if (track instanceof THREE.QuaternionKeyframeTrack) {
          const q = new THREE.Quaternion(firstVals[0], firstVals[1], firstVals[2], firstVals[3]).normalize();
          firstVals[0] = q.x; firstVals[1] = q.y; firstVals[2] = q.z; firstVals[3] = q.w;
        }
        newValues = new Float32Array(values.length + itemSize);
        newValues.set(firstVals, 0);
        newValues.set(values, itemSize);
      }

      // Recreate a track of the same type with adjusted data
      let newTrack;
      if (track instanceof THREE.QuaternionKeyframeTrack) {
        newTrack = new THREE.QuaternionKeyframeTrack(track.name, newTimes, newValues);
      } else if (track instanceof THREE.VectorKeyframeTrack) {
        newTrack = new THREE.VectorKeyframeTrack(track.name, newTimes, newValues);
      } else if (track instanceof THREE.NumberKeyframeTrack) {
        newTrack = new THREE.NumberKeyframeTrack(track.name, newTimes, newValues);
      } else if (track instanceof THREE.ColorKeyframeTrack) {
        newTrack = new THREE.ColorKeyframeTrack(track.name, newTimes, newValues);
      } else {
        // Fallback for any other KeyframeTrack types
        newTrack = new track.constructor(track.name, newTimes, newValues);
      }

      clip.tracks[i] = newTrack;
    }
  }
}

export function Bird({
  src = "./models/bird/model.glb",
  // clip names expected in GLB
  clipIdle = "Teratorn_Idle",
  clipTransitionFlying = "Teratorn_Transition-Flying", // Idle -> Flapping
  clip = "Teratorn_Flapping",
  clipTransitionGliding = "Teratorn_Transition-Gliding",
  clipGliding = "Teratorn_Gliding",
  clipGlidingFlapping = "Teratorn_Gliding-Flapping",
  fastThreshold = 0.005, // lower threshold so fast intent triggers with typical scroll
  fade = 0.25,
  debug = false,
  onFlightStart = () => {}, // callback when sustained flapping state achieved
  // FlapAudio adjustable variables
  flapAudioOffset = 0, // Time offset in seconds to fine-tune alignment
  flapAudioVolume = 0.5, // Audio volume 0-1
  flapAudioInterval = 1.083, // Expected time between flaps (12 flaps in 13 seconds = 1.083s)
  selectionFlapInterval = 0.5, // Expected time between flaps for Teratorn_Selection animation
  transitionFlyingAudioOffset = 0, // Time offset in seconds for transition-flying animation
  gustAudioVolume = 0.5, // Gust audio volume 0-1
  gustAudioFadeSpeed = 2.0, // Gust audio fade in/out speed (higher = faster)
  end = false, // Whether scroll has reached the end
  ...props
}) {
  const group = useRef();
  const gltf = useGLTF(src);

  // Normalize clips once: align t=0 to the first keyed pose to prevent pops on entry
  useMemo(() => {
    ensureStartKeysFromFirstSample(gltf);
  }, [gltf]);

  const { actions, names, mixer } = useAnimations(gltf.animations, group);

  // Scroll-based speed detection
  const scroll = useScroll();
  const [isFast, setIsFast] = useState(false);
  const isFastRef = useRef(false);
  // Smoothed velocity + short intent latch
  const velEMA = useRef(0);
  const fastUntil = useRef(0);
  // Resolved clip name cache for use outside effect
  const resolvedRef = useRef(null);
  const lastOffsetRef = useRef(0);

  useFrame((state, delta) => {
    // Raw per-frame scroll velocity (use both .delta and offset diff as fallback)
    const d1 = Math.abs(scroll.delta || 0);
    const dOffset = Math.abs((scroll.offset || 0) - (lastOffsetRef.current || 0));
    lastOffsetRef.current = scroll.offset || 0;
    // Convert offset diff to a per-second-ish velocity using delta (guard against tiny delta)
    const d2 = delta > 0 ? dOffset / delta : dOffset * 60;
    // Blend sources; offset-based tends to be small, so scale it modestly
  let vRaw = Math.max(d1, d2 * 0.2);
  // Before initial flying has begun, dampen perceived scroll speed
  if (!hasStartedFlying.current) vRaw *= 0.001; // 1/10th speed until transition-flying complete

    // Exponential moving average for stability
    const alpha = 0.3; // a bit snappier than before
    velEMA.current = (1 - alpha) * velEMA.current + alpha * vRaw;

    // Intent detection with short latch so decisions at loop boundaries see recent speed
    const now = state.clock.getElapsedTime();
    const fastNow = velEMA.current > fastThreshold;
    if (fastNow) fastUntil.current = now + 0.6;

    const isFastIntent = now < fastUntil.current;
    if (isFastIntent !== isFastRef.current) {
      isFastRef.current = isFastIntent;
      setIsFast(isFastIntent);
    }

    // Per-action time scaling: speed up only Flapping and Glide->Flapping phases
    if (mixer) {
      const resolved = resolvedRef.current;
      const playingName = current.current;
      const act = playingName ? actions?.[playingName] : null;
      // baseline mixer at 1x so we don't speed non-flap clips accidentally
      mixer.timeScale = 1;
      const isSpeedPhase = resolved && (
        playingName === resolved.flap ||
        playingName === resolved.glideFlap ||
        playingName === resolved.trans // also speed up Transition-Gliding
      );
      if (act && isSpeedPhase) {
        // Strong response to scroll; same mapping for transition and flapping
        const target = THREE.MathUtils.clamp(1 + velEMA.current * 50.0, 0.9, 20.0);
        const cur = (typeof act.getEffectiveTimeScale === 'function') ? act.getEffectiveTimeScale() : 1;
        const next = THREE.MathUtils.lerp(cur, target, 0.3);
        if (typeof act.setEffectiveTimeScale === 'function') {
          act.setEffectiveTimeScale(next);
        } else {
          // Fallback: drive the whole mixer if the action API is missing in this three version
          mixer.timeScale = THREE.MathUtils.lerp(mixer.timeScale || 1, target, 0.3);
        }
        if (debug) console.log(`[Bird] speed scale (${playingName}): velEMA=${velEMA.current.toFixed(4)} target=${target.toFixed(2)} applied=${next.toFixed(2)}`);
      } else if (act && typeof act.setEffectiveTimeScale === 'function') {
        // ensure non-speed phases run at 1x
        act.setEffectiveTimeScale(1);
      }
    }
  });

  // Animation state machine
  const current = useRef(null);
  const isInTransition = useRef(false);
  const isInInitialFlyTransition = useRef(false);
  const hasStartedFlying = useRef(false); // becomes true after Idle->Flying transition completes
  const loopCounts = useRef(new Map());
  const started = useRef(false);
  const scheduledTransToGlide = useRef(false);
  const fastFlapLoopCount = useRef(0);
  const flightStartCalled = useRef(false);

  const playAction = (name, { loop = THREE.LoopRepeat, clamp = false } = {}) => {
    const next = actions?.[name];
    if (!next) return null;
    const prev = current.current ? actions[current.current] : null;

    // Prepare next action to start at t=0
    next.reset();
    next.time = 0;
    next.setLoop(loop, Infinity);
    next.clampWhenFinished = false;
    next.enabled = true;

    if (prev && prev !== next && fade > 0) {
      try {
        // Play next and cross-fade *with time-warping* so phases/lengths align
        next.play();
        // ensure the outgoing action isn't stuck at a custom timeScale
        if (typeof prev.setEffectiveTimeScale === 'function') prev.setEffectiveTimeScale(1);
        next.crossFadeFrom(prev, fade, true);
      } catch {
        try {
          if (typeof prev.setEffectiveTimeScale === 'function') prev.setEffectiveTimeScale(1);
          prev.stop();
          prev.enabled = false;
        } catch {}
        next.setEffectiveWeight(1);
        next.play();
      }
    } else {
      if (prev && prev !== next) {
        try {
          if (typeof prev.setEffectiveTimeScale === 'function') prev.setEffectiveTimeScale(1);
          prev.stop();
          prev.enabled = false;
        } catch {}
      }
      next.setEffectiveWeight(1);
      next.play();
    }

    current.current = name;
    // reset transition->glide pre-schedule guard on any action change
    scheduledTransToGlide.current = false;
    return next;
  };

  useEffect(() => {
    // Resolve clip names strictly (exact names provided by props)
    const available = names || [];
    const resolved = {
      idle: clipIdle,
      transFly: clipTransitionFlying,
      flap: clip,
      trans: clipTransitionGliding, // Flapping -> Gliding
      glide: clipGliding,
      glideFlap: clipGlidingFlapping,
    };
    resolvedRef.current = resolved;
    const A = actions; // shorthand

    if (debug) {
      console.log("[Bird] Animations available:", available);
      console.log("[Bird] Resolved:", resolved);
      [
        ["idle", resolved.idle],
        ["transFly", resolved.transFly],
        ["flap", resolved.flap],
        ["trans", resolved.trans],
        ["glide", resolved.glide],
        ["glideFlap", resolved.glideFlap],
      ].forEach(([key, name]) => {
        if (name && !A[name]) {
          console.warn(`[Bird] Warning: action not found for ${key} -> ${name}. Check the exact clip name in your GLB.`);
        }
      });
    }

      // Start with Idle if available, otherwise fallback to flapping (or first available)
    if (!started.current) {
        let startName = null;
        if (resolved.idle && A[resolved.idle]) startName = resolved.idle;
        else if (resolved.flap && A[resolved.flap]) startName = resolved.flap;
        else startName = available[0];
      try { mixer?.stopAllAction?.(); } catch {}
      playAction(startName, { loop: THREE.LoopRepeat });
      started.current = true;
    }

    const onLoop = (e) => {
  // Skip loop-driven state machine decisions while in an explicit transition (either kind)
  if (isInTransition.current || isInInitialFlyTransition.current) return;

      if (debug) {
        const clipName = e.action?.getClip?.().name || "<unknown>";
        const prev = loopCounts.current.get(clipName) || 0;
        const next = prev + 1;
        loopCounts.current.set(clipName, next);
        console.log(`[Bird] loop end: ${clipName} -> count=${next} | isFast=${isFastRef.current}`);
      }

  // Flapping: if fast at loop boundary, require one additional flap loop before transition to Gliding
      if (e.action === A[resolved.flap] && isFastRef.current) {
        fastFlapLoopCount.current++;
        if (fastFlapLoopCount.current < 2) {
          return;
        }
        fastFlapLoopCount.current = 0;
        isInTransition.current = true;
        const a = playAction(resolved.trans, { loop: THREE.LoopOnce, clamp: false });
        if (a) a.setLoop(THREE.LoopOnce, 1);
        return;
      }

      // Reset fast flap loop count when leaving flap state under other conditions
      if (e.action === A[resolved.flap] && !isFastRef.current) {
        fastFlapLoopCount.current = 0;
      }

      // Gliding: if slow at loop boundary, return to sustained flapping
      if (e.action === A[resolved.glide] && !isFastRef.current) {
        playAction(resolved.flap, { loop: THREE.LoopRepeat, clamp: false });
        return;
      }
    };

    const onFinished = (e) => {
      const clipName = e.action?.getClip?.().name || "<unknown>";
      if (debug) console.log(`[Bird] finished: ${clipName}`);

      if (e.action === A[resolved.transFly]) {
        // Finished initial Idle -> Flying transition, enter sustained flapping
        isInInitialFlyTransition.current = false;
        hasStartedFlying.current = true;
  if (!flightStartCalled.current) { onFlightStart(); flightStartCalled.current = true; }
        playAction(resolved.flap, { loop: THREE.LoopRepeat, clamp: false });
        return;
      }

      if (e.action === A[resolved.trans]) {
        // Transition ended → enter sustained Gliding
        isInTransition.current = false;
        playAction(resolved.glide, { loop: THREE.LoopRepeat, clamp: false });
        return;
      }

      if (e.action === A[resolved.glideFlap]) {
        // Glide→Flap flourish ended → resume sustained Flapping
        playAction(resolved.flap, { loop: THREE.LoopRepeat, clamp: false });
        return;
      }
    };

    mixer?.addEventListener("loop", onLoop);
    mixer?.addEventListener("finished", onFinished);
    return () => {
      mixer?.removeEventListener("loop", onLoop);
      mixer?.removeEventListener("finished", onFinished);
    };
  }, [actions, names, clip, mixer, clipTransitionGliding, clipGliding, clipGlidingFlapping, fade, debug]);

  useEffect(() => {
    // Prevent animated/skinned meshes from being culled incorrectly
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;
      }
      // Also disable frustum culling on bones if present
      if (child.isBone) child.frustumCulled = false;
    });
  }, [gltf.scene]);

  useFrame(() => {
    const resolved = resolvedRef.current;
    if (!resolved || !actions) return;

    if (current.current === resolved.trans && !scheduledTransToGlide.current) {
      const act = actions[resolved.trans];
      const clip = act?.getClip?.();
      if (act && clip) {
        const remaining = clip.duration - act.time;
        if (remaining <= Math.max(0.02, fade)) {
          if (debug) console.log("[Bird] pre-schedule: Transition -> Gliding");
          // We are leaving the transition early, so clear the transition flag and fade it out
          isInTransition.current = false;
          try { act.fadeOut?.(fade); } catch {}
          playAction(resolved.glide, { loop: THREE.LoopRepeat, clamp: false });
          scheduledTransToGlide.current = true;
        }
      }
    }

    // Detect first user scroll to kick off Idle -> Transition Flying
    if (!hasStartedFlying.current && !isInInitialFlyTransition.current) {
      // Use either offset or delta presence to infer interaction
      const firstScroll = (typeof window !== 'undefined') ? true : true; // placeholder
      // We rely on scroll hook values: if any non-zero since mount
      // (useScroll doesn't expose cumulative easily here, so piggy-back off lastOffsetRef)
      // lastOffsetRef is updated in the other useFrame; if it's non-zero, user scrolled.
      if (lastOffsetRef.current > 0) {
        const resolvedNames = resolvedRef.current;
        if (resolvedNames?.transFly && actions[resolvedNames.transFly]) {
          isInInitialFlyTransition.current = true;
          const a = playAction(resolvedNames.transFly, { loop: THREE.LoopOnce, clamp: false });
          if (a) a.setLoop(THREE.LoopOnce, 1);
        } else {
          // Fallback straight to flapping if transition clip not found
          hasStartedFlying.current = true;
          if (!flightStartCalled.current) { onFlightStart(); flightStartCalled.current = true; }
          playAction(resolvedNames.flap, { loop: THREE.LoopRepeat, clamp: false });
        }
      }
    }
  });

  // Get the flap action for audio sync
  const flapActionRef = useRef(null);
  const selectionActionRef = useRef(null);
  useEffect(() => {
    if (actions && resolvedRef.current) {
      const flapName = resolvedRef.current.flap;
      flapActionRef.current = actions[flapName] || null;
      
      // Get the transition-flying action (this is the "selection" animation)
      const transFlyName = resolvedRef.current.transFly;
      selectionActionRef.current = actions[transFlyName] || null;
      
      // Debug: log available actions to help find the selection animation
      if (debug && !selectionActionRef.current) {
        console.log("[Bird] Available actions:", Object.keys(actions));
        console.log("[Bird] Looking for transition-flying:", transFlyName);
      }
    }
  }, [actions, clip, debug]);

  return (
    <group ref={group} {...props} dispose={null}>
      {/* Center to fix origin offsets and size discrepancies */}
      <Center>
        <primitive object={gltf.scene} />
      </Center>
      {/* Flap audio sync */}
      {mixer && (flapActionRef.current || selectionActionRef.current) && (
        <FlapAudio
          mixer={mixer}
          flapAction={flapActionRef.current}
          selectionAction={selectionActionRef.current}
          currentActionRef={current}
          resolvedRef={resolvedRef}
          audioOffset={flapAudioOffset}
          transitionFlyingAudioOffset={transitionFlyingAudioOffset}
          volume={flapAudioVolume}
          flapInterval={flapAudioInterval}
          selectionFlapInterval={selectionFlapInterval}
          gustAudioVolume={gustAudioVolume}
          gustAudioFadeSpeed={gustAudioFadeSpeed}
          end={end}
        />
      )}
    </group>
  );
}

useGLTF.preload("./models/bird/model.glb");