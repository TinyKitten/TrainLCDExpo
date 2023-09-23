import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese } from '../translation'
import useMirroringShare from './useMirroringShare'

const useResetMainState = (
  shouldUnsubscribeMirroringShare = true
): (() => void) => {
  const setNavigationState = useSetRecoilState(navigationState)
  const setStationState = useSetRecoilState(stationState)
  const { unsubscribe: unsubscribeMirroringShare } = useMirroringShare()

  const reset = useCallback(async () => {
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }))
    setStationState((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
    }))
  }, [setNavigationState, setStationState])

  return reset
}

export default useResetMainState
