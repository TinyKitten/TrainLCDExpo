import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import * as Permissions from 'expo-permissions';
import { Provider } from 'react-redux';
import { AppLoading } from 'expo';
import Layout from './components/Layout';
import MainScreen from './screens/Main';
import SelectBoundScreen from './screens/SelectBound';
import SelectLineScreen from './screens/SelectLine';
import ThemeSettingsScreen from './screens/ThemeSettings';
import store from './store';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import { setI18nConfig } from './translation';
import PrivacyScreen from './screens/Privacy';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
};

const options = {
  animationEnabled: false,
  cardStyle: {
    backgroundColor: '#fff',
    opacity: 1,
  },
};

const App: React.FC = () => {
  const [translationLoaded, setTranstationLoaded] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { granted } = await Permissions.getAsync(Permissions.LOCATION);
      setPermissionsGranted(granted);
    };
    f();
  }, []);

  const loadTranslate = useCallback((): Promise<void> => setI18nConfig(), []);
  if (!translationLoaded) {
    return (
      <AppLoading
        startAsync={loadTranslate}
        onError={console.warn}
        onFinish={(): void => setTranstationLoaded(true)}
      />
    );
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <Layout>
          <Stack.Navigator
            screenOptions={screenOptions}
            initialRouteName={permissionsGranted ? 'SelectLine' : 'Privacy'}
          >
            <Stack.Screen
              options={options}
              name="Privacy"
              component={PrivacyScreen}
            />
            <Stack.Screen
              options={options}
              name="SelectLine"
              component={SelectLineScreen}
            />
            <Stack.Screen
              options={options}
              name="SelectBound"
              component={SelectBoundScreen}
            />
            <Stack.Screen
              options={options}
              name="Main"
              component={MainScreen}
            />
            <Stack.Screen
              options={options}
              name="ThemeSettings"
              component={ThemeSettingsScreen}
            />
            <Stack.Screen
              options={options}
              name="Notification"
              component={NotificationSettingsScreen}
            />
          </Stack.Navigator>
        </Layout>
      </NavigationContainer>
    </Provider>
  );
};

export default App;
