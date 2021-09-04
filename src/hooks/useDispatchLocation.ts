import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useSetRecoilState } from 'recoil';
import locationState from '../store/atoms/location';

const useDispatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();
  const setLocation = useSetRecoilState(locationState);

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const granted = status === Location.PermissionStatus.GRANTED;
        if (granted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation((prev) => ({
            ...prev,
            location,
          }));
        }
      } catch (err) {
        const location = await Location.getLastKnownPositionAsync({
          maxAge: 1000,
        });
        if (location) {
          setLocation((prev) => ({
            ...prev,
            location,
          }));
          return;
        }

        setError(err);
      }
    };
    f();
  }, [setLocation]);
  return [error];
};

export default useDispatchLocation;
