import { useCallback, useEffect, useMemo } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import themeState from '../store/atoms/theme'
import getCurrentStationIndex from '../utils/currentStationIndex'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import getIsPass from '../utils/isPass'
import { useCurrentLine } from './useCurrentLine'
import useCurrentTrainType from './useCurrentTrainType'
import { useLoopLine } from './useLoopLine'

const useRefreshLeftStations = (): void => {
  const {
    station: normalStation,
    stations: normalStations,
    selectedDirection,
  } = useRecoilValue(stationState)
  const setNavigation = useSetRecoilState(navigationState)
  const { theme } = useRecoilValue(themeState)
  const selectedLine = useCurrentLine()
  const trainType = useCurrentTrainType()
  const { isOsakaLoopLine, isYamanoteLine, isMeijoLine } = useLoopLine()

  const stations = useMemo(
    () =>
      dropEitherJunctionStation(
        theme === APP_THEME.JR_WEST || theme === APP_THEME.LED
          ? normalStations.filter((s) => !getIsPass(s))
          : normalStations,
        selectedDirection
      ),
    [normalStations, selectedDirection, theme]
  )
  const station = useMemo(() => {
    if (theme === APP_THEME.JR_WEST || theme === APP_THEME.LED) {
      // JRWもしくはLEDテーマでは通過駅を表示しないので、
      // 通過駅を通過する際に駅情報のアプデを行わない
      if (getIsPass(normalStation)) {
        return
      }
      const normalStationIndex = normalStations.findIndex(
        (s) => s.groupId === normalStation?.groupId
      )
      const lastStoppedStation = normalStations.find(
        (s, i) => normalStationIndex <= i && !getIsPass(s)
      )
      return lastStoppedStation
    }
    return normalStation
  }, [normalStation, normalStations, theme])

  const getStationsForLoopLine = useCallback(
    (currentStationIndex: number): Station.AsObject[] => {
      if (!selectedLine) {
        return []
      }

      switch (selectedDirection) {
        case 'INBOUND': {
          if (currentStationIndex === 0) {
            // 山手線は折り返す
            return [stations[0], ...stations.slice().reverse().slice(0, 7)]
          }

          // 環状線表示駅残り少ない
          const inboundPendingStations = stations
            .slice(
              currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
              currentStationIndex + 1
            )
            .reverse()
          // 山手線と大阪環状線はちょっと処理が違う
          if (currentStationIndex < 7 && isOsakaLoopLine) {
            const nextStations = stations
              .slice()
              .reverse()
              .slice(currentStationIndex - 1, 7)
            return [...inboundPendingStations, ...nextStations]
          }

          if ((currentStationIndex < 7 && isYamanoteLine) || isMeijoLine) {
            const nextStations = stations
              .slice()
              .reverse()
              .slice(0, -(inboundPendingStations.length - 8))
            return [...inboundPendingStations, ...nextStations]
          }
          return inboundPendingStations
        }
        case 'OUTBOUND': {
          // 環状線折返し駅
          if (currentStationIndex === stations.length - 1) {
            // 山手線は折り返す
            return [stations[currentStationIndex], ...stations.slice(0, 7)]
          }

          const outboundPendingStationCount =
            stations.length - currentStationIndex - 1
          // 環状線表示駅残り少ない
          if (outboundPendingStationCount < 7) {
            return [
              ...stations.slice(currentStationIndex),
              ...stations.slice(0, 7 - outboundPendingStationCount),
            ]
          }

          return stations.slice(currentStationIndex, currentStationIndex + 8)
        }
        default:
          return []
      }
    },
    [
      isMeijoLine,
      isOsakaLoopLine,
      isYamanoteLine,
      selectedDirection,
      selectedLine,
      stations,
    ]
  )

  const getStations = useCallback(
    (currentStationIndex: number): Station.AsObject[] => {
      switch (selectedDirection) {
        case 'INBOUND': {
          const slicedStations = stations.slice(
            currentStationIndex,
            stations.length
          )

          if (slicedStations.length < 8 && stations.length > 8) {
            return stations.slice(stations.length - 8, stations.length)
          }
          return slicedStations
        }
        case 'OUTBOUND': {
          if (currentStationIndex === stations.length) {
            return stations.slice(currentStationIndex > 7 ? 7 : 0, 7).reverse()
          }

          const slicedStations = stations
            .slice(0, currentStationIndex + 1)
            .reverse()

          if (slicedStations.length < 8) {
            return stations.slice(0, 8).reverse()
          }
          return slicedStations
        }
        default:
          return []
      }
    },
    [selectedDirection, stations]
  )

  const loopLine = useMemo(() => {
    if (!selectedLine) {
      return false
    }

    if (isOsakaLoopLine && trainType) {
      return false
    }
    return isYamanoteLine || isOsakaLoopLine || isMeijoLine
  }, [isMeijoLine, isOsakaLoopLine, isYamanoteLine, selectedLine, trainType])

  useEffect(() => {
    if (!station) {
      return
    }
    const currentIndex = getCurrentStationIndex(stations, station)
    const leftStations =
      loopLine && !trainType
        ? getStationsForLoopLine(currentIndex)
        : getStations(currentIndex)
    setNavigation((prev) => {
      const isChanged = leftStations[0]?.id !== prev.leftStations[0]?.id
      if (!isChanged) {
        return prev
      }
      return {
        ...prev,
        leftStations,
      }
    })
  }, [
    selectedDirection,
    getStations,
    getStationsForLoopLine,
    loopLine,
    selectedLine,
    setNavigation,
    station,
    stations,
    trainType,
  ])
}

export default useRefreshLeftStations
