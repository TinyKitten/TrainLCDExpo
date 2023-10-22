import { useCallback, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
  GetStationByLineIdRequest,
  GetStationsByLineGroupIdRequest,
  GetTrainTypesByStationIdRequest,
  TrainDirection,
  TrainTypeKind,
} from '../gen/stationapi_pb'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { findBranchLine, findLocalType } from '../utils/trainTypeString'
import useGRPC from './useGRPC'
import { getDeadline } from '../utils/deadline'

const useStationList = (
  fetchAutomatically = true
): {
  fetchInitialStationList: () => Promise<void>
  fetchSelectedTrainTypeStations: () => Promise<void>
  loading: boolean
  error: Error | null
} => {
  const [{ stations }, setStationState] = useRecoilState(stationState)
  const [{ trainType, fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState)
  const { selectedLine } = useRecoilValue(lineState)
  const grpcClient = useGRPC()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrainTypes = useCallback(async () => {
    try {
      const req = new GetTrainTypesByStationIdRequest()
      if (selectedLine?.station?.id) {
        req.setStationId(selectedLine?.station.id)
      }
      const deadline = getDeadline()
      const trainTypesRes = (
        await grpcClient?.getTrainTypesByStationId(req, {
          deadline,
        })
      )?.toObject()

      if (!trainTypesRes) {
        return
      }

      const trainTypesList = trainTypesRes?.trainTypesList ?? []

      // 普通種別が登録済み: 非表示
      // 支線種別が登録されていているが、普通種別が登録されていない: 非表示
      // 特例で普通列車以外の種別で表示を設定されている場合(中央線快速等): 表示
      // 上記以外: 表示
      if (
        !(
          findLocalType(trainTypesList) ||
          (findBranchLine(trainTypesList) && !findLocalType(trainTypesList))
        )
      ) {
        setNavigationState((prev) => ({
          ...prev,
          fetchedTrainTypes: [
            {
              id: 0,
              typeId: 0,
              groupId: 0,
              name: '普通/各駅停車',
              nameKatakana: '',
              nameRoman: 'Local',
              nameChinese: '慢车/每站停车',
              nameKorean: '보통/각역정차',
              color: '',
              linesList: [],
              direction: TrainDirection.BOTH,
              kind: TrainTypeKind.DEFAULT,
            },
          ],
        }))
      }

      setNavigationState((prev) => ({
        ...prev,
        fetchedTrainTypes: [
          ...prev.fetchedTrainTypes,
          ...trainTypesRes.trainTypesList,
        ],
      }))

      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [grpcClient, selectedLine, setNavigationState])

  const fetchInitialStationList = useCallback(async () => {
    const lineId = selectedLine?.id
    if (!lineId || !selectedLine?.station) {
      return
    }

    setLoading(true)
    try {
      const req = new GetStationByLineIdRequest()
      req.setLineId(lineId)
      req.setStationId(selectedLine.station?.id)
      const deadline = getDeadline()
      const data = (
        await grpcClient?.getStationsByLineId(req, {
          deadline,
        })
      )?.toObject()

      if (!data) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        stations: data.stationsList,
        allStations: data.stationsList,
      }))

      if (selectedLine?.station?.hasTrainTypes) {
        await fetchTrainTypes()
      }
      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [
    fetchTrainTypes,
    grpcClient,
    selectedLine?.id,
    selectedLine?.station,
    setStationState,
  ])

  const fetchSelectedTrainTypeStations = useCallback(async () => {
    if (!trainType?.groupId || !fetchedTrainTypes.length) {
      return
    }
    setLoading(true)

    try {
      const req = new GetStationsByLineGroupIdRequest()
      req.setLineGroupId(trainType?.groupId)
      const deadline = getDeadline()
      const data = (
        await grpcClient?.getStationsByLineGroupId(req, {
          deadline,
        })
      )?.toObject()

      if (!data) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        stations: data.stationsList,
        allStations: data.stationsList,
      }))

      setLoading(false)
    } catch (err) {
      setError(err as any)
      setLoading(false)
    }
  }, [
    fetchedTrainTypes.length,
    grpcClient,
    setStationState,
    trainType?.groupId,
  ])

  useEffect(() => {
    if (!stations.length && fetchAutomatically) {
      fetchInitialStationList()
    }
  }, [fetchAutomatically, fetchInitialStationList, stations.length])

  return {
    fetchInitialStationList,
    fetchSelectedTrainTypeStations,
    loading,
    error,
  }
}

export default useStationList
