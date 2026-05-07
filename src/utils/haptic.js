/**
 * Utility for haptic feedback on mobile devices.
 * Uses the navigator.vibrate API.
 */
export const hapticFeedback = (intensity = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    switch (intensity) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(20);
        break;
      case 'heavy':
        window.navigator.vibrate(50);
        break;
      case 'success':
        window.navigator.vibrate([10, 30, 10]);
        break;
      case 'error':
        window.navigator.vibrate([50, 50, 50]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  }
};
