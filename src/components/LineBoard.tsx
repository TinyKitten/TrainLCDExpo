import React, { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import { StopCondition } from '../gen/stationapi_pb'
import useCurrentStation from '../hooks/useCurrentStation'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import themeState from '../store/atoms/theme'
import { isJapanese, translate } from '../translation'
import isFullSizedTablet from '../utils/isFullSizedTablet'
import isTablet from '../utils/isTablet'
import LineBoardEast from './LineBoardEast'
import LineBoardJO from './LineBoardJO'
import LineBoardLED from './LineBoardLED'
import LineBoardSaikyo from './LineBoardSaikyo'
import LineBoardWest from './LineBoardWest'
import LineBoardYamanotePad from './LineBoardYamanotePad'
import Typography from './Typography'
import mirroringShareState from '../store/atoms/mirroringShare'
import Loading from './Loading'

export interface Props {
  hasTerminus?: boolean
}

const styles = StyleSheet.create({
  bottomNotice: {
    position: 'absolute',
    bottom: isTablet ? 96 : 12,
    fontWeight: 'bold',
    fontSize: RFValue(12),
  },
  loadingText: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: 'bold',
    alignSelf: 'center',
    bottom: 32,
    fontSize: RFValue(14),
  },
})

const LineBoard: React.FC<Props> = ({ hasTerminus = false }: Props) => {
  const { theme } = useRecoilValue(themeState)
  const { leftStations } = useRecoilValue(navigationState)
  const { subscribing } = useRecoilValue(mirroringShareState)

  const currentStation = useCurrentStation()

  const slicedLeftStations = useMemo(
    () => leftStations.slice(0, 8),
    [leftStations]
  )

  const currentStationIndex = useMemo(
    () =>
      slicedLeftStations.findIndex((s) => {
        return s.groupId === currentStation?.groupId
      }),
    [slicedLeftStations, currentStation?.groupId]
  )
  const slicedLeftStationsForYamanote = useMemo(
    () => slicedLeftStations.slice(currentStationIndex, 8),
    [currentStationIndex, slicedLeftStations]
  )

  const passStations = useMemo(
    () =>
      slicedLeftStations.filter(
        (s) =>
          s.stopCondition === StopCondition.PARTIAL ||
          s.stopCondition === StopCondition.PARTIALSTOP
      ),
    [slicedLeftStations]
  )

  const lineColors = useMemo(
    () => slicedLeftStations.map((s) => s.line?.color),
    [slicedLeftStations]
  )

  // [重要] 依存変数をすべてメモ化しないと山手線iPadテーマのアニメーションが何度も走る
  const Inner = useCallback(() => {
    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TY:
      case APP_THEME.TOEI:
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
            withExtraLanguage={theme === APP_THEME.TOEI}
          />
        )
      case APP_THEME.JR_WEST:
        return (
          <LineBoardWest
            lineColors={lineColors}
            stations={slicedLeftStations}
          />
        )
      case APP_THEME.SAIKYO:
        return (
          <LineBoardSaikyo
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        )
      case APP_THEME.YAMANOTE:
        if (isFullSizedTablet) {
          return (
            <LineBoardYamanotePad stations={slicedLeftStationsForYamanote} />
          )
        }
        return (
          <LineBoardJO stations={slicedLeftStations} lineColors={lineColors} />
        )
      case APP_THEME.LED:
        return <LineBoardLED />
      case APP_THEME.JO:
        return (
          <LineBoardJO stations={slicedLeftStations} lineColors={lineColors} />
        )
      default:
        return null
    }
  }, [
    hasTerminus,
    lineColors,
    slicedLeftStations,
    slicedLeftStationsForYamanote,
    theme,
  ])

  const { left: safeAreaLeft } = useSafeAreaInsets()
  const isLEDTheme = useIsLEDTheme()

  if (subscribing && !currentStation) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <Loading />
        <Typography style={styles.loadingText}>
          {translate('awaitingLatestData')}
        </Typography>
      </View>
    )
  }

  return (
    <>
      <Inner />
      {passStations.length && !isLEDTheme ? (
        <Typography
          style={[
            styles.bottomNotice,
            {
              color: '#3a3a3a',
              left: safeAreaLeft || 16,
            },
          ]}
        >
          {translate('partiallyPassBottomNotice', {
            stations: isJapanese
              ? passStations.map((s) => s.name).join('、')
              : ` ${passStations.map((s) => s.nameRoman).join(', ')}`,
          })}
        </Typography>
      ) : null}
    </>
  )
}

export default React.memo(LineBoard)
