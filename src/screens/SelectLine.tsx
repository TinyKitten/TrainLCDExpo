import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import React, { useCallback, useEffect } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import Button from '../components/Button'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import Loading from '../components/Loading'
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorageKeys'
import { LOCATION_TASK_NAME } from '../constants/location'
import { parenthesisRegexp } from '../constants/regexp'
import { Line } from '../gen/stationapi_pb'
import useConnectivity from '../hooks/useConnectivity'
import useFetchNearbyStation from '../hooks/useFetchNearbyStation'
import useGetLineMark from '../hooks/useGetLineMark'
import devState from '../store/atoms/dev'
import lineState from '../store/atoms/line'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import isTablet from '../utils/isTablet'

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  marginTop: {
    marginTop: 24,
  },
  buttons: {
    marginTop: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  button: {
    marginHorizontal: isTablet ? 12 : 8,
    marginBottom: isTablet ? 24 : 12,
  },
})

const SelectLineScreen: React.FC = () => {
  const [{ station }, setStationState] = useRecoilState(stationState)
  const setLocationState = useSetRecoilState(locationState)
  const [{ requiredPermissionGranted }, setNavigation] =
    useRecoilState(navigationState)
  const setLineState = useSetRecoilState(lineState)
  const { devMode } = useRecoilValue(devState)
  const fetchStationFunc = useFetchNearbyStation()
  const isInternetAvailable = useConnectivity()

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const { status } = await Location.getForegroundPermissionsAsync()
        if (status !== 'granted') {
          return
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        await fetchStationFunc(pos)
      }
      init()
    }, [fetchStationFunc])
  )

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED
      )
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED,
                'true'
              )
            },
          },
        ])
      }
    }
    f()
  }, [])

  useEffect(() => {
    if (TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [])

  const navigation = useNavigation()

  const handleLineSelected = useCallback(
    (line: Line.AsObject): void => {
      setStationState((prev) => ({
        ...prev,
        stations: [],
      }))
      setNavigation((prev) => ({
        ...prev,
        trainType: null,
        leftStations: [],
        stationForHeader: null,
      }))

      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
      }))
      navigation.navigate('SelectBound')
    },
    [navigation, setLineState, setNavigation, setStationState]
  )

  const getLineMarkFunc = useGetLineMark()

  const getButtonText = useCallback(
    (line: Line.AsObject) => {
      const lineMark = station && getLineMarkFunc({ line })
      const lineName = line.nameShort.replace(parenthesisRegexp, '')
      const lineNameR = line.nameRoman.replace(parenthesisRegexp, '')
      if (lineMark?.extraSign) {
        return `[${lineMark.sign}/${lineMark.subSign}/${lineMark.extraSign}] ${
          isJapanese ? lineName : lineNameR
        }`
      }
      if (lineMark?.subSign) {
        return `[${lineMark.sign}/${lineMark.subSign}] ${
          isJapanese ? lineName : lineNameR
        }`
      }
      if (lineMark?.sign) {
        return `[${lineMark.sign}] ${isJapanese ? lineName : lineNameR}`
      }
      return isJapanese ? lineName : lineNameR
    },
    [getLineMarkFunc, station]
  )

  const renderLineButton: React.FC<Line.AsObject> = useCallback(
    (line: Line.AsObject) => {
      const buttonOnPress = (): void => handleLineSelected(line)
      const buttonText = getButtonText(line)

      return (
        <Button
          color={line.color ?? '#000'}
          key={line.id}
          disabled={!isInternetAvailable}
          style={styles.button}
          onPress={buttonOnPress}
        >
          {buttonText}
        </Button>
      )
    },
    [getButtonText, handleLineSelected, isInternetAvailable]
  )

  const handleUpdateStation = useCallback(async () => {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    setLocationState((prev) => ({
      ...prev,
      location: pos,
    }))
    setStationState((prev) => ({
      ...prev,
      station: null,
      stations: [],
    }))
    setNavigation((prev) => ({
      ...prev,
      stationForHeader: null,
      stationFromCoordinates: null,
    }))
    await fetchStationFunc(pos)
  }, [fetchStationFunc, setLocationState, setNavigation, setStationState])

  const navigateToSettingsScreen = useCallback(() => {
    navigation.navigate('AppSettings')
  }, [navigation])

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    if (isInternetAvailable) {
      navigation.navigate('FakeStation')
    }
  }, [isInternetAvailable, navigation])
  const navigateToConnectMirroringShareScreen = useCallback(() => {
    if (isInternetAvailable) {
      navigation.navigate('ConnectMirroringShare')
    }
  }, [isInternetAvailable, navigation])

  if (!station) {
    return <Loading />
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectLineTitle')}</Heading>

        <View style={styles.buttons}>
          {station.linesList.map((line) => renderLineButton(line))}
        </View>

        <Heading style={styles.marginTop}>{translate('settings')}</Heading>
        <View style={styles.buttons}>
          {isInternetAvailable ? (
            <Button
              style={styles.button}
              onPress={navigateToFakeStationSettingsScreen}
            >
              {translate('startStationTitle')}
            </Button>
          ) : null}
          {isInternetAvailable && devMode && (
            <Button
              style={styles.button}
              onPress={navigateToConnectMirroringShareScreen}
            >
              {translate('msConnectTitle')}
            </Button>
          )}
          <Button style={styles.button} onPress={navigateToSettingsScreen}>
            {translate('settings')}
          </Button>
        </View>
      </ScrollView>
      {requiredPermissionGranted ? (
        <FAB
          disabled={!isInternetAvailable}
          icon="md-refresh"
          onPress={handleUpdateStation}
        />
      ) : null}
    </>
  )
}

export default SelectLineScreen
