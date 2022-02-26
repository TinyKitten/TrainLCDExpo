import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LocationObject } from 'expo-location';
import * as ScreenCapture from 'expo-screen-capture';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, View } from 'react-native';
import RNFS from 'react-native-fs';
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import AsyncStorageKeys from '../constants/asyncStorageKeys';
import { ALL_AVAILABLE_LANGUAGES } from '../constants/languages';
import { parenthesisRegexp } from '../constants/regexp';
import useConnectedLines from '../hooks/useConnectedLines';
import useConnectivity from '../hooks/useConnectivity';
import useCurrentLine from '../hooks/useCurrentLine';
import useDetectBadAccuracy from '../hooks/useDetectBadAccuracy';
import useResetMainState from '../hooks/useResetMainState';
import { APITrainType } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import SpeechProvider from '../providers/SpeechProvider';
import devState from '../store/atoms/dev';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import getNextStation from '../utils/getNextStation';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import DevOverlay from './DevOverlay';
import Header from './Header';
import WarningPanel from './WarningPanel';

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    height: Dimensions.get('window').height,
  },
});

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [warningInfo, setWarningInfo] = useState<{
    level: 'URGENT' | 'WARNING' | 'INFO';
    text: string;
  } | null>(null);

  const { station, stations, selectedDirection, selectedBound } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { location, badAccuracy } = useRecoilValue(locationState);
  const setTheme = useSetRecoilState(themeState);
  const [
    { headerState, stationForHeader, leftStations, trainType, autoMode },
    setNavigation,
  ] = useRecoilState(navigationState);
  const { devMode } = useRecoilValue(devState);
  const setSpeech = useSetRecoilState(speechState);

  const viewShotRef = useRef<ViewShot>(null);

  useDetectBadAccuracy();
  const handleBackButtonPress = useResetMainState();

  const connectedLines = useConnectedLines();

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        AsyncStorageKeys.FirstLaunchPassed
      );
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(AsyncStorageKeys.FirstLaunchPassed, 'true');
            },
          },
        ]);
      }
    };
    f();
  }, []);

  useEffect(() => {
    const loadSettingsAsync = async () => {
      const prevThemeStr = await AsyncStorage.getItem(
        AsyncStorageKeys.PreviousTheme
      );

      if (prevThemeStr) {
        setTheme((prev) => ({
          ...prev,
          theme: parseInt(prevThemeStr, 10) || AppTheme.TokyoMetro,
        }));
      }
      const enabledLanguagesStr = await AsyncStorage.getItem(
        AsyncStorageKeys.EnabledLanguages
      );
      if (enabledLanguagesStr) {
        setNavigation((prev) => ({
          ...prev,
          enabledLanguages:
            JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
        }));
      }
      const speechEnabledStr = await AsyncStorage.getItem(
        AsyncStorageKeys.SpeechEnabled
      );
      setSpeech((prev) => ({
        ...prev,
        enabled: speechEnabledStr === 'true',
      }));
    };
    loadSettingsAsync();
  }, [setTheme, setSpeech, setNavigation]);

  useEffect(() => {
    if (autoMode) {
      setWarningDismissed(false);
    }
  }, [autoMode]);

  const isInternetAvailable = useConnectivity();

  useEffect(() => {
    if (!isInternetAvailable) {
      setWarningDismissed(false);
    }
  }, [isInternetAvailable]);

  const getWarningInfo = useCallback(() => {
    if (warningDismissed) {
      return null;
    }

    if (autoMode) {
      return {
        level: 'INFO' as const,
        text: translate('autoModeInProgress'),
      };
    }

    if (!isInternetAvailable && station) {
      return {
        level: 'WARNING' as const,
        text: translate('offlineWarningText'),
      };
    }

    if (badAccuracy) {
      return {
        level: 'URGENT' as const,
        text: translate('badAccuracy'),
      };
    }
    return null;
  }, [autoMode, badAccuracy, isInternetAvailable, station, warningDismissed]);

  useEffect(() => {
    const info = getWarningInfo();
    setWarningInfo(info);
  }, [getWarningInfo]);

  useEffect(() => {
    const listener = ScreenCapture.addScreenshotListener(() => {
      if (selectedBound) {
        setWarningInfo({
          level: 'INFO' as const,
          text: translate('shareNotice'),
        });
      }
    });
    return () => listener.remove();
  }, [selectedBound]);

  const onWarningPress = (): void => setWarningDismissed(true);

  const NullableWarningPanel: React.FC = () =>
    warningInfo ? (
      <WarningPanel
        onPress={onWarningPress}
        text={warningInfo.text}
        warningLevel={warningInfo.level}
      />
    ) : null;

  const { showActionSheetWithOptions } = useActionSheet();

  const handleShare = useCallback(async () => {
    if (!viewShotRef || !selectedLine) {
      return;
    }
    try {
      const joinedLineIds = (trainType as APITrainType)?.lines.map((l) => l.id);
      const currentLine =
        leftStations.map((s) =>
          s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
        )[0] || selectedLine;

      if (!viewShotRef.current?.capture) {
        return;
      }

      const uri = await viewShotRef.current.capture();
      const res = await RNFS.readFile(uri, 'base64');
      const urlString = `data:image/jpeg;base64,${res}`;
      const message = isJapanese
        ? `${currentLine.name.replace(
            parenthesisRegexp,
            ''
          )}で移動中です！ #TrainLCD https://trainlcd.app`
        : `I'm riding ${currentLine.nameR.replace(
            parenthesisRegexp,
            ''
          )} with #TrainLCD https://trainlcd.app`;
      const options = {
        title: 'TrainLCD',
        message,
        url: urlString,
        type: 'image/png',
      };
      await Share.open(options);
    } catch (err) {
      if ((err as { message: string }).message !== 'User did not share') {
        console.error(err);
        Alert.alert(translate('couldntShare'));
      }
    }
  }, [leftStations, selectedLine, trainType]);

  const onLongPress = async ({
    nativeEvent,
  }: {
    nativeEvent: {
      state: State;
    };
  }): Promise<void> => {
    if (!selectedBound) {
      return;
    }

    if (nativeEvent.state === State.ACTIVE) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      showActionSheetWithOptions(
        {
          options:
            Platform.OS === 'ios'
              ? [translate('back'), translate('share'), translate('cancel')]
              : [translate('share'), translate('cancel')],
          destructiveButtonIndex: Platform.OS === 'ios' ? 0 : undefined,
          cancelButtonIndex: Platform.OS === 'ios' ? 3 : 2,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            // iOS: back, Android: share
            case 0:
              if (Platform.OS === 'ios') {
                handleBackButtonPress();
              } else {
                handleShare();
              }
              break;
            // iOS: share, Android: will be not passed here
            case 1:
              if (Platform.OS === 'ios') {
                handleShare();
              }
              break;
            // iOS: cancel, Android: will be not passed here
            default:
              break;
          }
        }
      );
    }
  };

  const actualNextStation = getNextStation(leftStations, station);

  const nextInboundStopStation = getNextInboundStopStation(
    stations,
    actualNextStation,
    station
  );
  const nextOutboundStopStation = getNextOutboundStopStation(
    stations,
    actualNextStation,
    station
  );

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  const currentLine = useCurrentLine();

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={500}
      >
        <View style={styles.root}>
          {/* eslint-disable-next-line no-undef */}
          {devMode && station && location && (
            <DevOverlay location={location as LocationObject} />
          )}
          {station && (
            <Header
              state={headerState}
              station={stationForHeader || station}
              stations={stations}
              nextStation={nextStation}
              line={currentLine}
              lineDirection={selectedDirection}
              boundStation={selectedBound}
              connectedNextLines={connectedLines}
            />
          )}
          <SpeechProvider>{children}</SpeechProvider>
          <NullableWarningPanel />
        </View>
      </LongPressGestureHandler>
    </ViewShot>
  );
};

export default PermittedLayout;
