import * as Notifications from 'expo-notifications';
import * as geolib from 'geolib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Vibration } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { GET_DISTANCE_ACCURACY } from '../constants/location';
import { LineType, Station } from '../models/StationAPI';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import { getAvgStationBetweenDistances } from '../utils/stationDistance';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold';
import useCurrentLine from './useCurrentLine';

type NotifyType = 'ARRIVING' | 'APPROACHING';

const useRefreshStation = (): void => {
  const [{ station, stations, selectedBound, selectedDirection }, setStation] =
    useRecoilState(stationState);
  const { location } = useRecoilValue(locationState);
  const [{ leftStations }, setNavigation] = useRecoilState(navigationState);
  const displayedNextStation = getNextStation(leftStations, station);
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);

  const currentLine = useCurrentLine();

  const isArrived = useCallback(
    (nearestStation: Station, avgDistance: number): boolean => {
      if (!nearestStation) {
        return false;
      }
      const ARRIVED_THRESHOLD = getArrivedThreshold(
        currentLine?.lineType,
        avgDistance
      );
      return (nearestStation.distance || 0) < ARRIVED_THRESHOLD;
    },
    [currentLine?.lineType]
  );

  const isApproaching = useCallback(
    (nearestStation: Station, avgDistance: number): boolean => {
      if (!displayedNextStation || !nearestStation) {
        return false;
      }
      const APPROACHING_THRESHOLD = getApproachingThreshold(
        currentLine?.lineType,
        avgDistance
      );
      // 一番近い駅が通過駅で、次の駅が停車駅の場合、
      // 一番近い駅に到着（通過）した時点でまもなく扱いにする
      const isNextStationIsNextStop =
        displayedNextStation?.id !== nearestStation.id &&
        getIsPass(nearestStation) &&
        !getIsPass(displayedNextStation);
      if (
        isNextStationIsNextStop &&
        currentLine?.lineType !== LineType.BulletTrain
      ) {
        return true;
      }

      const nearestStationIndex = stations.findIndex(
        (s) => s.id === nearestStation.id
      );
      const nextStationIndex = stations.findIndex(
        (s) => s.id === displayedNextStation?.id
      );
      const isNearestStationLaterThanCurrentStop =
        selectedDirection === 'INBOUND'
          ? nearestStationIndex >= nextStationIndex
          : nearestStationIndex <= nextStationIndex;

      // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
      // APPROACHING_THRESHOLDより近い: まもなく
      return (
        (nearestStation.distance || 0) < APPROACHING_THRESHOLD &&
        isNearestStationLaterThanCurrentStop
      );
    },
    [displayedNextStation, selectedDirection, currentLine?.lineType, stations]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        Vibration.vibrate();
        Alert.alert(
          notification.request.content.title || '',
          notification.request.content.body || ''
        );
      }
    );
    return () => subscription.remove();
  }, []);

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const approachingText = isJapanese
        ? `まもなく、${s.name}駅です。`
        : `Arriving at ${s.nameR} station.`;
      const arrivedText = isJapanese
        ? `ただいま、${s.name}駅に到着しました。`
        : `Now stopping at ${s.nameR} station.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: isJapanese ? 'お知らせ' : 'Announcement',
          body: notifyType === 'APPROACHING' ? approachingText : arrivedText,
          sound: true,
        },
        trigger: null,
      });
    },
    []
  );

  const scoredStations = useMemo((): Station[] => {
    if (location && selectedBound) {
      const { latitude, longitude } = location.coords;

      const scored = stations.map((s) => {
        const distance = geolib.getDistance(
          { latitude, longitude },
          { latitude: s.latitude, longitude: s.longitude },
          GET_DISTANCE_ACCURACY
        );
        return { ...s, distance };
      });
      scored.sort((a, b) => {
        if (a.distance < b.distance) {
          return -1;
        }
        if (a.distance > b.distance) {
          return 1;
        }
        return 0;
      });
      return scored as Station[];
    }
    return [];
  }, [location, selectedBound, stations]);

  const nearestStation = useMemo(() => scoredStations[0], [scoredStations]);
  const avg = useMemo(
    () => getAvgStationBetweenDistances(stations),
    [stations]
  );

  useEffect(() => {
    if (!nearestStation) {
      return;
    }

    const arrived = isArrived(nearestStation, avg);
    const approaching = isApproaching(nearestStation, avg);

    setStation((prev) => ({
      ...prev,
      scoredStations,
      arrived,
      approaching,
    }));

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation?.id
    );

    if (isNearestStationNotifyTarget) {
      if (approaching && nearestStation?.id !== approachingNotifiedId) {
        sendApproachingNotification(nearestStation, 'APPROACHING');
        setApproachingNotifiedId(nearestStation?.id);
      }
      if (arrived && nearestStation?.id !== arrivedNotifiedId) {
        sendApproachingNotification(nearestStation, 'ARRIVING');
        setArrivedNotifiedId(nearestStation?.id);
      }
    }

    if (arrived) {
      setStation((prev) => ({
        ...prev,
        station: nearestStation,
      }));
      if (!getIsPass(nearestStation)) {
        setNavigation((prev) => ({
          ...prev,
          stationForHeader: nearestStation,
        }));
      }
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    avg,
    isApproaching,
    isArrived,
    nearestStation,
    scoredStations,
    sendApproachingNotification,
    setNavigation,
    setStation,
    targetStationIds,
  ]);
};

export default useRefreshStation;
