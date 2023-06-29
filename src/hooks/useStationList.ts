import { useCallback, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import {
  GetStationByLineIdRequest,
  StationResponse,
} from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import useConnectivity from './useConnectivity'
import useGRPC from './useGRPC'

const useStationList = (): [
  (lineId: number) => void,
  boolean,
  Error | null
] => {
  const setStation = useSetRecoilState(stationState)
  const grpcClient = useGRPC()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isInternetAvailable = useConnectivity()

  const fetchStationList = useCallback(
    async (lineId: number) => {
      if (!isInternetAvailable) {
        return
      }
      try {
        const req = new GetStationByLineIdRequest()
        req.setLineId(lineId)
        const data = (
          await grpcClient?.getStationsByLineId(req, null)
        )?.toObject()

        if (data) {
          setStation((prev) => ({
            ...prev,
            stations: data.stationsList
              .filter((s) => !!s)
              .map((s) => s.station as StationResponse.AsObject),
            // 再帰的にTrainTypesは取れないのでバックアップしておく
            stationsWithTrainTypes: data.stationsList
              .filter((s) => !!s)
              .map((s) => s.station as StationResponse.AsObject),
          }))
        }
        setLoading(false)
      } catch (err) {
        setError(err as any)
        setLoading(false)
      }
    },
    [isInternetAvailable, grpcClient, setStation]
  )

  return [fetchStationList, loading, error]
}

export default useStationList
