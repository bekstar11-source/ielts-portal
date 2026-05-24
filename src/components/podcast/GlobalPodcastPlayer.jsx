import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePodcast } from '../../context/PodcastContext';
import InteractivePlayer from '../InteractivePlayer';

const isPodcastPath = (pathname) =>
  pathname.startsWith('/podcast') || pathname === '/podcasts';

const GlobalPodcastPlayer = () => {
  const { isExpanded, setIsExpanded, setIsPlaying } = usePodcast();
  const location = useLocation();
  const isPodcastRoute = isPodcastPath(location.pathname);

  useEffect(() => {
    if (!isPodcastRoute) {
      setIsPlaying(false);
    }
  }, [isPodcastRoute, setIsPlaying]);

  return (
    <InteractivePlayer
      isOpen={isExpanded}
      onClose={() => setIsExpanded(false)}
      keyboardShortcutsEnabled={isPodcastRoute}
    />
  );
};

export default GlobalPodcastPlayer;
