import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useKeepAwake } from 'expo-keep-awake'
import * as Linking from 'expo-linking'
import * as Location from 'expo-location'
import { LocationObject } from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Alert,
  BackHandler,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import LineBoard from '../components/LineBoard'
import Loading from '../components/Loading'
import Transfers from '../components/Transfers'
import TransfersYamanote from '../components/TransfersYamanote'
import TypeChangeNotify from '../components/TypeChangeNotify'
import Typography from '../components/Typography'
import { ASYNC_STORAGE_KEYS, LOCATION_TASK_NAME } from '../constants'
import { LineType, StopCondition } from '../gen/stationapi_pb'
import { useAccuracy } from '../hooks/useAccuracy'
import useAutoMode from '../hooks/useAutoMode'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useCurrentStation from '../hooks/useCurrentStation'
import useDetectBadAccuracy from '../hooks/useDetectBadAccuracy'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import { useLoopLine } from '../hooks/useLoopLine'
import useNextOperatorTrainTypeIsDifferent from '../hooks/useNextOperatorTrainTypeIsDifferent'
import { useNextStation } from '../hooks/useNextStation'
import useRefreshLeftStations from '../hooks/useRefreshLeftStations'
import useRefreshStation from '../hooks/useRefreshStation'
import useResetMainState from '../hooks/useResetMainState'
import useShouldHideTypeChange from '../hooks/useShouldHideTypeChange'
import { useTTS } from '../hooks/useTTS'
import useTransferLines from '../hooks/useTransferLines'
import useTransitionHeaderState from '../hooks/useTransitionHeaderState'
import useUpdateBottomState from '../hooks/useUpdateBottomState'
import { APP_THEME } from '../models/Theme'
import locationState from '../store/atoms/location'
import mirroringShareState from '../store/atoms/mirroringShare'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import { translate } from '../translation'
import getCurrentStationIndex from '../utils/currentStationIndex'
import isHoliday from '../utils/isHoliday'
import getIsPass from '../utils/isPass'

const { height: windowHeight } = Dimensions.get('window')

const styles = StyleSheet.create({
  touchable: {
    height: windowHeight - 128,
  },
  loadingText: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: 'bold',
    alignSelf: 'center',
    bottom: 32,
    fontSize: RFValue(14),
  },
})

let globalSetBGLocation: ((value: Location.LocationObject) => void) | null =
  null

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }): void => {
  if (error) {
    return
  }
  const { locations } = data as { locations: Location.LocationObject[] }
  if (locations[0] && globalSetBGLocation) {
    globalSetBGLocation(locations[0])
  }
})

