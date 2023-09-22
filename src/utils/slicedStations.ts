import { Line, Station } from '../gen/stationapi_pb'
import getCurrentStationIndex from './currentStationIndex'
import { getIsLoopLine } from './loopLine'

type Args = {
  stations: Station.AsObject[]
  arrived: boolean
  isInbound: boolean
  currentStation: Station.AsObject | null
  currentLine: Line.AsObject | null
  trainType: unknown
}

const getSlicedStations = ({
  stations,
  currentStation,
  currentLine,
  arrived,
  isInbound,
  trainType,
}: Args): Station.AsObject[] => {
  const currentStationIndex = getCurrentStationIndex(stations, currentStation)
  if (arrived) {
    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex + 1).reverse()
  }

  if (getIsLoopLine(currentLine, trainType)) {
    // 山手線 品川 大阪環状線 寺田町
    if (stations.length - 1 === currentStationIndex) {
      return isInbound
        ? stations.slice(currentStationIndex - 1)
        : stations.slice(0, currentStationIndex + 2)
    }
    return isInbound
      ? stations.slice(currentStationIndex - 1)
      : stations.slice(0, currentStationIndex + 2).reverse()
  }

  if (currentStationIndex === 0) {
    return stations.slice(1)
  }

  return isInbound
    ? stations.slice(currentStationIndex)
    : stations.slice(0, currentStationIndex).reverse()
}

export default getSlicedStations
