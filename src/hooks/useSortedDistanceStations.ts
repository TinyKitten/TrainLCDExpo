import * as geolib from 'geolib'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { COMPUTE_DISTANCE_ACCURACY } from '../constants/location'
import { Station } from '../models/StationAPI'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'

const useSortedDistanceStations = (): Station[] => {
  const { location } = useRecoilValue(locationState)
  const { stations, selectedBound } = useRecoilValue(stationState)

  const scoredStations = useMemo((): Station[] => {
    if (location && selectedBound) {
      const { latitude, longitude } = location.coords

      const scored = stations.map((s) => {
        const distance = geolib.getDistance(
          { latitude, longitude },
          { latitude: s.latitude, longitude: s.longitude },
          COMPUTE_DISTANCE_ACCURACY
        )
        return { ...s, distance }
      })
      scored.sort((a, b) => {
        if (a.distance < b.distance) {
          return -1
        }
        if (a.distance > b.distance) {
          return 1
        }
        return 0
      })
      return scored as Station[]
    }
    return []
  }, [location, selectedBound, stations])

  return scoredStations
}

export default useSortedDistanceStations
