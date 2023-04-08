// TODO: 都営地下鉄のTTSバリエーションの実装
import { AVPlaybackStatus, Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useMemo } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { GOOGLE_API_KEY } from 'react-native-dotenv';
import { useRecoilValue } from 'recoil';
import SSMLBuilder from 'ssml-builder';
import { parenthesisRegexp } from '../constants/regexp';
import { directionToDirectionName } from '../models/Bound';
import { APITrainType, Station } from '../models/StationAPI';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import { getNextStationLinesWithoutCurrentLine } from '../utils/line';
import { getIsLoopLine, isMeijoLine } from '../utils/loopLine';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import replaceSpecialChar from '../utils/replaceSpecialChar';
import getSlicedStations from '../utils/slicedStations';
import useAppState from './useAppState';
import useConnectedLines from './useConnectedLines';
import useConnectivity from './useConnectivity';
import useCurrentLine from './useCurrentLine';
import useLoopLineBound from './useLoopLineBound';
import useNextLine from './useNextLine';
import useValueRef from './useValueRef';

const useTTS = (): void => {
  const { leftStations, headerState, trainType } =
    useRecoilValue(navigationState);
  const {
    selectedBound: selectedBoundOrigin,
    station,
    stations,
    selectedDirection,
    arrived,
  } = useRecoilValue(stationState);
  const { theme } = useRecoilValue(themeState);
  const prevStateText = useValueRef(headerState).current;
  const { enabled, muted } = useRecoilValue(speechState);
  const soundJa = useMemo(() => new Audio.Sound(), []);
  const soundEn = useMemo(() => new Audio.Sound(), []);
  const appState = useAppState();
  const currentLineOrigin = useCurrentLine();
  const nextLine = useNextLine();
  const currentLine = useMemo(
    () =>
      currentLineOrigin && {
        ...currentLineOrigin,
        nameR: currentLineOrigin.nameR
          .replace('JR', 'J-R')
          .replace(parenthesisRegexp, ''),
      },
    [currentLineOrigin]
  );
  const loopLineBoundJa = useLoopLineBound(false);
  const loopLineBoundEn = useLoopLineBound(false, 'EN');

  const typedTrainType = trainType as APITrainType;
  const currentTrainType = useMemo(() => {
    const types = typedTrainType?.allTrainTypes.find(
      (tt) => tt.line.id === currentLine?.id
    );
    return (
      types && { ...types, nameR: types.nameR.replace(parenthesisRegexp, '') }
    );
  }, [currentLine?.id, typedTrainType?.allTrainTypes]);

  const isLoopLine = getIsLoopLine(currentLine, currentTrainType);

  const selectedBound = selectedBoundOrigin && {
    ...selectedBoundOrigin,
    nameR: selectedBoundOrigin.nameR
      ?.replace('JR', 'J-R')
      ?.replace(parenthesisRegexp, ''),
  };

  const connectedLinesOrigin = useConnectedLines();
  const connectedLines = useMemo(
    () =>
      connectedLinesOrigin &&
      connectedLinesOrigin.map((l) => ({
        ...l,
        nameR: l.nameR.replace('JR', 'J-R').replace(parenthesisRegexp, ''),
      })),
    [connectedLinesOrigin]
  );

  const unloadEnSpeech = useCallback(async () => {
    const enStatus = await soundEn.getStatusAsync();
    if (enStatus.isLoaded) {
      await soundEn.stopAsync();
      await soundEn.unloadAsync();
    }
  }, [soundEn]);
  const unloadJaSpeech = useCallback(async () => {
    const jaStatus = await soundJa.getStatusAsync();

    if (jaStatus.isLoaded) {
      await soundJa.stopAsync();
      await soundJa.unloadAsync();
    }
  }, [soundJa]);

  const unloadAllSpeech = useCallback(async () => {
    await unloadEnSpeech();
    await unloadJaSpeech();
  }, [unloadEnSpeech, unloadJaSpeech]);

  useEffect(() => {
    const unloadAsync = async () => {
      // もしかしたら `appState !== 'active` のほうが良いかもしれない
      if (appState === 'background') {
        await unloadAllSpeech();
      }
    };
    unloadAsync();
  }, [appState, unloadAllSpeech]);

  useEffect(() => {
    const unloadAsync = async () => {
      if (headerState.split('_')[0] === 'CURRENT') {
        // 日本語放送だけは最後まで流す
        await unloadEnSpeech();
      }
    };
    unloadAsync();
  }, [headerState, unloadEnSpeech]);

  useEffect(() => {
    const muteAsync = async () => {
      if (muted) {
        await unloadAllSpeech();
      }
    };
    muteAsync();
  }, [muted, unloadAllSpeech]);

  const speech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${GOOGLE_API_KEY}`;
      const bodyJa = {
        input: {
          ssml: `<speak>${textJa}</speak>`,
        },
        voice: {
          languageCode: 'ja-JP',
          name: 'ja-JP-Neural2-B',
        },
        audioConfig: {
          audioEncoding: 'MP3_64_KBPS',
          effectsProfileId: ['large-automotive-class-device'],
          speaking_rate: 1.15,
        },
      };
      const bodyEn = {
        input: {
          ssml: `<speak>${textEn}</speak>`,
        },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-E',
        },
        audioConfig: {
          audioEncoding: 'MP3_64_KBPS',
          effectsProfileId: ['large-automotive-class-device'],
        },
      };

      try {
        const dataJa = await fetch(url, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(bodyJa),
          method: 'POST',
        });
        const resJa = await dataJa.json();
        const dataEn = await fetch(url, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(bodyEn),
          method: 'POST',
        });
        const resEn = await dataEn.json();
        const pathJa = `${FileSystem.documentDirectory}/announce_ja.mp3`;
        await FileSystem.writeAsStringAsync(pathJa, resJa.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await soundJa.loadAsync({
          uri: pathJa,
        });
        await soundJa.playAsync();
        soundJa.setOnPlaybackStatusUpdate(
          async (jaStatus: AVPlaybackStatus) => {
            if (
              (
                jaStatus as {
                  didJustFinish: boolean;
                }
              ).didJustFinish
            ) {
              await soundJa.unloadAsync();

              const pathEn = `${FileSystem.documentDirectory}/announce_en.mp3`;
              await FileSystem.writeAsStringAsync(pathEn, resEn.audioContent, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await soundEn.loadAsync({
                uri: pathEn,
              });
              await soundEn.playAsync();
              soundEn.setOnPlaybackStatusUpdate(
                async (enStatus: AVPlaybackStatus) => {
                  if (
                    (
                      enStatus as {
                        didJustFinish: boolean;
                      }
                    ).didJustFinish
                  ) {
                    await soundEn.unloadAsync();
                  }
                }
              );
            }
          }
        );
      } catch (err) {
        console.error(err);
      }
    },
    [soundEn, soundJa]
  );

  const actualNextStation = getNextStation(leftStations, station);

  const nextOutboundStopStation = getNextOutboundStopStation(
    stations,
    actualNextStation,
    station
  );
  const nextInboundStopStation = getNextInboundStopStation(
    stations,
    actualNextStation,
    station
  );

  const nextStationOrigin =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;
  const nextStation = useMemo(
    () =>
      nextStationOrigin && {
        ...nextStationOrigin,
        nameR: nextStationOrigin.nameR.replace('JR', 'J-R'),
      },
    [nextStationOrigin]
  );

  const stationNumberRaw = nextStation?.stationNumbers[0]?.stationNumber;
  const stationNumber = stationNumberRaw
    ? `${stationNumberRaw.split('-')[0]?.split('')?.join('-') ?? ''}
        ${stationNumberRaw.split('-').slice(1).map(Number).join('-')}`
    : '';

  const prevStateIsDifferent =
    prevStateText.split('_')[0] !== headerState.split('_')[0];

  const slicedStationsOrigin = getSlicedStations({
    stations,
    currentStation: station,
    isInbound: selectedDirection === 'INBOUND',
    arrived,
    currentLine,
    trainType: currentTrainType,
  });

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は、渋谷に止まります)
  const slicedStations = Array.from(
    new Set(slicedStationsOrigin.map((s) => s.groupId))
  )
    .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
    .filter((s) => !!s) as Station[];

  const allStops = slicedStations.filter((s) => {
    if (s.id === station?.id) {
      return false;
    }
    return !getIsPass(s);
  });

  const getHasTerminus = useCallback(
    (hops: number) => allStops.slice(0, hops).length < hops,
    [allStops]
  );

  const shouldSpeakTerminus = getHasTerminus(2) && !isLoopLine;

  const isInternetAvailable = useConnectivity();

  useEffect(() => {
    if (!enabled || !isInternetAvailable) {
      return;
    }

    const playAsync = async () => {
      const nextStopStationIndex = slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
          return false;
        }
        return !getIsPass(s);
      });
      const afterNextStationIndex = slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
          return false;
        }
        if (s.id === nextStation?.id) {
          return false;
        }
        return !getIsPass(s);
      });
      const afterNextStationOrigin = slicedStations[afterNextStationIndex];
      const afterNextStation = afterNextStationOrigin && {
        ...afterNextStationOrigin,
        nameR: afterNextStationOrigin.nameR.replace('JR', 'J-R'),
        lines: afterNextStationOrigin.lines.map((l) => ({
          ...l,
          nameR: l.nameR.replace('JR', 'J-R').replace(parenthesisRegexp, ''),
        })),
      };

      const betweenAfterNextStation = slicedStations.slice(
        nextStopStationIndex + 1,
        afterNextStationIndex
      );
      const betweenNextStation = slicedStations
        .slice(0, nextStopStationIndex)
        .filter((s) => s.groupId !== station?.groupId);

      const nextLines = omitJRLinesIfThresholdExceeded(
        getNextStationLinesWithoutCurrentLine(
          slicedStations,
          currentLine,
          nextStopStationIndex
        )
      );

      const lines = nextLines
        .map((l) => l.nameK)
        .filter((nameK) => nameK !== currentLine?.nameK);
      const linesEn = nextLines
        // J-Rにしないとジュニアと読まれちゃう
        .map((l) => l.nameR.replace(parenthesisRegexp, '').replace('JR', 'J-R'))
        .filter((nameR, idx, arr) => arr.indexOf(nameR) === idx)
        .filter((nameR) => nameR !== currentLine?.nameR)
        .map((nameR, i, arr) =>
          arr.length - 1 === i && arr.length !== 1
            ? ` and the ${nameR}.`
            : ` the ${nameR}${arr.length === 1 ? '.' : ','}`
        );

      const localJaNoun = theme === APP_THEME.JR_WEST ? '普通' : '各駅停車';
      const trainTypeName =
        currentTrainType?.nameK?.replace(parenthesisRegexp, '') || localJaNoun;
      const trainTypeNameEn =
        currentTrainType?.nameR
          ?.replace(parenthesisRegexp, '')
          // 基本的に種別にJRは入らないが念の為replace('JR', 'J-R')している
          ?.replace('JR', 'J-R') || 'Local';

      // 次の駅のすべての路線に対して接続路線が存在する場合、次の鉄道会社に接続する判定にする
      const isNextLineOperatedOtherCompany = nextStation?.lines
        // 同じ会社の路線をすべてしばく
        ?.filter((l) => l.companyId !== currentLine?.companyId)
        ?.filter(
          (l) =>
            connectedLines.findIndex((cl) => cl.companyId === l.companyId) !==
            -1
        );

      const getNextTextJaExpress = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        const bounds = Array.from(new Set(allStops.map((s) => s.nameK)))
          .slice(2, 5)
          .map((n, i, a) => (a.length - 1 !== i ? `${n}、` : n));

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.TOEI:
          case APP_THEME.TY: {
            const base = ssmlBuiler
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(bounds.length ? bounds.join('') : '')
              .say(bounds.length ? '方面、' : '')
              .say(
                connectedLines.length
                  ? `${connectedLines.map((nl) => nl.nameK).join('、')}直通、`
                  : ''
              )
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。次は、')
              .say(nextStation?.nameK)
              .say(shouldSpeakTerminus ? '、終点' : '')
              .say('です。');

            if (!afterNextStation) {
              return base
                .say(
                  lines.length
                    ? `${lines.map((l, i, arr) =>
                        arr.length !== i ? `${l}、` : l
                      )}はお乗り換えください。`
                    : ''
                )
                .ssml(true);
            }

            return base
              .say(nextStation?.nameK)
              .say('の次は、')
              .say(getHasTerminus(3) && !isLoopLine ? '終点、' : '')
              .say(afterNextStation?.nameK)
              .say('に停まります。')
              .say(
                betweenAfterNextStation.length
                  ? `${betweenAfterNextStation.map((sta, idx, arr) =>
                      arr.length - 1 !== idx ? `${sta.nameK}、` : sta.nameK
                    )}へおいでのお客様${
                      lines.length ? 'と、' : 'はお乗り換えください。'
                    }`
                  : ''
              )
              .say(
                lines.length
                  ? `${lines.map((l, i, arr) =>
                      arr.length !== i ? `${l}、` : l
                    )}はお乗り換えください。`
                  : ''
              )
              .ssml(true);
          }
          case APP_THEME.SAIKYO:
          case APP_THEME.YAMANOTE: {
            return ssmlBuiler
              .say('本日も、')
              .say(currentLine?.company?.nameR)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(
                connectedLines.length
                  ? `${connectedLines.map((nl) => nl.nameK).join('、')}直通、`
                  : ''
              )
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。次は、')
              .say(shouldSpeakTerminus ? '、終点' : '')
              .say(`${nextStation?.nameK}、`)
              .say(nextStation?.nameK)
              .say('。')
              .say(
                lines.length
                  ? `${lines.map((l, i, arr) =>
                      arr.length !== i ? `${l}、` : l
                    )}はお乗り換えください。`
                  : ''
              )
              .ssml(true);
          }
          case APP_THEME.JR_WEST: {
            const base = ssmlBuiler
              .say('今日も、')
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。');
            if (!afterNextStation) {
              return base
                .say('次は、')
                .say(`${nextStation?.nameK}、`)
                .say(nextStation?.nameK)
                .say('です。')
                .ssml(true);
            }
            return base
              .say(
                allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id === selectedBound?.id && !isLoopLine
                      ? `終点、${s.nameK}`
                      : s.nameK
                  )
                  .join('')
              )
              .say('の順に止まります。')
              .say(
                getHasTerminus(6)
                  ? ''
                  : `${
                      allStops
                        .slice(0, 5)
                        .filter((s) => s)
                        .reverse()[0]?.nameK
                    }から先は、後ほどご案内いたします。`
              )
              .say('次は、')
              .say(`${nextStation?.nameK}、`)
              .say(nextStation?.nameK)
              .say('です。')
              .ssml(true);
          }
          default:
            return '';
        }
      };

      const nextStationNameR =
        nextStation &&
        replaceSpecialChar(nextStation.nameR)
          ?.split(/(\s+)/)
          .map((c) => capitalizeFirstLetter(c.toLowerCase()))
          .join('');

      const getNextTextEnExpress = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        if (theme === APP_THEME.TY && connectedLines[0]) {
          return ssmlBuiler
            .say('This train will merge and continue traveling as a')
            .say(trainTypeNameEn)
            .say('train, on the')
            .say(connectedLines[0].nameR)
            .pause('100ms')
            .say('to')
            .say(selectedBound?.nameR)
            .pause('100ms')
            .say('The next station is')
            .say(nextStationNameR)
            .pause('100ms')
            .say(stationNumber)
            .say(shouldSpeakTerminus ? 'terminal.' : '.')
            .ssml(true);
        }

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.TOEI:
          case APP_THEME.TY: {
            const base = ssmlBuiler
              .say('This train is bound for')
              .say(selectedBound?.nameR)
              .pause('100ms')
              .say('the')
              .say(trainTypeNameEn)
              .say('on the')
              .say(`${currentLine?.nameR}.`)
              .say('The next station is')
              .say(nextStationNameR)
              .pause('100ms')
              .say(stationNumber)
              .say(shouldSpeakTerminus ? 'terminal.' : '.');

            if (!afterNextStation) {
              return base
                .say(
                  linesEn.length
                    ? `Please change here for ${linesEn.join('')}`
                    : ''
                )
                .ssml(true);
            }
            return base
              .say('The stop after')
              .say(nextStationNameR)
              .say('is')
              .say(afterNextStation?.nameR)
              .say(getHasTerminus(3) ? 'terminal.' : '.')
              .say(
                betweenAfterNextStation.length
                  ? 'For stations in between, please change trains at the next stop,'
                  : ''
              )
              .say(linesEn.length ? `and for ${linesEn.join('')}` : '')
              .ssml(true);
          }
          case APP_THEME.SAIKYO:
          case APP_THEME.YAMANOTE: {
            const isLocalType = trainTypeNameEn === 'Local';
            return ssmlBuiler
              .say('This is a')
              .say(`${currentLine?.nameR}`)
              .say(isLocalType ? '' : trainTypeNameEn)
              .say(isLocalType ? 'train for' : 'service train for')
              .say(selectedBound?.nameR)
              .say(nextLine ? ', via the' : '.')
              .say(nextLine ? `${nextLine?.nameR}.` : '  ')
              .say('The next station is')
              .say(nextStationNameR)
              .say(shouldSpeakTerminus ? 'terminal.' : '')
              .say(
                linesEn.length
                  ? `Please change here for ${linesEn.join('')}`
                  : ''
              )
              .ssml(true);
          }
          case APP_THEME.JR_WEST: {
            const base = ssmlBuiler
              .say('Thank you for using')
              .say(currentLine?.nameR)
              .say('. This is the')
              .say(trainTypeNameEn)
              .say('service bound for')
              .say(`${selectedBound?.nameR}.`);
            if (!afterNextStation) {
              return base
                .say('The next stop is')
                .say(nextStationNameR)
                .ssml(true);
            }
            const prefix = base.say('We will be stopping at').ssml(true);
            const suffixBuilder = new SSMLBuilder();
            const suffix = suffixBuilder
              .say(getHasTerminus(6) ? 'terminal.' : '.')
              .say(
                getHasTerminus(6)
                  ? ''
                  : `After leaving ${
                      allStops
                        .slice(0, 5)
                        .filter((s) => s)
                        .reverse()[0]?.nameR
                    }, will be anounced later.`
              )
              .say('The next stop is')
              .say(nextStationNameR)
              .ssml(true);

            return `${prefix} ${allStops
              .slice(0, 5)
              .map((s, i, a) =>
                a.length - 1 !== i ? `${s.nameR}, ` : `${s.nameR}`
              )
              .join('')} ${suffix}`;
          }
          default:
            return '';
        }
      };

      const getNextTextJaBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.TOEI:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause(shouldSpeakTerminus ? '100ms' : '0s')
              .say(shouldSpeakTerminus ? '終点' : '')
              .say('です。')
              .ssml(true);
          case APP_THEME.JR_WEST:
            return ssmlBuiler
              .say('次は、')
              .say(shouldSpeakTerminus ? '終点' : '')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(nextStation?.nameK)
              .say('です。')
              .ssml(true);
          case APP_THEME.TY:
            return ssmlBuiler
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(
                connectedLines.length
                  ? `${connectedLines.map((nl) => nl.nameK).join('、')}直通、`
                  : ''
              )
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。次は、')
              .say(nextStation?.nameK)
              .say(shouldSpeakTerminus ? '、終点' : '')
              .say('です。')
              .ssml(true);

          case APP_THEME.YAMANOTE:
          case APP_THEME.SAIKYO:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(shouldSpeakTerminus ? '終点' : '')
              .pause(shouldSpeakTerminus ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(nextStation?.nameK)
              .ssml(true);
          default:
            return '';
        }
      };

      const getNextTextJaLoopLine = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        if (!selectedDirection || !currentLine) {
          return '';
        }

        if (isMeijoLine(currentLine.id)) {
          return ssmlBuiler
            .say('この電車は')
            .pause('100ms')
            .say(currentLine.name)
            .pause('100ms')
            .say(directionToDirectionName(currentLine, selectedDirection))
            .say('です。次は、')
            .say(nextStation?.nameK)
            .pause('200ms')
            .say(nextStation?.nameK)
            .pause('200ms')
            .say(
              lines.length
                ? `${lines.map((l, i, arr) =>
                    arr.length !== i ? `${l}、` : l
                  )}はお乗り換えです。`
                : ''
            )
            .ssml(true);
        }

        return ssmlBuiler
          .say('この電車は')
          .pause('100ms')
          .say(currentLine.name)
          .pause('100ms')
          .say(directionToDirectionName(currentLine, selectedDirection))
          .pause('100ms')
          .say(loopLineBoundJa?.boundFor)
          .say('ゆきです。次は、')
          .say(nextStation?.nameK)
          .pause('200ms')
          .say(nextStation?.nameK)
          .pause('200ms')
          .say(
            lines.length
              ? `${lines.map((l, i, arr) =>
                  arr.length !== i ? `${l}、` : l
                )}はお乗り換えです。`
              : ''
          )
          .ssml(true);
      };

      const getApproachingTextJaBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.TOEI: {
            const base = ssmlBuiler
              .say('まもなく')
              .pause('100ms')
              .say(nextStation?.nameK)
              .say(shouldSpeakTerminus ? 'この電車の終点' : '')
              .say('です。');
            if (shouldSpeakTerminus || isNextLineOperatedOtherCompany) {
              base
                .say(
                  `${currentLine?.company?.nameR}をご利用いただきまして、ありがとうございました。`
                )
                .ssml(true);
            }
            return base.ssml(true);
          }
          case APP_THEME.TY: {
            const base = ssmlBuiler
              .say('まもなく')
              .pause('100ms')
              .say(shouldSpeakTerminus ? 'この電車の終点' : '')
              .pause(shouldSpeakTerminus ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .say('に到着いたします。');

            if (shouldSpeakTerminus || isNextLineOperatedOtherCompany) {
              base
                .say(
                  `${currentLine?.company?.nameR}をご利用いただきまして、ありがとうございました。`
                )
                .ssml(true);
            }
            return base.ssml(true);
          }
          case APP_THEME.YAMANOTE:
          case APP_THEME.SAIKYO: {
            const base = ssmlBuiler
              .say('まもなく')
              .say(shouldSpeakTerminus ? '終点' : '')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(`${nextStation?.nameK}。`);
            if (
              (shouldSpeakTerminus || isNextLineOperatedOtherCompany) &&
              currentLine?.company?.nameR
            ) {
              base
                .say('本日も、')
                .pause('100ms')
                .say(currentLine.company.nameR)
                .say('をご利用くださいまして、ありがとうございました。')
                .ssml(true);
            }
            return base.ssml(true);
          }
          default:
            return '';
        }
      };

      const getApproachingTextJaWithTransfers = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.TY:
          case APP_THEME.YAMANOTE:
          case APP_THEME.SAIKYO:
          case APP_THEME.JR_WEST:
          case APP_THEME.TOEI:
            return `${getApproachingTextJaBase()} ${ssmlBuiler
              .pause('100ms')
              .say(lines.join('、'))
              .say('は、お乗り換えです')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const getNextTextEnBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.JR_WEST:
          case APP_THEME.TOEI:
            return ssmlBuiler
              .say('The next stop is')
              .pause('100ms')
              .say(nextStationNameR)
              .pause('100ms')
              .say(stationNumber)
              .say(shouldSpeakTerminus ? 'terminal.' : '.')
              .ssml(true);
          case APP_THEME.TY:
          case APP_THEME.YAMANOTE:
          case APP_THEME.SAIKYO:
            return ssmlBuiler
              .say('The next station is')
              .pause('100ms')
              .say(nextStationNameR)
              .pause('100ms')
              .say(stationNumber)
              .say(shouldSpeakTerminus ? 'terminal.' : '.')
              .ssml(true);
          default:
            return '';
        }
      };

      const getNextTextEnLoopLine = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        if (!selectedDirection || !currentLine) {
          return '';
        }

        if (isMeijoLine(currentLine.id)) {
          return ssmlBuiler
            .say('This is the')
            .say(currentLine.nameR)
            .say('train')
            .say(loopLineBoundEn?.boundFor)
            .say('The next station is')
            .pause('100ms')
            .say(nextStationNameR)
            .pause('100ms')
            .say(stationNumber)
            .pause('200ms')
            .say('Please change here for')
            .say(
              lines.length
                ? `${linesEn.map((l, i, arr) =>
                    arr.length !== i ? `the ${l},` : `and the ${l}.`
                  )}`
                : ''
            )
            .ssml(true);
        }

        return ssmlBuiler
          .say('This is the')
          .say(currentLine.nameR)
          .say('train bound for')
          .say(loopLineBoundEn?.boundFor)
          .say('The next station is')
          .pause('100ms')
          .say(nextStationNameR)
          .pause('100ms')
          .say(stationNumber)
          .pause('200ms')
          .say('Please change here for')
          .say(
            lines.length
              ? `${linesEn.map((l, i, arr) =>
                  arr.length !== i ? `the ${l},` : `and the ${l}.`
                )}`
              : ''
          )
          .ssml(true);
      };

      const getApproachingTextEnBase = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.TOEI:
            return ssmlBuiler
              .say('Arriving at')
              .pause('100ms')
              .say(nextStationNameR)
              .pause('100ms')
              .say(stationNumber)
              .ssml(true);
          case APP_THEME.TY:
            return ssmlBuiler
              .say('We will soon make a brief stop at')
              .pause('100ms')
              .say(nextStationNameR)
              .pause('100ms')
              .say(stationNumber)
              .ssml(true);
          case APP_THEME.YAMANOTE:
          case APP_THEME.SAIKYO:
            return getNextTextEnBase();
          case APP_THEME.JR_WEST:
            return ssmlBuiler
              .say('We will soon be making a brief stop at')
              .pause('100ms')
              .say(nextStationNameR)
              .ssml(true);
          default:
            return '';
        }
      };

      const getApproachingTextEnWithTransfers = (): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case APP_THEME.TOKYO_METRO:
          case APP_THEME.JR_WEST:
          case APP_THEME.TOEI:
            return `${getApproachingTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .ssml(true)}`;

          case APP_THEME.TY:
            return `${getApproachingTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Passengers changing to the')
              .say(linesEn.join(''))
              .pause('100ms')
              .say('Please transfer at this station.')
              .ssml(true)}`;

          case APP_THEME.YAMANOTE:
          case APP_THEME.SAIKYO:
            return `${getApproachingTextEnBase()} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .pause(shouldSpeakTerminus ? '100ms' : '0s')
              .say(
                shouldSpeakTerminus
                  ? 'Thank you for traveling with us. And we look forward to serving you again!'
                  : ''
              )
              .ssml(true)}`;
          default:
            return '';
        }
      };

      if (prevStateIsDifferent) {
        switch (headerState.split('_')[0]) {
          case 'NEXT':
            if (isLoopLine && !trainType) {
              await speech({
                textJa: getNextTextJaLoopLine(),
                textEn: getNextTextEnLoopLine(),
              });
              return;
            }
            if (betweenNextStation.length) {
              await speech({
                textJa: getNextTextJaExpress(),
                textEn: getNextTextEnExpress(),
              });
              return;
            }
            await speech({
              textJa: getNextTextJaBase(),
              textEn: getNextTextEnBase(),
            });
            break;
          case 'ARRIVING':
            if (isLoopLine) {
              return;
            }

            if (lines.length) {
              await speech({
                textJa: getApproachingTextJaWithTransfers(),
                textEn: getApproachingTextEnWithTransfers(),
              });
              break;
            }
            await speech({
              textJa: getApproachingTextJaBase(),
              textEn: getApproachingTextEnBase(),
            });
            break;
          default:
            break;
        }
      }
    };

    playAsync();
  }, [
    allStops,
    connectedLines,
    currentLine,
    currentTrainType?.nameK,
    currentTrainType?.nameR,
    enabled,
    getHasTerminus,
    headerState,
    isInternetAvailable,
    isLoopLine,
    loopLineBoundEn?.boundFor,
    loopLineBoundJa?.boundFor,
    nextLine,
    nextStation,
    prevStateIsDifferent,
    selectedBound?.id,
    selectedBound?.nameK,
    selectedBound?.nameR,
    selectedDirection,
    shouldSpeakTerminus,
    slicedStations,
    speech,
    station?.groupId,
    station?.id,
    stationNumber,
    theme,
    trainType,
  ]);
};

export default useTTS;
