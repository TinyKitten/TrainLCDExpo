import React, { useCallback, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  SynthesizeSpeechCommand,
  PollyClient,
  TextType,
} from '@aws-sdk/client-polly';
import SSMLBuilder from 'ssml-builder';
import useValueRef from '../hooks/useValueRef';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { getNextStationLinesWithoutCurrentLine } from '../utils/line';
import lineState from '../store/atoms/line';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import getSlicedStations from '../utils/slicedStations';
import getCurrentLine from '../utils/currentLine';
import themeState from '../store/atoms/theme';
import AppTheme from '../models/Theme';
import replaceSpecialChar from '../utils/replaceSpecialChar';
import { parenthesisRegexp } from '../constants/regexp';
import capitalizeFirstLetter from '../utils/capitalizeFirstLetter';
import { isLoopLine } from '../utils/loopLine';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import speechState from '../store/atoms/speech';

type Props = {
  children: React.ReactNode;
};

const pollyClient = new PollyClient({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const SpeechProvider: React.FC<Props> = ({ children }: Props) => {
  const { leftStations, headerState, trainType } = useRecoilValue(
    navigationState
  );
  const {
    selectedBound,
    station,
    stations,
    selectedDirection,
    arrived,
  } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { theme } = useRecoilValue(themeState);
  const prevStateText = useValueRef(headerState).current;
  const { enabled, muted } = useRecoilValue(speechState);
  const [soundJaState, setSoundJaState] = useState<Audio.Sound>();
  const [soundEnState, setSoundEnState] = useState<Audio.Sound>();

  useEffect(() => {
    const muteAsync = async () => {
      if (muted && soundEnState) {
        await soundEnState.stopAsync();
        await soundEnState.unloadAsync();
      }
      if (muted && soundJaState) {
        await soundJaState.stopAsync();
        await soundJaState.unloadAsync();
      }
    };
    muteAsync();
  }, [muted, soundEnState, soundJaState]);

  const speech = useCallback(
    async ({ textJa, textEn }: { textJa: string; textEn: string }) => {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`;
      const bodyJa = {
        input: {
          ssml: `<speak>${textJa}</speak>`,
        },
        voice: {
          languageCode: 'ja-JP',
          name: 'ja-JP-Wavenet-B',
        },
        audioConfig: {
          audioEncoding: 'mp3',
          effectsProfileId: ['large-automotive-class-device'],
          speaking_rate: 1.15,
          pitch: 0,
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

        const cmd = new SynthesizeSpeechCommand({
          OutputFormat: 'mp3',
          Text: `<speak>${textEn}</speak>`,
          TextType: TextType.SSML,
          VoiceId: 'Joanna',
        });
        const dataEn = await pollyClient.send(cmd);
        const pathJa = `${FileSystem.documentDirectory}/announce_ja.aac`;
        await FileSystem.writeAsStringAsync(pathJa, resJa.audioContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const soundJa = new Audio.Sound();
        setSoundJaState(soundJa);
        await soundJa.loadAsync({
          uri: pathJa,
        });
        await soundJa.playAsync();
        soundJa.setOnPlaybackStatusUpdate(
          async (
            status: AVPlaybackStatus & {
              didJustFinish: boolean;
              isPlaying: boolean;
            }
          ) => {
            if (status.didJustFinish) {
              await soundJa.unloadAsync();

              const soundEn = new Audio.Sound();
              setSoundEnState(soundEn);
              const pathEn = `${FileSystem.documentDirectory}/announce_en.aac`;

              const reader = new FileReader();
              reader.readAsDataURL(dataEn.AudioStream as Blob);

              reader.onload = async () => {
                await FileSystem.writeAsStringAsync(
                  pathEn,
                  (reader.result as string).split(',')[1],
                  {
                    encoding: FileSystem.EncodingType.Base64,
                  }
                );
                await soundEn.loadAsync({
                  uri: pathEn,
                });
                await soundEn.playAsync();

                soundEn.setOnPlaybackStatusUpdate(
                  async (
                    _status: AVPlaybackStatus & { didJustFinish: boolean }
                  ) => {
                    if (_status.didJustFinish || status.isPlaying) {
                      await soundEn.stopAsync();
                      await soundEn.unloadAsync();
                    }
                  }
                );
              };
            }
          }
        );
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  const actualNextStation = leftStations[1];

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

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  const prevStateIsDifferent =
    prevStateText.split('_')[0] !== headerState.split('_')[0];

  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);

  const slicedStations = getSlicedStations({
    stations,
    currentStation: leftStations[0],
    isInbound: selectedDirection === 'INBOUND',
    arrived,
    currentLine,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const playAsync = async () => {
      const nextStopStationIndex = slicedStations.findIndex((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        return !s.pass;
      });
      const afterNextStationIndex = slicedStations.findIndex((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        if (s.id === nextStation?.id) {
          return false;
        }
        return !s.pass;
      });
      const afterNextStation = slicedStations[afterNextStationIndex];

      const betweenAfterNextStation = slicedStations.slice(
        nextStopStationIndex + 1,
        afterNextStationIndex
      );
      const betweenNextStation = slicedStations.slice(1, nextStopStationIndex);

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
          arr.length - 1 === i ? `and the ${nameR}` : `the ${nameR},`
        );

      const belongingLines = stations.map((s) =>
        s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      );

      const trainTypeName =
        trainType?.name?.replace(parenthesisRegexp, '') || '各駅停車';
      const trainTypeNameEn =
        trainType?.nameR?.replace(parenthesisRegexp, '') || 'Local';
      const reversedBelongingLines =
        selectedDirection === 'INBOUND'
          ? belongingLines
          : belongingLines.slice().reverse();
      const nextLineIndex = reversedBelongingLines.lastIndexOf(currentLine);
      const nextLine = reversedBelongingLines.reduce((acc, cur, idx) => {
        if (idx !== nextLineIndex + 1) {
          return acc;
        }
        if (cur?.nameK === currentLine?.nameK) {
          return acc;
        }
        return cur;
      }, undefined);
      const allStops = slicedStations.filter((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        return !s.pass;
      });

      const getHasTerminus = (hops: number) =>
        allStops.slice(0, hops).length < hops;

      const getNextTextJaExpress = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Saikyo:
          case AppTheme.TY:
          case AppTheme.Yamanote:
            return ssmlBuiler
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(
                allStops
                  .slice(0, 3)
                  .map((s, i, a) =>
                    a.length - 1 !== i ? `${s.nameK}、` : s.nameK
                  )
                  .join('')
              )
              .say('方面、')
              .say(nextLine ? `${nextLine?.nameK}直通、` : '')
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。次は、')
              .say(`${nextStation?.nameK}、`)
              .say(nextStation?.nameK)
              .say(terminal ? '、終点' : '')
              .say('です。')
              .say(nextStation?.nameK)
              .say('の次は、')
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
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('今日も、')
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございます。この電車は、')
              .say(`${trainTypeName}、`)
              .say(selectedBound?.nameK)
              .say('ゆきです。')
              .say(
                allStops
                  .slice(0, 5)
                  .map((s) =>
                    s.id !== selectedBound?.id
                      ? `${s.nameK}、`
                      : `終点、${s.nameK}`
                  )
                  .join('')
              )
              .say('の順に止まります。')
              .say(
                getHasTerminus(5)
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
          default:
            return '';
        }
      };
      const getNextTextEnExpress = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Saikyo:
          case AppTheme.TY:
          case AppTheme.Yamanote:
            return ssmlBuiler
              .say('This train is bound for')
              .say(selectedBound?.nameR)
              .pause('100ms')
              .say('the')
              .say(trainTypeNameEn)
              .say('on the')
              .say(
                `${currentLine?.nameR
                  .replace('JR', 'J-R')
                  .replace(parenthesisRegexp, '')}.`
              )
              .say('The next station is')
              .say(nextStation?.nameR)
              .say(terminal ? 'terminal.' : '.')
              .say('The stop after')
              .say(nextStation?.nameR)
              .say('is')
              .say(`${afterNextStation?.nameR}`)
              .say(getHasTerminus(5) ? 'terminal.' : '.')
              .say(
                betweenAfterNextStation.length
                  ? 'For stations in between, please change trains at the next stop,'
                  : ''
              )
              .say(linesEn.length ? `and for ${linesEn.join('')}` : '')
              .ssml(true);
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('Thank you for using')
              .say(
                currentLine?.nameR
                  .replace('JR', 'J-R')
                  .replace(parenthesisRegexp, '')
              )
              .say('. This is the')
              .say(trainTypeNameEn)
              .say('service bound for')
              .say(`${selectedBound?.nameR}.`)
              .say('We will be stopping at')
              .say(
                allStops
                  .slice(0, 5)
                  .map((s, i, a) =>
                    a.length - 1 !== i ? `${s.nameR}, ` : s.nameR
                  )
                  .join('')
              )
              .say(getHasTerminus(5) ? 'terminal.' : '.')
              .say(
                getHasTerminus(5)
                  ? ''
                  : `Stops after ${
                      allStops
                        .slice(0, 5)
                        .filter((s) => s)
                        .reverse()[0]?.nameR
                    }, will be anounced later.`
              )
              .say('The next stop is')
              .say(nextStation?.nameR)
              .ssml(true);
          default:
            return '';
        }
      };

      const getNextTextJaBase = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause(terminal ? '100ms' : '0s')
              .say(terminal ? '終点' : '')
              .say('です。')
              .ssml(true);
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('次は、')
              .say(terminal ? '終点' : '')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(nextStation?.nameK)
              .say('です。')
              .ssml(true);
          case AppTheme.TY:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(terminal ? '終点' : '')
              .pause(terminal ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .say('に止まります。')
              .ssml(true);

          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return ssmlBuiler
              .say('次は、')
              .pause('100ms')
              .say(terminal ? '終点' : '')
              .pause(terminal ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(nextStation?.nameK)
              .ssml(true);
          default:
            return '';
        }
      };

      const getNextTextJaWithTransfers = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getNextTextJaBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say(lines.join('、'))
              .say('は、お乗り換えです。')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const getApproachingTextJaBase = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
            return ssmlBuiler
              .say('まもなく')
              .pause('100ms')
              .say(nextStation?.nameK)
              .say(terminal ? 'この電車の終点' : '')
              .say('です。')
              .ssml(true);
          case AppTheme.TY:
            return ssmlBuiler
              .say('まもなく')
              .pause('100ms')
              .say(terminal ? 'この電車の終点' : '')
              .pause(terminal ? '100ms' : '0s')
              .say(nextStation?.nameK)
              .say('に到着いたします。')
              .ssml(true);
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return ssmlBuiler
              .say('まもなく')
              .say(terminal ? '終点' : '')
              .pause('100ms')
              .say(nextStation?.nameK)
              .pause('100ms')
              .say(`${nextStation?.nameK}。`)
              .say('本日も、')
              .pause('100ms')
              .say(currentLine?.nameK)
              .say('をご利用くださいまして、ありがとうございました。')
              .ssml(true);
          default:
            return '';
        }
      };

      const getApproachingTextJaWithTransfers = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getApproachingTextJaBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say(lines.join('、'))
              .say('は、お乗り換えです')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const nameR = replaceSpecialChar(nextStation?.nameR)
        ?.split(/(\s+)/)
        .map((c) => capitalizeFirstLetter(c.toLowerCase()))
        .join('');

      const getNextTextEnBase = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('The next stop is')
              .pause('100ms')
              .say(nameR)
              .say(terminal ? 'terminal.' : '.')
              .ssml(true);
          case AppTheme.TY:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return ssmlBuiler
              .say('The next station is')
              .pause('100ms')
              .say(nameR)
              .say(terminal ? 'terminal.' : '.')
              .ssml(true);
          default:
            return '';
        }
      };

      const getNextTextEnWithTransfer = (terminal: boolean): string => {
        if (!linesEn.length) {
          return getNextTextEnBase(terminal);
        }
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
          case AppTheme.JRWest:
            return `${getNextTextEnBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .ssml(true)}`;
          case AppTheme.TY:
            return `${getNextTextEnBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say('Passengers changing to')
              .say(linesEn.join(''))
              .say(', Please transfer at this station.')
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const getApproachingTextEnBase = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
            return ssmlBuiler
              .say('Arriving at')
              .pause('100ms')
              .say('nameR')
              .ssml(true);
          case AppTheme.TY:
            return ssmlBuiler
              .say('We will soon make a brief stop at')
              .pause('100ms')
              .say('nameR')
              .ssml(true);
          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return getNextTextEnBase(terminal);
          case AppTheme.JRWest:
            return ssmlBuiler
              .say('We will soon be making a brief stop at')
              .pause('100ms')
              .say('nameR')
              .ssml(true);
          default:
            return '';
        }
      };

      const getApproachingTextEnWithTransfers = (terminal: boolean): string => {
        const ssmlBuiler = new SSMLBuilder();

        switch (theme) {
          case AppTheme.TokyoMetro:
          case AppTheme.JRWest:
            return `${getApproachingTextEnBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .ssml(true)}`;

          case AppTheme.TY:
            return `${getApproachingTextEnBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say('Passengers changing to the')
              .say(linesEn.join(''))
              .pause('100ms')
              .say('Please transfer at this station.')
              .ssml(true)}`;

          case AppTheme.Yamanote:
          case AppTheme.Saikyo:
            return `${getApproachingTextEnBase(terminal)} ${ssmlBuiler
              .pause('100ms')
              .say('Please change here for')
              .say(linesEn.join(''))
              .pause(terminal ? '100ms' : '0s')
              .say(
                terminal
                  ? 'Thank you for traveling with us. And we look forward to serving you again!'
                  : ''
              )
              .ssml(true)}`;
          default:
            return '';
        }
      };

      const nextStationIndex = stations.findIndex(
        (s) => s.id === nextStation?.id
      );
      const nextStationIsTerminus =
        !isLoopLine(currentLine) && selectedDirection === 'INBOUND'
          ? stations.length - 1 === nextStationIndex
          : nextStationIndex === 0;

      const loopLine = isLoopLine(currentLine);

      if (prevStateIsDifferent) {
        switch (headerState.split('_')[0]) {
          case 'NEXT':
            if (lines.length && loopLine) {
              speech({
                textJa: getNextTextJaWithTransfers(nextStationIsTerminus),
                textEn: getNextTextEnWithTransfer(nextStationIsTerminus),
              });
              return;
            }
            if (betweenNextStation.length) {
              speech({
                textJa: getNextTextJaExpress(nextStationIsTerminus),
                textEn: getNextTextEnExpress(nextStationIsTerminus),
              });
              return;
            }
            speech({
              textJa: getNextTextJaBase(nextStationIsTerminus),
              textEn: getNextTextEnBase(nextStationIsTerminus),
            });
            break;
          case 'ARRIVING':
            if (loopLine) {
              return;
            }

            if (lines.length) {
              speech({
                textJa: getApproachingTextJaWithTransfers(
                  nextStationIsTerminus
                ),
                textEn: getApproachingTextEnWithTransfers(
                  nextStationIsTerminus
                ),
              });
              break;
            }
            speech({
              textJa: getApproachingTextJaBase(nextStationIsTerminus),
              textEn: getApproachingTextEnBase(nextStationIsTerminus),
            });
            break;
          default:
            break;
        }
      }
    };

    playAsync();
  }, [
    currentLine,
    enabled,
    headerState,
    joinedLineIds,
    leftStations,
    nextStation?.id,
    nextStation?.nameK,
    nextStation?.nameR,
    prevStateIsDifferent,
    selectedBound?.id,
    selectedBound?.nameK,
    selectedBound?.nameR,
    selectedDirection,
    selectedLine,
    slicedStations,
    speech,
    stations,
    theme,
    trainType,
    trainType?.name,
    trainType?.nameR,
  ]);

  return <>{children}</>;
};

export default SpeechProvider;
