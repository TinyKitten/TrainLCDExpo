import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { withAnchorPoint } from 'react-native-anchor-point'
import Animated, {
  Easing,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import useAppState from '../hooks/useAppState'
import useConnectedLines from '../hooks/useConnectedLines'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useCurrentStation from '../hooks/useCurrentStation'
import useCurrentTrainType from '../hooks/useCurrentTrainType'
import useIsNextLastStop from '../hooks/useIsNextLastStop'
import useLazyPrevious from '../hooks/useLazyPrevious'
import useLoopLineBound from '../hooks/useLoopLineBound'
import { useNextStation } from '../hooks/useNextStation'
import { useNumbering } from '../hooks/useNumbering'
import { HeaderLangState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import tuningState from '../store/atoms/tuning'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import katakanaToHiragana from '../utils/kanaToHiragana'
import { getIsLoopLine } from '../utils/loopLine'
import { getNumberingColor } from '../utils/numbering'
import Clock from './Clock'
import NumberingIcon from './NumberingIcon'
import TrainTypeBox from './TrainTypeBoxSaikyo'
import Typography from './Typography'
import VisitorsPanel from './VisitorsPanel'
import { STATION_NAME_FONT_SIZE, parenthesisRegexp } from '../constants'

const { width: windowWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  gradientRoot: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingBottom: 8,
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  connectedLines: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: RFValue(14),
  },
  boundTextContainer: {
    position: 'absolute',
  },
  boundText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: RFValue(18),
    position: 'absolute',
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#3a3a3a',
    textAlign: 'right',
  },
  stationNameWrapper: {
    width: windowWidth * 0.72,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stationNameContainer: {
    position: 'absolute',
    justifyContent: 'center',
  },
  stationName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3a3a3a',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockOverride: {
    position: 'absolute',
    bottom: 0,
  },
})

type HeaderBarProps = {
  lineColor: string
  height: number
}

const headerBarStyles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: 'black',
  },
  gradient: {
    flex: 1,
  },
})

