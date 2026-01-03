// utils/useMoments.ts
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDevice } from './deviceInfo';
import { momentEngine } from './momentsEngine';

export function useMoments() {
  const { deviceInfo, capabilities, runtimeSignals } = useDevice();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!deviceInfo || !capabilities || !runtimeSignals) return;

    const run = () => {
      momentEngine.generateAndNotify(deviceInfo, capabilities, runtimeSignals);
    };

    // Run once immediately when data is ready
    run();

    // Also run when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        run();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [deviceInfo, capabilities, runtimeSignals]);
}
