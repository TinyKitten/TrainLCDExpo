import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import navigationState from '../store/atoms/navigation'
import { getIsLocal } from '../utils/trainTypeString'
import useNextTrainType from './useNextTrainType'

export const useTypeWillChange = (): boolean => {
  const { trainType } = useRecoilValue(navigationState)
  const nextTrainType = useNextTrainType()

  const nextTrainTypeIsDifferent = useMemo(() => {
    if (!trainType || !nextTrainType) {
      return false
    }

    if (trainType.typeId === nextTrainType.typeId) {
      return false
    }

    if (getIsLocal(trainType) && getIsLocal(nextTrainType)) {
      return false
    }

    return trainType?.typeId !== nextTrainType?.typeId
  }, [nextTrainType, trainType])

  return nextTrainTypeIsDifferent
}
