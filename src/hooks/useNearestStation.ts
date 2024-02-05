import findNearest from 'geolib/es/findNearest'
import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../../gen/proto/stationapi_pb'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'
import { accuracySelector } from '../store/selectors/accuracy'

export const useNearestStation = (): Station | null => {
  const { location } = useRecoilValue(locationState)
  const { stations } = useRecoilValue(stationState)
  const { computeDistanceAccuracy } = useRecoilValue(accuracySelector)

  const nearestWithoutDistance = useMemo(() => {
    if (!location?.coords) {
      return null
    }

    const { latitude, longitude } = location.coords

    const nearestCoordinates = stations.length
      ? (findNearest(
          {
            latitude,
            longitude,
          },
          stations.map((sta) => ({
            latitude: sta.latitude,
            longitude: sta.longitude,
          }))
        ) as { latitude: number; longitude: number })
      : null

    if (!nearestCoordinates) {
      return null
    }

    return stations.find(
      (sta) =>
        sta.latitude === nearestCoordinates.latitude &&
        sta.longitude === nearestCoordinates.longitude
    )
  }, [location?.coords, stations])

  const stationWithDistance = useMemo(
    () =>
      stations.find(
        (sta) =>
          sta?.latitude === nearestWithoutDistance?.latitude &&
          sta?.longitude === nearestWithoutDistance?.longitude
      ),
    [
      nearestWithoutDistance?.latitude,
      nearestWithoutDistance?.longitude,
      stations,
    ]
  )

  const distance = useMemo(() => {
    if (!location?.coords) {
      return null
    }
    const { latitude, longitude } = location.coords
    return (
      getDistance(
        {
          latitude: nearestWithoutDistance?.latitude ?? 0,
          longitude: nearestWithoutDistance?.longitude ?? 0,
        },
        { latitude, longitude },
        computeDistanceAccuracy
      ) ?? 0
    )
  }, [
    computeDistanceAccuracy,
    location?.coords,
    nearestWithoutDistance?.latitude,
    nearestWithoutDistance?.longitude,
  ])

  const nearestStation: Station | null = useMemo(
    () =>
      (stationWithDistance &&
        new Station({
          ...stationWithDistance,
          distance: distance ?? 0,
        })) ??
      null,
    [distance, stationWithDistance]
  )

  return nearestStation
}
