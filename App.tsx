import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { WorkoutProvider } from './src/context/WorkoutContext';
import RootNavigator from './src/navigation/RootNavigator';
import { getDatabase } from './src/db/client';
import { requestNotificationPermissions } from './src/services/notifications';
import { registerBackgroundTask } from './src/services/backgroundTask';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await getDatabase();
        await requestNotificationPermissions().catch(console.error);
        await registerBackgroundTask().catch(console.error);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <WorkoutProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </WorkoutProvider>
    </SafeAreaProvider>
  );
}
