import 'expo-dev-client';

// backgroundTask MUST be imported before registerRootComponent so that
// TaskManager.defineTask is registered before the JS runtime is initialized
// on a background wake.
import './src/services/backgroundTask';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
