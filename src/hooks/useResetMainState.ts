import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import { LOCATION_TASK_NAME } from '../constants';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';

const useResetMainState = (): (() => void) => {
  const setNavigation = useSetRecoilState(navigationState);
  const setStation = useSetRecoilState(stationState);
  const setSpeech = useSetRecoilState(speechState);
  const navigation = useNavigation();

  const reset = useCallback(() => {
    Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    setNavigation((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }));
    setStation((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
    }));
    setSpeech((prev) => ({
      ...prev,
      muted: true,
    }));
    navigation.navigate('SelectBound');
  }, [navigation, setNavigation, setSpeech, setStation]);

  return reset;
};

export default useResetMainState;
