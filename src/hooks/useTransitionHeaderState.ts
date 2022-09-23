import { useEffect, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import useValueRef from './useValueRef';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useTransitionHeaderState = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const [{ headerState, leftStations, enabledLanguages }, setNavigation] =
    useRecoilState(navigationState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const headerStateRef = useValueRef(headerState);

  useEffect(() => {
    return (): void => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const nextStationRef = useRef(getNextStation(leftStations, station));
  const showNextExpressionRef = useRef(
    !!nextStationRef.current && !arrived && !approaching
  );
  const isCurrentStationExtraLangAvailableRef = useRef(
    station?.nameZh?.length && station?.nameKo?.length
  );
  const isNextStationExtraLangAvailableREf = useRef(
    nextStationRef.current?.nameZh?.length &&
      nextStationRef.current?.nameKo?.length
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const currentHeaderState = headerStateRef.current.split(
        '_'
      )[0] as HeaderState;
      const currentHeaderStateLang =
        (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA';
      const currentLangIndex = enabledLanguages.indexOf(
        currentHeaderStateLang !== 'KANA' ? currentHeaderStateLang : 'JA'
      );
      const nextLang =
        currentLangIndex !== -1 ? enabledLanguages[currentLangIndex + 1] : null;

      switch (currentHeaderState) {
        case 'CURRENT': {
          if (showNextExpressionRef.current) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
            break;
          }
          switch (currentHeaderStateLang) {
            case 'JA':
              setNavigation((prev) => ({
                ...prev,
                headerState: 'CURRENT_KANA',
              }));
              break;
            default:
              if (getIsPass(station)) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'NEXT',
                }));
                break;
              }
              if (
                !nextLang ||
                (nextLang !== 'EN' &&
                  !isCurrentStationExtraLangAvailableRef.current)
              ) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'CURRENT',
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `CURRENT_${nextLang}` as HeaderTransitionState,
              }));
              break;
          }
          break;
        }
        case 'NEXT': {
          switch (currentHeaderStateLang) {
            case 'JA':
              setNavigation((prev) => ({
                ...prev,
                headerState: 'NEXT_KANA',
              }));
              break;
            default:
              if (
                !nextLang ||
                (nextLang !== 'EN' &&
                  !isNextStationExtraLangAvailableREf.current)
              ) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'NEXT',
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `NEXT_${nextLang}` as HeaderTransitionState,
              }));
              break;
          }
          break;
        }
        default:
          break;
      }
    }, HEADER_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [enabledLanguages, headerStateRef, setNavigation, station]);
};

export default useTransitionHeaderState;
