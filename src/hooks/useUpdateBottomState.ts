import { useCallback, useEffect, useRef, useState } from 'react';
<<<<<<< HEAD
import { useRecoilState, useRecoilValue } from 'recoil';
=======
import { useRecoilState } from 'recoil';
import { BOTTOM_CONTENT_TRANSITION_INTERVAL } from '../constants';
>>>>>>> parent of ea8b66f2 (作業漏れ対応)
import navigationState from '../store/atoms/navigation';
import tuningState from '../store/atoms/tuning';
import useNextTrainTypeIsDifferent from './useNextTrainTypeIsDifferent';
import useShouldHideTypeChange from './useShouldHideTypeChange';
import useTransferLines from './useTransferLines';
import useValueRef from './useValueRef';

const useUpdateBottomState = (): { pause: () => void } => {
  const [timerPaused, setTimerPaused] = useState(false);
  const [{ bottomState }, setNavigation] = useRecoilState(navigationState);
  const { bottomTransitionInterval } = useRecoilValue(tuningState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const bottomStateRef = useValueRef(bottomState);
  const timerPausedRef = useValueRef(timerPaused);
  const pausedTimerRef = useRef<NodeJS.Timer>();

  useEffect(() => {
    return (): void => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const nextTrainTypeIsDifferent = useNextTrainTypeIsDifferent();
  const nextTrainTypeIsDifferentRef = useValueRef(nextTrainTypeIsDifferent);

  const transferLines = useTransferLines();
  const transferLinesRef = useValueRef(transferLines);

  const pause = useCallback(() => {
    if (pausedTimerRef.current) {
      clearTimeout(pausedTimerRef.current);
    }
    setTimerPaused(true);
    pausedTimerRef.current = setTimeout(() => {
      setTimerPaused(false);
    }, bottomTransitionInterval);
  }, [bottomTransitionInterval]);

  useEffect(() => {
    if (!transferLines.length) {
      setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
    }
  }, [setNavigation, transferLines.length]);

  const shouldHideTypeChange = useShouldHideTypeChange();
  const shouldHideTypeChangeRef = useRef(shouldHideTypeChange);

<<<<<<< HEAD
  useEffect(() => {
=======
  const updateFunc = useCallback(() => {
>>>>>>> parent of ea8b66f2 (作業漏れ対応)
    const interval = setInterval(() => {
      if (timerPausedRef.current) {
        return;
      }
      switch (bottomStateRef.current) {
        case 'LINE':
          if (transferLinesRef.current.length) {
            setNavigation((prev) => ({ ...prev, bottomState: 'TRANSFER' }));
            return;
          }
          if (
            nextTrainTypeIsDifferentRef.current &&
            !shouldHideTypeChangeRef.current
          ) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          }
          break;
        case 'TRANSFER':
          if (
            nextTrainTypeIsDifferentRef.current &&
            !shouldHideTypeChangeRef.current
          ) {
            setNavigation((prev) => ({
              ...prev,
              bottomState: 'TYPE_CHANGE',
            }));
          } else {
            setNavigation((prev) => ({ ...prev, bottomState: 'LINE' }));
          }
          break;
        case 'TYPE_CHANGE':
          setNavigation((prev) => ({
            ...prev,
            bottomState: 'LINE',
          }));
          break;
        default:
          break;
      }
    }, bottomTransitionInterval);
    setIntervalId(interval);
  }, [
    bottomStateRef,
    bottomTransitionInterval,
    nextTrainTypeIsDifferentRef,
    setNavigation,
    timerPausedRef,
    transferLinesRef,
  ]);

  return { pause };
};

export default useUpdateBottomState;
