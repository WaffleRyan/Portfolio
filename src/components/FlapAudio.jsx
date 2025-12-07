import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';

/**
 * FlapAudio component syncs flap.mp3 audio with bird flapping animation
 * 
 * Adjustable variables:
 * - audioOffset: Time offset in seconds to fine-tune alignment for flapping (default: 0)
 * - transitionFlyingAudioOffset: Time offset in seconds for transition-flying animation (default: 0)
 * - volume: Audio volume 0-1 (default: 0.5)
 * - flapInterval: Expected time between flaps in seconds for Teratorn_Flapping (default: 1.083, based on 12 flaps in 13 seconds)
 * - selectionFlapInterval: Expected time between flaps in seconds for transition-flying (default: 0.5)
 * - gustAudioVolume: Gust audio volume 0-1 (default: 0.5)
 * - gustAudioFadeSpeed: Gust audio fade in/out speed multiplier (default: 2.0, higher = faster fade)
 */
export const FlapAudio = ({ 
  mixer, 
  flapAction,
  selectionAction,
  glidingAction,
  currentActionRef,
  resolvedRef,
  audioOffset = 0,
  transitionFlyingAudioOffset = 0,
  volume = 0.5,
  flapInterval = 1.083,
  selectionFlapInterval = 0.5,
  gustAudioVolume = 0.5,
  gustAudioFadeSpeed = 2.0,
  end = false
}) => {
  const audioRef = useRef(null);
  const gustAudioRef = useRef(null);
  const lastFlapTimeRef = useRef(0);
  const lastSelectionFlapTimeRef = useRef(0);
  const flapClipRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const gustAudioPlayingRef = useRef(false);
  const gustFadeOutRef = useRef(null);
  const scroll = useScroll();
  const lastScrollOffsetRef = useRef(0);

  useEffect(() => {
    // Load and setup audio template
    const audio = new Audio('/sounds/flap.mp3');
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    // Get the clip duration for reference
    audio.addEventListener('loadedmetadata', () => {
      flapClipRef.current = audio.duration;
    });

    // Load and setup gust audio
    const gustAudio = new Audio('/sounds/gust.mp3');
    gustAudio.preload = 'auto';
    gustAudio.volume = 0; // Start at 0 for fade-in
    gustAudio.loop = true;
    gustAudioRef.current = gustAudio;

    return () => {
      // Cleanup - stop any playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (gustAudioRef.current) {
        gustAudioRef.current.pause();
        gustAudioRef.current.currentTime = 0;
        gustAudioRef.current.volume = 0;
      }
      if (gustFadeOutRef.current) {
        clearInterval(gustFadeOutRef.current);
        gustFadeOutRef.current = null;
      }
    };
  }, [volume]);

  // Continuously check if we should stop audio (when not flapping or selecting)
  // Also trigger audio for transition-flying animation if it's playing
  // Also handle gust audio based on velocity bars
  useFrame((_state, delta) => {
    if (!mixer) return;
    
    // If end is reached, stop all audio
    if (end) {
      // Stop flap/transition audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
        isPlayingRef.current = false;
      }
      // Stop and fade out gust audio
      if (gustAudioRef.current && gustAudioPlayingRef.current) {
        gustAudioRef.current.pause();
        gustAudioRef.current.currentTime = 0;
        gustAudioRef.current.volume = 0;
        gustAudioPlayingRef.current = false;
      }
      return;
    }
    
    // Check if flapping animation is running
    const isFlappingRunning = flapAction && flapAction.isRunning() && flapAction.enabled;
    // Check if selection/transition-flying animation is running
    const isSelectionRunning = selectionAction && selectionAction.isRunning() && selectionAction.enabled;
    
    // Check for velocity bars (similar to Speed.jsx logic)
    const scrollDelta = scroll.offset - lastScrollOffsetRef.current;
    const hasVelocityBars = scrollDelta > 0.0005;
    lastScrollOffsetRef.current = scroll.offset || 0;
    
    // If transition-flying is playing, try to play audio based on time interval
    if (isSelectionRunning && selectionAction) {
      const now = performance.now() / 1000;
      const timeSinceLastFlap = now - lastSelectionFlapTimeRef.current;
      const timeScale = selectionAction.getEffectiveTimeScale ? selectionAction.getEffectiveTimeScale() : 1;
      const expectedInterval = selectionFlapInterval / timeScale;
      
      // Play audio if enough time has passed and not already playing
      if (!isPlayingRef.current && (lastSelectionFlapTimeRef.current === 0 || timeSinceLastFlap >= expectedInterval * 0.3)) {
        lastSelectionFlapTimeRef.current = now;
        playAudio(selectionAction, timeScale, true); // Use transition offset
      }
    }
    
    // Handle gust audio based on velocity bars (but not if transition-flying is playing)
    if (hasVelocityBars && !isSelectionRunning && gustAudioRef.current) {
      // Clear any fade-out that might be in progress
      if (gustFadeOutRef.current) {
        clearInterval(gustFadeOutRef.current);
        gustFadeOutRef.current = null;
      }
      
      if (!gustAudioPlayingRef.current) {
        // Start playing gust audio with fade-in
        gustAudioRef.current.volume = 0;
        gustAudioRef.current.play().catch(err => {
          console.warn('Gust audio play failed:', err);
        });
        gustAudioPlayingRef.current = true;
      }
      
      // Fade in to target volume
      if (gustAudioRef.current.volume < gustAudioVolume) {
        gustAudioRef.current.volume = Math.min(gustAudioVolume, gustAudioRef.current.volume + delta * gustAudioFadeSpeed);
      }
    } else {
      // Fade out gust audio when velocity bars disappear
      if (gustAudioPlayingRef.current && gustAudioRef.current) {
        if (gustAudioRef.current.volume > 0) {
          gustAudioRef.current.volume = Math.max(0, gustAudioRef.current.volume - delta * gustAudioFadeSpeed);
        } else {
          // Once faded out, pause and reset
          gustAudioRef.current.pause();
          gustAudioRef.current.currentTime = 0;
          gustAudioPlayingRef.current = false;
        }
      }
    }
    
    // If not flapping or selecting and audio is playing, stop it immediately
    if (!isFlappingRunning && !isSelectionRunning && isPlayingRef.current && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      isPlayingRef.current = false;
      currentAudioRef.current = null;
    }
  });

  // Function to play flap audio for regular flapping
  const playFlapAudio = () => {
    // Check if flap is the current active action
    if (currentActionRef && resolvedRef && resolvedRef.current) {
      const currentActionName = currentActionRef.current;
      const flapName = resolvedRef.current.flap;
      if (currentActionName !== flapName) {
        // Not currently flapping, don't play audio
        return;
      }
    }
    
    // Only play if the flap action is actually playing and enabled
    if (!flapAction || !flapAction.isRunning() || !flapAction.enabled) return;
    
    // Don't play if audio is already playing
    if (isPlayingRef.current) return;

    const now = performance.now() / 1000; // Current time in seconds
    const timeSinceLastFlap = now - lastFlapTimeRef.current;
    
    // Get the current timeScale of the animation
    const timeScale = flapAction.getEffectiveTimeScale ? flapAction.getEffectiveTimeScale() : 1;
    
    // Get the clip duration
    const clip = flapAction.getClip();
    const clipDuration = clip ? clip.duration : flapInterval;
    
    // Calculate expected time between flaps based on animation speed
    // When timeScale is higher, flaps happen faster, so interval is shorter
    const expectedInterval = clipDuration / timeScale;
    
    // Only play if enough time has passed (prevent double-triggers)
    // For first play, allow it immediately
    if (lastFlapTimeRef.current === 0 || timeSinceLastFlap >= expectedInterval * 0.3) {
      lastFlapTimeRef.current = now;
      playAudio(flapAction, timeScale);
    }
  };


  // Shared function to actually play the audio
  const playAudio = (action, timeScale, useTransitionOffset = false) => {
      
    // Play audio with offset and speed matching
    if (audioRef.current) {
      const audio = audioRef.current.cloneNode();
      audio.volume = volume;
      
      // Adjust playback rate to match animation speed
      audio.playbackRate = Math.max(0.5, Math.min(2.0, timeScale)); // Clamp between 0.5x and 2x
      
      // Get the offset value
      const offset = useTransitionOffset ? transitionFlyingAudioOffset : audioOffset;
      
      // Mark as playing
      isPlayingRef.current = true;
      currentAudioRef.current = audio;
      
      // Set up event listeners to track when audio finishes
      const onEnded = () => {
        isPlayingRef.current = false;
        currentAudioRef.current = null;
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('canplay', onCanPlay);
      };
      
      const onError = () => {
        isPlayingRef.current = false;
        currentAudioRef.current = null;
        audio.removeEventListener('error', onError);
        audio.removeEventListener('canplay', onCanPlay);
      };
      
      // Set currentTime when audio is ready to play
      const onCanPlay = () => {
        if (offset !== 0 && audio.duration && !isNaN(audio.duration)) {
          const targetTime = Math.max(0, Math.min(audio.duration, offset));
          try {
            audio.currentTime = targetTime;
          } catch (e) {
            console.warn('Failed to set audio currentTime:', e);
          }
        }
        audio.removeEventListener('canplay', onCanPlay);
      };
      
      // Try to set currentTime immediately if metadata is available
      if (audio.readyState >= 2 && audio.duration && !isNaN(audio.duration)) { // HAVE_CURRENT_DATA or higher
        if (offset !== 0) {
          try {
            audio.currentTime = Math.max(0, Math.min(audio.duration, offset));
          } catch (e) {
            // If it fails, wait for canplay event
            audio.addEventListener('canplay', onCanPlay);
          }
        }
      } else {
        // Wait for audio to be ready
        audio.addEventListener('canplay', onCanPlay);
      }
      
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      
      audio.play().then(() => {
        // After play starts, try to set currentTime one more time if needed
        if (offset !== 0 && audio.duration && !isNaN(audio.duration)) {
          try {
            const targetTime = Math.max(0, Math.min(audio.duration, offset));
            if (Math.abs(audio.currentTime - targetTime) > 0.01) {
              audio.currentTime = targetTime;
            }
          } catch (e) {
            // Ignore errors setting currentTime after play
          }
        }
      }).catch(err => {
        // Audio play failed (might be autoplay restrictions)
        console.warn('Flap audio play failed:', err);
        isPlayingRef.current = false;
        currentAudioRef.current = null;
        audio.removeEventListener('canplay', onCanPlay);
      });
    }
  };

  useEffect(() => {
    if (!mixer) return;

    const playSelectionFlapAudio = () => {
      if (!selectionAction || !selectionAction.isRunning() || !selectionAction.enabled) return;
      if (isPlayingRef.current) return;

      const now = performance.now() / 1000;
      const timeSinceLastFlap = now - lastSelectionFlapTimeRef.current;
      const timeScale = selectionAction.getEffectiveTimeScale ? selectionAction.getEffectiveTimeScale() : 1;
      const expectedInterval = selectionFlapInterval / timeScale;

      if (lastSelectionFlapTimeRef.current === 0 || timeSinceLastFlap >= expectedInterval * 0.3) {
        lastSelectionFlapTimeRef.current = now;
        playAudio(selectionAction, timeScale, true); // Use transition offset
      }
    };

    const onLoop = (event) => {
      const actionName = event.action?.getClip?.()?.name;
      
      if (event.action === flapAction || actionName === resolvedRef?.current?.flap) {
        playFlapAudio();
      } else if (event.action === selectionAction || actionName === resolvedRef?.current?.transFly) {
        playSelectionFlapAudio();
      }
    };

    // Also listen for when the action starts (not just loops)
    const onPlay = (event) => {
      const actionName = event.action?.getClip?.()?.name;
      
      if (event.action === flapAction || actionName === resolvedRef?.current?.flap) {
        // Reset last flap time to allow immediate play on start
        lastFlapTimeRef.current = 0;
        playFlapAudio();
      } else if (event.action === selectionAction || actionName === resolvedRef?.current?.transFly) {
        // Reset last selection flap time to allow immediate play on start
        lastSelectionFlapTimeRef.current = 0;
        playSelectionFlapAudio();
      }
    };

    mixer.addEventListener('loop', onLoop);
    mixer.addEventListener('play', onPlay);

    return () => {
      mixer.removeEventListener('loop', onLoop);
      mixer.removeEventListener('play', onPlay);
      // Stop any playing audio on cleanup
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      isPlayingRef.current = false;
    };
  }, [mixer, flapAction, selectionAction, currentActionRef, resolvedRef, audioOffset, transitionFlyingAudioOffset, volume, flapInterval, selectionFlapInterval]);

  return null;
};

