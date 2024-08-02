import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import { APP_THEME } from '../models/Theme'
import stationState from '../store/atoms/station'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation'
import { useCurrentStation } from './useCurrentStation'
import { useLoopLine } from './useLoopLine'
import { useThemeStore } from './useThemeStore'

export const useNextStation = (
  ignorePass = true,
  originStation?: Station
): Station | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useRecoilValue(stationState)
  const theme = useThemeStore()
  const currentStation = useCurrentStation(
    theme === APP_THEME.JR_WEST || theme === APP_THEME.LED
  )
  const { isLoopLine } = useLoopLine()

  const station = useMemo(
    () => originStation ?? currentStation,
    [originStation, currentStation]
  )

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  )

  const actualNextStation = useMemo(() => {
    if (isLoopLine) {
      const loopLineStationIndex =
        selectedDirection === 'INBOUND'
          ? stations.findIndex((s) => s?.groupId === station?.groupId) - 1
          : stations.findIndex((s) => s?.groupId === station?.groupId) + 1

      if (!stations[loopLineStationIndex]) {
        return stations[
          selectedDirection === 'INBOUND' ? stations.length - 1 : 0
        ]
      }

      return stations[loopLineStationIndex]
    }

    const notLoopLineStationIndex =
      selectedDirection === 'INBOUND'
        ? stations.findIndex((s) => s?.groupId === station?.groupId) + 1
        : stations.findIndex((s) => s?.groupId === station?.groupId) - 1

    return stations[notLoopLineStationIndex]
  }, [isLoopLine, selectedDirection, station?.groupId, stations])

  const nextInboundStopStation = useMemo(
    () =>
      actualNextStation &&
      station &&
      getNextInboundStopStation(
        stations,
        actualNextStation,
        station,
        ignorePass
      ),
    [actualNextStation, ignorePass, station, stations]
  )

  const nextOutboundStopStation = useMemo(
    () =>
      actualNextStation &&
      station &&
      getNextOutboundStopStation(
        stations,
        actualNextStation,
        station,
        ignorePass
      ),
    [actualNextStation, ignorePass, station, stations]
  )

  return (
    (selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation) ?? undefined
  )
}
