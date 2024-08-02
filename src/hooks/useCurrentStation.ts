import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'

export const useCurrentStation = (
  skipPassStation = false,
  withTrainTypes = false
) => {
  const {
    stations,
    station: stationFromState,
    selectedDirection,
  } = useRecoilValue(stationState)

  // NOTE: 選択した路線と現在の駅の路線を一致させる
  const station = useMemo(
    () => stations.find((s) => s.id === stationFromState?.id) ?? null,
    [stationFromState?.id, stations]
  )

  const withTrainTypeStation = useMemo(() => {
    const foundStation = stations
      .filter((s) => (skipPassStation ? !getIsPass(s) : true))
      .find((rs) => rs.id === station?.id)
    if (foundStation) {
      return foundStation
    }

    const reversedStations =
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse()

    const curIndex = reversedStations.findIndex((s) => s.id === station?.id)
    const stationsFromRange = reversedStations
      .slice(0, curIndex)
      .filter((s) => (skipPassStation ? !getIsPass(s) : true))
    return stationsFromRange[stationsFromRange.length - 1] ?? null
  }, [selectedDirection, skipPassStation, station?.id, stations])

  if (skipPassStation || withTrainTypes) {
    return withTrainTypeStation
  }

  // NOTE: 路線が選択されていない場合stationはnullishになる
  return station ?? stationFromState
}