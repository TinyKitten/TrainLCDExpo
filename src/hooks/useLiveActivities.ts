import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../nativeUtils/liveActivityModule';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import useNextStation from './useNextStation';
import useNumbering from './useNumbering';

const useLiveActivities = (): void => {
  const { headerState } = useRecoilValue(navigationState);
  const { station } = useRecoilValue(stationState);

  const nextStation = useNextStation();
  const [currentNumbering] = useNumbering(true);
  const [nextNumbering] = useNumbering();

  useEffect((): (() => void) => {
    const initialState = {
      stationName: station?.name ?? '',
      nextStationName: nextStation?.name ?? '',
      stationNumber: '',
      nextStationNumber: '',
      runningState: headerState,
      stopping: headerState.startsWith('CURRENT'),
    };
    startLiveActivity(initialState);

    return () => stopLiveActivity(initialState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateLiveActivity({
      stationName: isJapanese ? station?.name ?? '' : station?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: currentNumbering?.stationNumber || '',
      nextStationNumber: nextNumbering?.stationNumber || '',
      runningState: headerState,
      stopping: headerState.startsWith('CURRENT'),
    });
  }, [
    currentNumbering?.stationNumber,
    headerState,
    nextNumbering?.stationNumber,
    nextStation?.name,
    nextStation?.nameR,
    station?.name,
    station?.nameR,
  ]);
};

export default useLiveActivities;
