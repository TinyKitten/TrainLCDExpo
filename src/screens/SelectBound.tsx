import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useSetRecoilState } from 'recoil'
import Button from '../components/Button'
import ErrorScreen from '../components/ErrorScreen'
import Heading from '../components/Heading'
import Typography from '../components/Typography'
import { Station, StopCondition, TrainType } from '../gen/stationapi_pb'
import useStationList from '../hooks/useStationList'
import { LineDirection, directionToDirectionName } from '../models/Bound'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import getCurrentStationIndex from '../utils/currentStationIndex'
import {
  getIsLoopLine,
  getIsMeijoLine,
  getIsOsakaLoopLine,
  getIsYamanoteLine,
  inboundStationsForLoopLine,
  outboundStationsForLoopLine,
} from '../utils/loopLine'
import {
  findBranchLine,
  findLocalType,
  findLtdExpType,
  findRapidType,
  getTrainTypeString,
} from '../utils/trainTypeString'

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 16,
  },
  bottom: {
    padding: 16,
  },
  buttons: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizontalButtons: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  menuNotice: {
    fontWeight: 'bold',
    marginTop: 12,
    fontSize: RFValue(18),
    textAlign: 'center',
  },
})

const SelectBoundScreen: React.FC = () => {
  const navigation = useNavigation()
  const [
    { station, stations: stationsFromState, desiredDestination },
    setStationState,
  ] = useRecoilState(stationState)

  const [{ trainType, fetchedTrainTypes, autoModeEnabled }, setNavigation] =
    useRecoilState(navigationState)
  const [{ selectedLine }, setLineState] = useRecoilState(lineState)
  const setNavigationState = useSetRecoilState(navigationState)

  const {
    loading,
    error,
    fetchInitialStationList,
    fetchSelectedTrainTypeStations,
  } = useStationList()

  const localType = useMemo(
    () => findLocalType(fetchedTrainTypes),
    [fetchedTrainTypes]
  )

  useFocusEffect(
    useCallback(() => {
      fetchSelectedTrainTypeStations()
    }, [fetchSelectedTrainTypeStations])
  )

  const stations = useMemo<Station.AsObject[]>(() => {
    if (!desiredDestination) {
      return stationsFromState
    }

    const destinationIndex = stationsFromState.findIndex(
      (s) => s.groupId === desiredDestination.groupId
    )
    const currentStationIndex = stationsFromState.findIndex(
      (s) => s.groupId === station?.groupId
    )

    if (currentStationIndex < destinationIndex) {
      return stationsFromState.slice(currentStationIndex, destinationIndex + 1)
    }
    return stationsFromState.slice(destinationIndex, currentStationIndex + 1)
  }, [desiredDestination, station?.groupId, stationsFromState])

  const isYamanoteLine = useMemo(
    () => selectedLine && getIsYamanoteLine(selectedLine.id),
    [selectedLine]
  )
  const isOsakaLoopLine = useMemo(
    () => selectedLine && !trainType && getIsOsakaLoopLine(selectedLine.id),
    [selectedLine, trainType]
  )
  const isMeijoLine = useMemo(
    () => selectedLine && getIsMeijoLine(selectedLine.id),
    [selectedLine]
  )

  // 最初から選択するべき種別がある場合、種別を自動的に変更する
  useFocusEffect(
    useCallback(() => {
      // 普通・各停種別が登録されている場合は初回に選択する
      if (localType && !fetchedTrainTypes.length) {
        setNavigation((prev) => ({
          ...prev,
          trainType: localType,
        }))
        return
      }
      // 支線のみ登録されている場合は登録されている支線を自動選択する
      const branchLineType = findBranchLine(fetchedTrainTypes)
      if (branchLineType && fetchedTrainTypes.length === 1) {
        setNavigation((prev) => ({
          ...prev,
          trainType: branchLineType,
        }))
        return
      }

      // 各停・快速・特急種別がある場合は該当種別を自動選択する
      const trainTypeString = getTrainTypeString(selectedLine, station)
      switch (trainTypeString) {
        case 'local':
          setNavigation((prev) => ({
            ...prev,
            trainType: !prev.trainType
              ? findLocalType(fetchedTrainTypes)
              : prev.trainType,
          }))
          break
        case 'rapid':
          setNavigation((prev) => ({
            ...prev,
            trainType: !prev.trainType
              ? findRapidType(fetchedTrainTypes)
              : prev.trainType,
          }))
          break
        case 'ltdexp':
          setNavigation((prev) => ({
            ...prev,
            trainType: !prev.trainType
              ? findLtdExpType(fetchedTrainTypes)
              : prev.trainType,
          }))
          break
        default:
          break
      }
    }, [fetchedTrainTypes, localType, selectedLine, setNavigation, station])
  )

  // 種別選択ボタンを表示するかのフラグ
  const withTrainTypes = useMemo((): boolean => {
    // 種別が一つも登録されていない駅では種別選択を出来ないようにする
    if (!fetchedTrainTypes.length) {
      return false
    }
    // 種別登録が1件のみで唯一登録されている種別が
    // 支線もしくは普通/各停の種別だけ登録されている場合は種別選択を出来ないようにする
    if (fetchedTrainTypes.length === 1) {
      const branchLineType = findBranchLine(fetchedTrainTypes)
      if (branchLineType || localType) {
        return false
      }
    }
    return true
  }, [fetchedTrainTypes, localType])

  const currentIndex = getCurrentStationIndex(stations, station)

  const inboundStations = useMemo(
    () =>
      inboundStationsForLoopLine(
        stations,
        stations[currentIndex],
        selectedLine
      ),
    [currentIndex, selectedLine, stations]
  )
  const outboundStations = useMemo(
    () =>
      outboundStationsForLoopLine(
        stations,
        stations[currentIndex],
        selectedLine
      ),
    [currentIndex, selectedLine, stations]
  )

  const handleSelectBoundBackButtonPress = useCallback(() => {
    setLineState((prev) => ({
      ...prev,
      selectedLine: null,
    }))
    setStationState((prev) => ({
      ...prev,
      stations: [],
      desiredDestination: null,
    }))
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      trainType: null,
      bottomState: 'LINE',
      leftStations: [],
      stationForHeader: null,
      fetchedTrainTypes: [],
    }))
    navigation.navigate('SelectLine')
  }, [navigation, setLineState, setNavigationState, setStationState])

  const handleBoundSelected = useCallback(
    (selectedStation: Station.AsObject, direction: LineDirection): void => {
      if (!selectedLine) {
        return
      }

      setStationState((prev) => ({
        ...prev,
        selectedBound: selectedStation,
        selectedDirection: direction,
      }))
      navigation.navigate('Main')
    },
    [navigation, selectedLine, setStationState]
  )

  function handleNotificationButtonPress(): void {
    navigation.navigate('Notification')
  }

  const handleTrainTypeButtonPress = (): void => {
    navigation.navigate('TrainType')
  }

  const handleAutoModeButtonPress = useCallback(async () => {
    setNavigation((prev) => ({
      ...prev,
      autoModeEnabled: !prev.autoModeEnabled,
    }))
  }, [setNavigation])

  const handleAllStopsButtonPress = useCallback(() => {
    const stopStations = stations.filter(
      (s) => s.stopCondition !== StopCondition.NOT
    )
    Alert.alert(
      translate('viewStopStations'),
      Array.from(
        new Set(stopStations.map((s) => (isJapanese ? s.name : s.nameRoman)))
      ).join(isJapanese ? '、' : ', ')
    )
  }, [stations])

  const handleSpecifyDestinationButtonPress = useCallback(() => {
    navigation.navigate('SpecifyDestinationSettings')
  }, [navigation])

  const handleDesiredDestinationPress = useCallback(
    (destination: Station.AsObject, direction: LineDirection) => {
      const stationLineIds = stations.map((s) => s.line?.id).filter((id) => id)

      const updatedTrainType: TrainType.AsObject | null = trainType
        ? {
            ...trainType,
            linesList: trainType?.linesList.filter(
              (l, i) => l.id == stationLineIds[i]
            ),
          }
        : null
      setStationState((prev) => ({
        ...prev,
        selectedBound: destination,
        selectedDirection: direction,
        stations,
      }))
      setNavigation((prev) => ({ ...prev, trainType: updatedTrainType }))
      navigation.navigate('Main')
    },
    [navigation, setNavigation, setStationState, stations, trainType]
  )

  const renderButton: React.FC<RenderButtonProps> = useCallback(
    ({ boundStation, direction }: RenderButtonProps) => {
      if (desiredDestination) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === station?.groupId
        )
        const desiredStationIndex = stations.findIndex(
          (s) => s.groupId === desiredDestination.groupId
        )
        const dir =
          currentStationIndex < desiredStationIndex ? 'INBOUND' : 'OUTBOUND'
        if (direction === dir) {
          return (
            <Button
              style={styles.button}
              onPress={() =>
                handleDesiredDestinationPress(desiredDestination, dir)
              }
            >
              {isJapanese
                ? `${desiredDestination.name}方面`
                : `for ${desiredDestination.nameRoman}`}
            </Button>
          )
        }
        return null
      }

      if (!boundStation) {
        return <></>
      }
      const isLoopLine =
        (isYamanoteLine || isOsakaLoopLine || isMeijoLine) && !trainType

      if (direction === 'INBOUND' && !isLoopLine) {
        if (currentIndex === stations.length - 1) {
          return <></>
        }
      } else if (direction === 'OUTBOUND' && !isLoopLine) {
        if (!currentIndex) {
          return <></>
        }
      }
      const directionName = directionToDirectionName(selectedLine, direction)
      let directionText = ''
      if (isLoopLine) {
        if (isJapanese) {
          if (direction === 'INBOUND') {
            directionText = inboundStations
              ? `${directionName}(${inboundStations
                  .map((s) => s.name)
                  .join('・')}方面)`
              : directionName
          } else {
            directionText = outboundStations
              ? `${directionName}(${outboundStations
                  .map((s) => s.name)
                  .join('・')}方面)`
              : directionName
          }
        } else if (direction === 'INBOUND') {
          directionText = inboundStations
            ? `for ${inboundStations.map((s) => s.nameRoman).join(' and ')}`
            : directionName
        } else {
          directionText = outboundStations
            ? `for ${outboundStations.map((s) => s.nameRoman).join(' and ')}`
            : directionName
        }
      } else if (isJapanese) {
        directionText = `${boundStation.map((s) => s.name)}方面`
      } else {
        directionText = `for ${boundStation
          .map((s) => s.nameRoman)
          .join('and')}`
      }
      const boundSelectOnPress = (): void =>
        handleBoundSelected(boundStation[0], direction)
      return (
        <Button
          style={styles.button}
          key={boundStation[0]?.groupId}
          onPress={boundSelectOnPress}
        >
          {directionText}
        </Button>
      )
    },
    [
      currentIndex,
      desiredDestination,
      handleBoundSelected,
      handleDesiredDestinationPress,
      inboundStations,
      isMeijoLine,
      isOsakaLoopLine,
      isYamanoteLine,
      outboundStations,
      selectedLine,
      station?.groupId,
      stations,
      trainType,
    ]
  )

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleSelectBoundBackButtonPress()
        return true
      }
    )
    return subscription.remove
  }, [handleSelectBoundBackButtonPress])

  const autoModeButtonText = `${translate('autoModeSettings')}: ${
    autoModeEnabled ? 'ON' : 'OFF'
  }`

  if (error) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={fetchInitialStationList}
      />
    )
  }

  if (!stations.length || loading) {
    return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <View style={styles.container}>
          <Heading>{translate('selectBoundTitle')}</Heading>
          <ActivityIndicator style={styles.boundLoading} size="large" />
          <View style={styles.buttons}>
            <Button onPress={handleSelectBoundBackButtonPress}>
              {translate('back')}
            </Button>
          </View>

          <Typography style={styles.menuNotice}>
            {translate('menuNotice')}
          </Typography>
        </View>
      </ScrollView>
    )
  }

  const inboundStation = stations[stations.length - 1]
  const outboundStation = stations[0]

  let computedInboundStation: Station.AsObject[] = []
  let computedOutboundStation: Station.AsObject[] = []
  if (isYamanoteLine || (isOsakaLoopLine && !trainType)) {
    computedInboundStation = inboundStations
    computedOutboundStation = outboundStations
  } else {
    computedInboundStation = [inboundStation]
    computedOutboundStation = [outboundStation]
  }

  interface RenderButtonProps {
    boundStation: Station.AsObject[]
    direction: LineDirection
  }

  if (!computedInboundStation || !computedOutboundStation) {
    return null
  }

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <View style={styles.container}>
        <Heading>{translate('selectBoundTitle')}</Heading>

        <View style={styles.horizontalButtons}>
          {renderButton({
            boundStation: isMeijoLine
              ? computedOutboundStation
              : computedInboundStation,
            direction: isMeijoLine ? 'OUTBOUND' : 'INBOUND',
          })}
          {renderButton({
            boundStation: isMeijoLine
              ? computedInboundStation
              : computedOutboundStation,
            direction: isMeijoLine ? 'INBOUND' : 'OUTBOUND',
          })}
        </View>

        <Button onPress={handleSelectBoundBackButtonPress}>
          {translate('back')}
        </Button>
        <Typography style={styles.menuNotice}>
          {translate('menuNotice')}
        </Typography>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 12,
            justifyContent: 'center',
          }}
        >
          <Button onPress={handleNotificationButtonPress}>
            {translate('notifySettings')}
          </Button>
          {withTrainTypes ? (
            <Button onPress={handleTrainTypeButtonPress}>
              {translate('trainTypeSettings')}
            </Button>
          ) : null}
          <Button onPress={handleAllStopsButtonPress}>
            {translate('viewStopStations')}
          </Button>
          {/* NOTE: 処理が複雑になりそこまで需要もなさそうなので環状運転路線では行先を指定できないようにする */}
          {!getIsLoopLine(selectedLine, trainType) ? (
            <Button onPress={handleSpecifyDestinationButtonPress}>
              {translate('selectBoundSettings')}
            </Button>
          ) : null}
          <Button onPress={handleAutoModeButtonPress}>
            {autoModeButtonText}
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

export default SelectBoundScreen