const HeaderBar: React.FC<HeaderBarProps> = ({
  lineColor,
  height,
}: HeaderBarProps) => (
  <View style={[headerBarStyles.root, { height }]}>
    <LinearGradient
      style={headerBarStyles.gradient}
      colors={[
        '#fcfcfc',
        `${lineColor}bb`,
        `${lineColor}bb`,
        `${lineColor}bb`,
        '#fcfcfc',
      ]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={[0, 0]}
      end={[1, 1]}
    />
  </View>
)

const HeaderSaikyo: React.FC = () => {
  const station = useCurrentStation()
  const nextStation = useNextStation()

  const [stateText, setStateText] = useState('')
  const [stationText, setStationText] = useState(station?.name || '')
  const [fadeOutFinished, setFadeOutFinished] = useState(false)
  const { selectedBound, arrived } = useRecoilValue(stationState)
  const { headerState } = useRecoilValue(navigationState)
  const { headerTransitionDelay } = useRecoilValue(tuningState)

  const connectedLines = useConnectedLines()
  const currentLine = useCurrentLine()
  const loopLineBound = useLoopLineBound()
  const isLast = useIsNextLastStop()
  const trainType = useCurrentTrainType()

  const connectionText = useMemo(
    () =>
      connectedLines
        ?.map((l) => l.nameShort.replace(parenthesisRegexp, ''))

        .slice(0, 2)
        .join('・'),
    [connectedLines]
  )

  const nameFadeAnim = useValue<number>(1)
  const topNameScaleYAnim = useValue<number>(0)
  const stateOpacityAnim = useValue<number>(0)
  const boundOpacityAnim = useValue<number>(0)
  const bottomNameScaleYAnim = useValue<number>(1)

  const isLoopLine = currentLine && getIsLoopLine(currentLine, trainType)

  const { right: safeAreaRight } = useSafeAreaInsets()
  const appState = useAppState()

  const prevStationText = useLazyPrevious(stationText, fadeOutFinished)
  const prevStateText = useLazyPrevious(stateText, fadeOutFinished)
  const prevConnectionText = useLazyPrevious(connectionText, fadeOutFinished)
  const prevHeaderState = useLazyPrevious(headerState, fadeOutFinished)

  const headerLangState = useMemo(
    () => headerState.split('_')[1] as HeaderLangState,
    [headerState]
  )

  const isJapaneseState = useMemo(
    () => !headerLangState || headerLangState === 'KANA',
    [headerLangState]
  )

  const boundPrefix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return 'for '
      case 'ZH':
        return '开往 '
      default:
        return ''
    }
  }, [headerLangState])
  const boundSuffix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return ''
      case 'ZH':
        return ''
      case 'KO':
        return ' 행'
      default:
        return getIsLoopLine(currentLine, trainType) ? ' 方面' : ' ゆき'
    }
  }, [currentLine, headerLangState, trainType])

  const boundStationName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return selectedBound?.nameRoman
      case 'ZH':
        return selectedBound?.nameChinese
      case 'KO':
        return selectedBound?.nameKorean
      default:
        return selectedBound?.name
    }
  }, [
    headerLangState,
    selectedBound?.name,
    selectedBound?.nameChinese,
    selectedBound?.nameKorean,
    selectedBound?.nameRoman,
  ])
  const boundText = useMemo(() => {
    if (!selectedBound) {
      return 'TrainLCD'
    }
    if (isLoopLine && !trainType) {
      return `${boundPrefix}${loopLineBound?.boundFor ?? ''}${boundSuffix}`
    }
    return `${boundPrefix}${boundStationName}${boundSuffix}`
  }, [
    boundPrefix,
    boundStationName,
    boundSuffix,
    isLoopLine,
    loopLineBound?.boundFor,
    selectedBound,
    trainType,
  ])

  const prevBoundText = useLazyPrevious(boundText, fadeOutFinished)

  const prevBoundIsDifferent = useMemo(
    () => prevBoundText !== boundText || prevConnectionText !== connectionText,
    [boundText, connectionText, prevBoundText, prevConnectionText]
  )

  const fadeIn = useCallback(
    (): Promise<void> =>
      new Promise((resolve) => {
        if (appState !== 'active') {
          resolve()
          return
        }

        if (!selectedBound) {
          if (prevHeaderState === headerState) {
            topNameScaleYAnim.setValue(0)
            nameFadeAnim.setValue(1)
            bottomNameScaleYAnim.setValue(1)
            stateOpacityAnim.setValue(0)
            setFadeOutFinished(true)
            resolve()
          }
          return
        }

        if (prevHeaderState !== headerState) {
          timing(topNameScaleYAnim, {
            toValue: 0,
            duration: headerTransitionDelay,
            easing: Easing.linear,
          }).start()
          timing(nameFadeAnim, {
            toValue: 1,
            duration: headerTransitionDelay,
            easing: Easing.linear,
          }).start(({ finished }) => {
            if (finished) {
              setFadeOutFinished(true)
              resolve()
            }
          })
          timing(bottomNameScaleYAnim, {
            toValue: 1,
            duration: headerTransitionDelay,
            easing: Easing.linear,
          }).start()
          timing(stateOpacityAnim, {
            toValue: 0,
            duration: headerTransitionDelay,
            easing: Easing.linear,
          }).start()
        }
        if (prevBoundIsDifferent) {
          timing(boundOpacityAnim, {
            toValue: 0,
            duration: headerTransitionDelay,
            easing: Easing.linear,
          }).start()
        }
      }),
    [
      appState,
      bottomNameScaleYAnim,
      boundOpacityAnim,
      headerState,
      headerTransitionDelay,
      nameFadeAnim,
      prevBoundIsDifferent,
      prevHeaderState,
      selectedBound,
      stateOpacityAnim,
      topNameScaleYAnim,
    ]
  )

  const fadeOut = useCallback((): void => {
    if (!selectedBound) {
      return
    }

    nameFadeAnim.setValue(0)
    topNameScaleYAnim.setValue(1)
    stateOpacityAnim.setValue(1)
    boundOpacityAnim.setValue(1)
    bottomNameScaleYAnim.setValue(0)
  }, [
    selectedBound,
    nameFadeAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    boundOpacityAnim,
    bottomNameScaleYAnim,
  ])

  const prevIsJapaneseState = useLazyPrevious(isJapaneseState, fadeOutFinished)

  useEffect(() => {
    const updateAsync = async () => {
      setFadeOutFinished(false)

      if (headerState === prevHeaderState && !!selectedBound) {
        return
      }

      if (!selectedBound && station) {
        setStateText(translate('nowStoppingAt'))
        setStationText(station.name)
        setFadeOutFinished(true)
      }

      switch (headerState) {
        case 'ARRIVING':
          if (nextStation) {
            fadeOut()
            setStateText(translate(isLast ? 'soonLast' : 'soon'))
            setStationText(nextStation.name)
            await fadeIn()
          }
          break
        case 'ARRIVING_KANA':
          if (nextStation) {
            fadeOut()
            setStateText(translate(isLast ? 'soonKanaLast' : 'soon'))
            setStationText(katakanaToHiragana(nextStation.nameKatakana))
            await fadeIn()
          }
          break
        case 'ARRIVING_EN':
          if (nextStation) {
            fadeOut()
            setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'))
            setStationText(nextStation.nameRoman ?? '')
            await fadeIn()
          }
          break
        case 'ARRIVING_ZH':
          if (nextStation?.nameChinese) {
            fadeOut()
            setStateText(translate(isLast ? 'soonZhLast' : 'soonZh'))
            setStationText(nextStation.nameChinese)
            await fadeIn()
          }
          break
        case 'ARRIVING_KO':
          if (nextStation?.nameKorean) {
            fadeOut()
            setStateText(translate(isLast ? 'soonKoLast' : 'soonKo'))
            setStationText(nextStation.nameKorean)
            await fadeIn()
          }
          break
        case 'CURRENT':
          if (station) {
            fadeOut()
            setStateText(translate('nowStoppingAt'))
            setStationText(station.name)
            await fadeIn()
          }
          break
        case 'CURRENT_KANA':
          if (station) {
            fadeOut()
            setStateText(translate('nowStoppingAt'))
            setStationText(katakanaToHiragana(station.nameKatakana))
            await fadeIn()
          }
          break
        case 'CURRENT_EN':
          if (station) {
            fadeOut()
            setStateText('')
            setStationText(station.nameRoman ?? '')
            await fadeIn()
          }
          break
        case 'CURRENT_ZH':
          if (!station?.nameChinese) {
            break
          }
          fadeOut()
          setStateText('')
          setStationText(station.nameChinese)
          await fadeIn()
          break
        case 'CURRENT_KO':
          if (!station?.nameKorean) {
            break
          }
          fadeOut()
          setStateText('')
          setStationText(station.nameKorean)
          await fadeIn()
          break
        case 'NEXT':
          if (nextStation) {
            fadeOut()
            setStateText(translate(isLast ? 'nextLast' : 'next'))
            setStationText(nextStation.name)
            await fadeIn()
          }
          break
        case 'NEXT_KANA':
          if (nextStation) {
            fadeOut()
            setStateText(translate(isLast ? 'nextKanaLast' : 'nextKana'))
            setStationText(katakanaToHiragana(nextStation.nameKatakana))
            await fadeIn()
          }
          break
        case 'NEXT_EN':
          if (nextStation) {
            fadeOut()
            setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'))
            setStationText(nextStation.nameRoman ?? '')
            await fadeIn()
          }
          break
        case 'NEXT_ZH':
          if (nextStation?.nameChinese) {
            fadeOut()
            setStateText(translate(isLast ? 'nextZhLast' : 'nextZh'))
            setStationText(nextStation.nameChinese)
            await fadeIn()
          }
          break
        case 'NEXT_KO':
          if (nextStation?.nameKorean) {
            fadeOut()
            setStateText(translate(isLast ? 'nextKoLast' : 'nextKo'))
            setStationText(nextStation.nameKorean)
            await fadeIn()
          }
          break
        default:
          break
      }
    }

    updateAsync()
  }, [
    fadeIn,
    fadeOut,
    headerState,
    isLast,
    nextStation,
    prevHeaderState,
    selectedBound,
    station,
  ])

  const stateTopAnimatedStyles = {
    opacity: sub(1, stateOpacityAnim),
  }

  const stateBottomAnimatedStyles = {
    opacity: stateOpacityAnim,
  }

  const getTopNameAnimatedStyles = () => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }) as unknown as number,
        },
      ],
    }

    return withAnchorPoint(
      transform,
      { x: 0, y: 0 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    )
  }
  const getBottomNameAnimatedStyles = () => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim as unknown as number,
        },
      ],
    }
    return withAnchorPoint(
      transform,
      { x: 0, y: 1 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    )
  }

  const boundTopAnimatedStyles = {
    opacity: sub(1, boundOpacityAnim),
  }

  const boundBottomAnimatedStyles = {
    opacity: boundOpacityAnim,
  }

  const [currentStationNumber, threeLetterCode] = useNumbering()
  const lineColor = useMemo(() => currentLine?.color, [currentLine])
  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        currentStationNumber,
        nextStation,
        currentLine
      ),
    [arrived, currentStationNumber, currentLine, nextStation]
  )

  return (
    <View>
      <VisitorsPanel />
      <HeaderBar height={15} lineColor={lineColor || '#00ac9a'} />
      <View style={{ backgroundColor: 'white', height: 2, opacity: 0.5 }} />
      <LinearGradient
        colors={['#aaa', '#fcfcfc']}
        locations={[0, 0.2]}
        style={styles.gradientRoot}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBox
            lineColor={lineColor || '#00ac9a'}
            trainType={trainType}
          />
          <View style={styles.boundWrapper}>
            <Animated.Text
              style={[boundTopAnimatedStyles, styles.boundTextContainer]}
            >
              <Typography style={styles.connectedLines}>
                {connectedLines?.length && isJapaneseState
                  ? `${connectionText}直通 `
                  : null}
              </Typography>
              <Typography style={styles.boundText}>{boundText}</Typography>
            </Animated.Text>

            <Animated.Text
              style={[boundBottomAnimatedStyles, styles.boundTextContainer]}
            >
              <Typography style={styles.connectedLines}>
                {connectedLines?.length && prevIsJapaneseState
                  ? `${prevConnectionText}直通 `
                  : null}
              </Typography>
              <Typography style={styles.boundText}>{prevBoundText}</Typography>
            </Animated.Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Animated.Text
              adjustsFontSizeToFit
              numberOfLines={stateText.includes('\n') ? 2 : 1}
              style={[
                stateTopAnimatedStyles,
                styles.state,
                {
                  height: stateText.includes('\n')
                    ? STATION_NAME_FONT_SIZE
                    : undefined,
                },
              ]}
            >
              {stateText}
            </Animated.Text>
            <Animated.Text
              adjustsFontSizeToFit
              numberOfLines={prevStateText.includes('\n') ? 2 : 1}
              style={[
                stateBottomAnimatedStyles,
                styles.state,
                {
                  height: prevStateText.includes('\n')
                    ? STATION_NAME_FONT_SIZE
                    : undefined,
                },
              ]}
            >
              {prevStateText}
            </Animated.Text>
          </View>

          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber}
              threeLetterCode={threeLetterCode}
              allowScaling
            />
          ) : null}

          <View>
            <View style={styles.stationNameWrapper}>
              <View style={styles.stationNameContainer}>
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[
                    getTopNameAnimatedStyles(),
                    styles.stationName,
                    {
                      opacity: nameFadeAnim,
                      fontSize: STATION_NAME_FONT_SIZE,
                    },
                  ]}
                >
                  {stationText}
                </Animated.Text>
              </View>

              <View style={styles.stationNameContainer}>
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[
                    styles.stationName,
                    getBottomNameAnimatedStyles(),
                    {
                      opacity: nameFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                      fontSize: STATION_NAME_FONT_SIZE,
                    },
                  ]}
                >
                  {prevStationText}
                </Animated.Text>
              </View>
            </View>
          </View>
        </View>
        <Clock
          bold
          style={{ ...styles.clockOverride, right: 8 + safeAreaRight }}
        />
      </LinearGradient>
      <HeaderBar height={5} lineColor={lineColor || '#00ac9a'} />
    </View>
  )
}

export default React.memo(HeaderSaikyo)
