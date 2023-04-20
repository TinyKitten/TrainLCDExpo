import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import sendNotificationAsync from '../utils/native/sensitiveNotificationMoudle';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold';
import useAverageDistance from './useAverageDistance';
import useCanGoForward from './useCanGoForward';
import useCurrentLine from './useCurrentLine';
import useSortedDistanceStations from './useSortedDistanceStations';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';

type NotifyType = 'ARRIVED' | 'APPROACHING';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const useRefreshStation = (): void => {
  const [{ station, stations, selectedDirection }, setStation] =
    useRecoilState(stationState);
  const [{ leftStations }, setNavigation] = useRecoilState(navigationState);
  const displayedNextStation = station && getNextStation(leftStations, station);
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);

  const sortedStations = useSortedDistanceStations();
  const currentLine = useCurrentLine();
  const canGoForward = useCanGoForward();
  const getStationNumberIndex = useStationNumberIndexFunc();

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

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s.stationNumbers);
      const stationNumber = s.stationNumbers[stationNumberIndex]?.stationNumber;
      const stationNumberMaybeEmpty = `${
        stationNumber ? `(${stationNumber})` : ''
      }`;
      const approachingText = isJapanese
        ? `まもなく、${s.name}${stationNumberMaybeEmpty}に到着します。`
        : `Arriving at ${s.nameR}${stationNumberMaybeEmpty}.`;
      const arrivedText = isJapanese
        ? `ただいま、${s.name}${stationNumberMaybeEmpty}に到着しました。`
        : `Now stopping at ${s.nameR}${stationNumberMaybeEmpty}.`;

      await sendNotificationAsync({
        title: isJapanese ? 'お知らせ' : 'Announcement',
        body: notifyType === 'APPROACHING' ? approachingText : arrivedText,
      });
    },
    [getStationNumberIndex]
  );

  const avg = useAverageDistance();

  useEffect(() => {
    const nearestStation = sortedStations[0];

    if (!nearestStation || !canGoForward) {
      return;
    }

    const arrived = isArrived(nearestStation, avg);
    const approaching = isApproaching(nearestStation, avg);

    setStation((prev) => ({
      ...prev,
      sortedStations,
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
        sendApproachingNotification(nearestStation, 'ARRIVED');
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
    canGoForward,
    isApproaching,
    isArrived,
    sendApproachingNotification,
    setNavigation,
    setStation,
    sortedStations,
    targetStationIds,
  ]);
};

export default useRefreshStation;
