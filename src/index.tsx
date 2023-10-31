import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import { firebase } from '@react-native-firebase/perf'
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { StatusBar, Text } from 'react-native'
import { RecoilRoot } from 'recoil'
import ErrorFallback from './components/ErrorBoundary'
import FakeStationSettings from './components/FakeStationSettings'
import Loading from './components/Loading'
import TuningSettings from './components/TuningSettings'
import { LOCATION_TASK_NAME } from './constants/location'
import useAnonymousUser from './hooks/useAnonymousUser'
import useReport from './hooks/useReport'
import ConnectMirroringShareSettings from './screens/ConnectMirroringShareSettings'
import PrivacyScreen from './screens/Privacy'
import MainStack from './stacks/MainStack'
import { setI18nConfig } from './translation'

const Stack = createStackNavigator()

const screenOptions = {
  headerShown: false,
}
const options = {
  animationEnabled: false,
  cardStyle: {
    backgroundColor: '#fff',
    opacity: 1,
  },
}

const App: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef>(null)
  const [readyForLaunch, setReadyForLaunch] = useState(false)
  const [permissionsGranted, setPermissionsGranted] = useState(false)

  const loadTranslate = useCallback((): Promise<void> => setI18nConfig(), [])

  useEffect(() => {
    const initAsync = async () => {
      if (!__DEV__) {
        firebase.perf().dataCollectionEnabled = true
      }

      await loadTranslate()

      const { locationServicesEnabled } =
        await Location.getProviderStatusAsync()
      if (!locationServicesEnabled) {
        setReadyForLaunch(true)
        setPermissionsGranted(false)
        return
      }
      const { status } = await Location.getForegroundPermissionsAsync()
      setPermissionsGranted(status === Location.PermissionStatus.GRANTED)
      setReadyForLaunch(true)
    }
    initAsync()
  }, [loadTranslate])

  useEffect(() => {
    type TextProps = {
      defaultProps: {
        allowFontScaling: boolean
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(Text as unknown as TextProps).defaultProps =
      (Text as unknown as TextProps).defaultProps || {}
    ;(Text as unknown as TextProps).defaultProps.allowFontScaling = false
  }, [])

  useEffect(() => {
    return () => {
      if (TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }
    }
  }, [])

  const user = useAnonymousUser()
  const { sendReport } = useReport(user ?? null)

  const handleBoundaryError = useCallback(
    async (
      error: Error,
      info: {
        componentStack: string
      }
    ) => {
      if (!__DEV__) {
        await sendReport({
          reportType: 'crash',
          description: error.message,
          stacktrace: info.componentStack
            .split('\n')
            .filter((c) => c.length !== 0)
            .map((c) => c.trim())
            .join('\n'),
        })
      }
    },
    [sendReport]
  )

  if (!readyForLaunch) {
    return <Loading />
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleBoundaryError}
    >
      <RecoilRoot>
        <>
          <ActionSheetProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar hidden translucent backgroundColor="transparent" />

              <Stack.Navigator
                screenOptions={screenOptions}
                initialRouteName={permissionsGranted ? 'MainStack' : 'Privacy'}
              >
                <Stack.Screen
                  options={options}
                  name="Privacy"
                  component={PrivacyScreen}
                />

                <Stack.Screen
                  options={options}
                  name="FakeStation"
                  component={FakeStationSettings}
                />

                <Stack.Screen
                  options={options}
                  name="ConnectMirroringShare"
                  component={ConnectMirroringShareSettings}
                />

                <Stack.Screen
                  options={options}
                  name="TuningSettings"
                  component={TuningSettings}
                />

                <Stack.Screen
                  options={options}
                  name="MainStack"
                  component={MainStack}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </ActionSheetProvider>
        </>
      </RecoilRoot>
    </ErrorBoundary>
  )
}

export default App
