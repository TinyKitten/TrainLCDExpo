import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { LED_THEME_BG_COLOR } from '../constants/color'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import useTrainTypeLabels from '../hooks/useTrainTypeLabels'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import useStationList from '../hooks/useStationList'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
})

const TrainTypeSettings: React.FC = () => {
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)
  const { selectedLine } = useRecoilValue(lineState)

  const navigation = useNavigation()
  const isLEDTheme = useIsLEDTheme()
  const { fetchSelectedTrainTypeStations } = useStationList()

  const trainTypeLabels = useTrainTypeLabels(fetchedTrainTypes)

  const items = useMemo(
    () =>
      fetchedTrainTypes.map((tt, idx) => ({
        label: trainTypeLabels[idx] ?? '',
        value: tt.id,
      })) ?? [],
    [fetchedTrainTypes, trainTypeLabels]
  )

  const onPressBack = useCallback(async () => {
    await fetchSelectedTrainTypeStations()

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [fetchSelectedTrainTypeStations, navigation])

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onPressBack()
      return true
    })
    return (): void => {
      handler.remove()
    }
  }, [onPressBack])

  const handleTrainTypeChange = useCallback(
    (trainTypeId: number) => {
      if (trainTypeId === 0) {
        setNavigationState((prev) => ({
          ...prev,
          trainType: null,
        }))
        setStationState((prev) => ({
          ...prev,
          stations: [],
        }))
        return
      }

      const selectedTrainType = fetchedTrainTypes?.find(
        (tt) => tt.id === trainTypeId
      )
      if (!selectedTrainType) {
        return
      }

      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedTrainType,
      }))
      // 種別が変わるとすでに選択していた行先が停車駅に存在しない場合があるのでリセットする
      setStationState((prev) => ({
        ...prev,
        wantedDestination: null,
      }))
    },
    [fetchedTrainTypes, setNavigationState, setStationState]
  )

  const numberOfLines = useMemo(
    () =>
      items
        .map((item) => item.label.split('\n').length)
        .reduce((a, b) => Math.max(a, b), 0),
    [items]
  )

  if (!items.length) {
    return (
      <View style={styles.root}>
        <Heading>{translate('trainTypeSettings')}</Heading>
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
        <FAB onPress={onPressBack} icon="md-checkmark" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>
      <Picker
        selectedValue={trainType?.id ?? selectedLine?.station?.trainType?.id}
        onValueChange={handleTrainTypeChange}
        numberOfLines={numberOfLines}
        dropdownIconColor={isLEDTheme ? '#fff' : '#000'}
      >
        {items.map((it) => (
          <Picker.Item
            color={isLEDTheme ? '#fff' : '#000'}
            style={{
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined,
            }}
            key={it.value}
            label={it.label}
            value={it.value}
          />
        ))}
      </Picker>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  )
}

export default TrainTypeSettings
