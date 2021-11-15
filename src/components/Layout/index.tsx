import { connectActionSheet } from '@expo/react-native-action-sheet';
import { useNetInfo } from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import useDispatchLocation from '../../hooks/useDispatchLocation';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import { translate } from '../../translation';
import ErrorScreen from '../ErrorScreen';
import Permitted from './Permitted';

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }: Props) => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [{ requiredPermissionGranted }, setNavigation] =
    useRecoilState(navigationState);
  const setLocation = useSetRecoilState(locationState);
  const { station } = useRecoilValue(stationState);
  const [fetchLocationFailed] = useDispatchLocation();
  const [locationErrorDismissed, setLocationErrorDismissed] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
      setNavigation((prev) => ({
        ...prev,
        requiredPermissionGranted: granted,
      }));
      setIsPermissionGranted(granted);
    };
    f();
  }, [setNavigation]);

  const handleRefreshPress = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setLocation((prev) => ({
        ...prev,
        location,
      }));
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ]);
    }
  }, [setLocation]);

  const handleRecoverLocationError = () => {
    navigate('FakeStation');
    setLocationErrorDismissed(true);
  };

  const { isInternetReachable } = useNetInfo();

  // isInternetReachable: If the internet is reachable with the currently active network connection. If unknown defaults to null
  if (isInternetReachable === false && !station) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('offlineText')}
      />
    );
  }

  if (fetchLocationFailed && !locationErrorDismissed) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={handleRefreshPress}
        onRecoverErrorPress={handleRecoverLocationError}
        recoverable
      />
    );
  }

  if (requiredPermissionGranted || isPermissionGranted) {
    return <Permitted>{children}</Permitted>;
  }

  return <>{children}</>;
};

export default connectActionSheet(Layout);
