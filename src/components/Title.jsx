import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import { usePlay } from '../contexts/Play';
import { useRef, useEffect } from 'react';

export const Title = () => {
  const { play, end } = usePlay();
  const scroll = useScroll();
  const lastTitleRef = useRef('');

  useEffect(() => {
    if (!play) {
      document.title = 'Ryan Ghimire';
      lastTitleRef.current = 'Ryan Ghimire';
    }
  }, [play]);

  useEffect(() => {
    if (end) {
      document.title = 'Ryan Ghimire';
      lastTitleRef.current = 'Ryan Ghimire';
    }
  }, [end]);

  useFrame(() => {
    if (!play || end) return;

    // Calculate scroll progress (0 to 1)
    const scrollProgress = Math.min(Math.max(scroll.offset || 0, 0), 1);
    
    // Total length of the title (emoji + underscores)
    // "Ryan Ghimire" is 13 characters, so we'll use 13 underscores + 1 emoji = 14 total
    const totalLength = 14;
    const numUnderscores = totalLength - 1; // 13 underscores
    
    // Calculate emoji position (0 to numUnderscores)
    const emojiPosition = Math.floor(scrollProgress * (numUnderscores + 1));
    
    // Build the title string
    let title = '';
    for (let i = 0; i <= numUnderscores; i++) {
      if (i === emojiPosition) {
        title += '🦅';
      } else {
        title += '_';
      }
    }
    
    // Only update if title changed
    if (title !== lastTitleRef.current) {
      document.title = title;
      lastTitleRef.current = title;
    }
  });

  return null;
};