const MainScreen: React.FC = () => {
  const { theme } = useRecoilValue(themeState)
  const { stations, selectedDirection, arrived } = useRecoilValue(stationState)
  const [{ leftStations, bottomState, autoModeEnabled }, setNavigation] =
    useRecoilState(navigationState)
  const { subscribing } = useRecoilValue(mirroringShareState)
  const { locationServiceAccuracy, locationServiceDistanceFilter } =
    useAccuracy()
  const currentLine = useCurrentLine()
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()
  useAutoMode(autoModeEnabled)
  const isLEDTheme = useIsLEDTheme()
  const { isYamanoteLine, isOsakaLoopLine, isMeijoLine } = useLoopLine()

  const autoModeEnabledRef = useRef(autoModeEnabled)
  const locationAccuracyRef = useRef(locationServiceAccuracy)
  const locationServiceDistanceFilterRef = useRef(locationServiceDistanceFilter)
  const subscribingRef = useRef(subscribing)
  const currentStationRef = useRef(currentStation)
  const stationsRef = useRef(stations)

  const hasTerminus = useMemo((): boolean => {
    if (!currentLine || isYamanoteLine || isOsakaLoopLine || isMeijoLine) {
      return false
    }
    if (selectedDirection === 'INBOUND') {
      return leftStations
        .slice(0, 8)
        .some((ls) => ls.id === stations[stations.length - 1]?.id)
    }

    return leftStations
      .slice(0, 8)
      .some(
        (ls) => ls.id === stations.slice().reverse()[stations.length - 1]?.id
      )
  }, [
    currentLine,
    isYamanoteLine,
    isOsakaLoopLine,
    isMeijoLine,
    selectedDirection,
    leftStations,
    stations,
  ])
  const setLocation = useSetRecoilState(locationState)
  const setBGLocation = useCallback(
    (location: LocationObject) =>
      setLocation((prev) => {
        const isSame =
          location.coords?.latitude === prev?.location?.coords?.latitude &&
          location.coords?.longitude === prev?.location?.coords?.longitude
        if (isSame) {
          return prev
        }
        return { ...prev, location }
      }),
    [setLocation]
  )
  if (!globalSetBGLocation) {
    globalSetBGLocation = setBGLocation
  }

  const openFailedToOpenSettingsAlert = useCallback(
    () =>
      Alert.alert(translate('errorTitle'), translate('failedToOpenSettings'), [
        {
          text: 'OK',
        },
      ]),
    []
  )

  useEffect(() => {
    if (Platform.OS === 'android') {
      const f = async (): Promise<void> => {
        const firstOpenPassed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.DOSE_CONFIRMED
        )
        if (firstOpenPassed === null) {
          Alert.alert(translate('notice'), translate('dozeAlertText'), [
            {
              text: translate('dontShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem(
                  ASYNC_STORAGE_KEYS.DOSE_CONFIRMED,
                  'true'
                )
              },
            },
            {
              text: translate('settings'),
              onPress: async (): Promise<void> => {
                Linking.openSettings().catch(() => {
                  openFailedToOpenSettingsAlert()
                })
                await AsyncStorage.setItem(
                  ASYNC_STORAGE_KEYS.DOSE_CONFIRMED,
                  'true'
                )
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ])
        }
      }
      f()
    }
  }, [openFailedToOpenSettingsAlert])

  useEffect(() => {
    const startUpdateAsync = async () => {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: locationAccuracyRef.current,
        distanceInterval: locationServiceDistanceFilterRef.current,
        foregroundService: {
          notificationTitle: translate('bgAlertTitle'),
          notificationBody: translate('bgAlertContent'),
          killServiceOnDestroy: true,
        },
      })
    }
    if (!autoModeEnabledRef.current && !subscribingRef.current) {
      startUpdateAsync()
    }

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [])

  const navigation = useNavigation()
  useTransitionHeaderState()
  useRefreshLeftStations()
  useRefreshStation()
  useKeepAwake()
  useDetectBadAccuracy()
  useTTS()

  const handleBackButtonPress = useResetMainState()
  const { pause: pauseBottomTimer } = useUpdateBottomState()

  const transferStation = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation ?? null,
    [arrived, nextStation, currentStation]
  )

  const stationsFromCurrentStation = useMemo(() => {
    if (!selectedDirection) {
      return []
    }
    const currentStationIndex = getCurrentStationIndex(
      stationsRef.current,
      currentStationRef.current
    )
    return selectedDirection === 'INBOUND'
      ? stationsRef.current.slice(currentStationIndex)
      : stationsRef.current.slice(0, currentStationIndex + 1)
  }, [selectedDirection])

  useEffect(() => {
    if (
      stationsFromCurrentStation.some(
        (s) => s.line?.lineType === LineType.SUBWAY
      )
    ) {
      Alert.alert(translate('subwayAlertTitle'), translate('subwayAlertText'), [
        { text: 'OK' },
      ])
    }
  }, [stationsFromCurrentStation])

  useEffect(() => {
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.WEEKDAY
      ) !== -1 &&
      isHoliday
    ) {
      Alert.alert(translate('notice'), translate('holidayNotice'))
    }
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.HOLIDAY
      ) !== -1 &&
      !isHoliday
    ) {
      Alert.alert(translate('notice'), translate('weekdayNotice'))
    }

    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.PARTIAL
      ) !== -1
    ) {
      Alert.alert(translate('notice'), translate('partiallyPassNotice'))
    }
  }, [stationsFromCurrentStation])

  const transferLines = useTransferLines()

  const toTransferState = useCallback((): void => {
    if (transferLines.length) {
      pauseBottomTimer()
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'TRANSFER',
      }))
    }
  }, [pauseBottomTimer, setNavigation, transferLines.length])

  const toLineState = useCallback((): void => {
    pauseBottomTimer()
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'LINE',
    }))
  }, [pauseBottomTimer, setNavigation])

  const nextTrainTypeIsDifferent = useNextOperatorTrainTypeIsDifferent()
  const shouldHideTypeChange = useShouldHideTypeChange()

  const toTypeChangeState = useCallback(() => {
    if (!nextTrainTypeIsDifferent || shouldHideTypeChange) {
      pauseBottomTimer()
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'LINE',
      }))
      return
    }
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'TYPE_CHANGE',
    }))
  }, [
    nextTrainTypeIsDifferent,
    pauseBottomTimer,
    setNavigation,
    shouldHideTypeChange,
  ])

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBackButtonPress()
        navigation.navigate('SelectBound')
        return true
      }
    )
    return subscription.remove
  }, [handleBackButtonPress, navigation])

  const marginForMetroThemeStyle = useMemo(
    () => ({
      marginTop: theme === APP_THEME.TOKYO_METRO ? -4 : 0, // メトロのヘッダーにある下部の影を相殺する
    }),
    [theme]
  )

  if (subscribing && !currentStation) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <Loading />
        <Typography style={styles.loadingText}>
          {translate('awaitingLatestData')}
        </Typography>
      </View>
    )
  }

  if (isLEDTheme) {
    return <LineBoard />
  }

  switch (bottomState) {
    case 'LINE':
      return (
        <View
          style={{
            flex: 1,
            height: windowHeight,
            ...marginForMetroThemeStyle,
          }}
        >
          <Pressable
            style={styles.touchable}
            onPress={transferLines.length ? toTransferState : toTypeChangeState}
          >
            <LineBoard hasTerminus={hasTerminus} />
          </Pressable>
        </View>
      )
    case 'TRANSFER':
      if (!transferStation) {
        return null
      }
      if (theme === APP_THEME.YAMANOTE || theme === APP_THEME.JO) {
        return (
          <TransfersYamanote
            onPress={nextTrainTypeIsDifferent ? toTypeChangeState : toLineState}
            station={transferStation}
          />
        )
      }

      return (
        <View style={[styles.touchable, marginForMetroThemeStyle]}>
          <Transfers
            theme={theme}
            onPress={nextTrainTypeIsDifferent ? toTypeChangeState : toLineState}
          />
        </View>
      )
    case 'TYPE_CHANGE':
      return (
        <View style={[styles.touchable, marginForMetroThemeStyle]}>
          <Pressable onPress={toLineState} style={styles.touchable}>
            <TypeChangeNotify />
          </Pressable>
        </View>
      )
    default:
      return <></>
  }
}

export default React.memo(MainScreen)
