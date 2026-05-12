import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePodcast } from '../../context/PodcastContext';
import InteractivePlayer from '../InteractivePlayer';

const GlobalPodcastPlayer = () => {
  const { isExpanded, setIsExpanded, setIsPlaying } = usePodcast();
  const location = useLocation();

  useEffect(() => {
    // Check if the current path is NOT a podcast-related path
    const isPodcastRoute = location.pathname.startsWith('/podcast') || location.pathname === '/podcasts';
    
    if (!isPodcastRoute) {
      setIsPlaying(false);
    }
  }, [location.pathname, setIsPlaying]);

  return <InteractivePlayer isOpen={isExpanded} onClose={() => setIsExpanded(false)} />;
};

export default GlobalPodcastPlayer;
