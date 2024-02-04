import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import { Line, StationNumber } from '../../gen/proto/stationapi_pb'
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants'
import useGetLineMark from '../hooks/useGetLineMark'
import { useNextStation } from '../hooks/useNextStation'
import useTransferLines from '../hooks/useTransferLines'
import { APP_THEME, AppTheme } from '../models/Theme'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import { isLEDSelector } from '../store/selectors/isLED'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import Heading from './Heading'
import NumberingIcon from './NumberingIcon'
import TransferLineDot from './TransferLineDot'
import TransferLineMark from './TransferLineMark'
import Typography from './Typography'

interface Props {
  onPress: () => void
  theme: AppTheme
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    flex: 1,
  },
  transferLine: {
    flexDirection: 'row',
    marginBottom: isTablet ? 16 : 8,
  },
  transferView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: isTablet ? 32 : 24,
    paddingBottom: isTablet ? 128 : 84,
  },
  transferLineInnerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '50%',
    paddingLeft: isTablet ? '15%' : '5%',
  },
  transferLineInnerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '50%',
  },
  lineNameContainer: {
    marginLeft: isTablet ? 4 : 2,
  },
  lineName: {
    fontSize: RFValue(18),
    color: '#333',
    fontWeight: 'bold',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
  headingContainerMetro: {
    height: RFValue(32),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headingContainerSaikyo: {
    marginTop: 24,
    width: '75%',
    alignSelf: 'center',
    zIndex: 1,
  },
  numberingIconContainer: {
    width: (isTablet ? 72 * 1.5 : 72) / 1.25,
    height: (isTablet ? 72 * 1.5 : 72) / 1.25,
    transform: [{ scale: 0.5 }],
  },
})

const Transfers: React.FC<Props> = ({ onPress, theme }: Props) => {
  const { arrived } = useRecoilValue(stationState)
  const currentStation = useRecoilValue(currentStationSelector({}))

  const lines = useTransferLines()
  const nextStation = useNextStation()
  const getLineMarkFunc = useGetLineMark()
  const isLEDTheme = useRecoilValue(isLEDSelector)

  const station = useMemo(
    () => (arrived ? currentStation : nextStation),
    [arrived, currentStation, nextStation]
  )

  const stationNumbers = useMemo(
    () =>
      lines
        ?.map((l) => new Line(l))
        ?.map<StationNumber>((l) => {
          const lineSymbol =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.lineSymbol ?? ''
          const lineSymbolColor =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.lineSymbolColor ?? ''
          const stationNumber =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.stationNumber ?? ''
          const lineSymbolShape =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.lineSymbolShape ?? 'NOOP'

          if (!lineSymbol.length || !stationNumber.length) {
            const stationNumberWhenEmptySymbol =
              l.station?.stationNumbers
                ?.find((sn) => !sn.lineSymbol.length)
                ?.stationNumber?.slice(1) ?? ''
            const lineSymbolColorWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol.length)
                ?.lineSymbolColor ?? '#000000'
            const lineSymbolShapeWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol.length)
                ?.lineSymbolShape ?? 'NOOP'

            return new StationNumber({
              lineSymbol: stationNumberWhenEmptySymbol,
              lineSymbolColor: lineSymbolColorWhenEmptySymbol,
              stationNumber: stationNumberWhenEmptySymbol,
              lineSymbolShape: lineSymbolShapeWhenEmptySymbol,
            })
          }

          return new StationNumber({
            lineSymbol,
            lineSymbolColor,
            stationNumber,
            lineSymbolShape,
          })
        }),
    [lines]
  )

  const renderTransferLines = useCallback(
    (): (JSX.Element | null)[] =>
      lines.map((line, index) => {
        if (!station) {
          return null
        }
        const lineMark = getLineMarkFunc({
          line,
        })
        const includesNumberedStation = stationNumbers.some(
          (sn) => !!sn?.stationNumber
        )
        return (
          <View style={styles.transferLine} key={line.id}>
            <View style={styles.transferLineInnerLeft}>
              {lineMark ? (
                <TransferLineMark
                  line={line}
                  mark={lineMark}
                  size={NUMBERING_ICON_SIZE.MEDIUM}
                />
              ) : (
                <TransferLineDot line={line} />
              )}
              <View style={styles.lineNameContainer}>
                <Typography style={styles.lineName}>
                  {line.nameShort.replace(parenthesisRegexp, '')}
                </Typography>
                <Typography style={styles.lineNameEn}>
                  {line.nameRoman?.replace(parenthesisRegexp, '')}
                </Typography>
                {!!line.nameChinese?.length && !!line.nameKorean?.length ? (
                  <Typography style={styles.lineNameEn}>
                    {`${line.nameChinese.replace(
                      parenthesisRegexp,
                      ''
                    )} / ${line.nameKorean.replace(parenthesisRegexp, '')}`}
                  </Typography>
                ) : null}
              </View>
            </View>
            {includesNumberedStation ? (
              <View style={styles.transferLineInnerRight}>
                {stationNumbers[index] ? (
                  <View style={styles.numberingIconContainer}>
                    <NumberingIcon
                      shape={stationNumbers[index].lineSymbolShape}
                      lineColor={stationNumbers[index]?.lineSymbolColor}
                      stationNumber={stationNumbers[index]?.stationNumber ?? ''}
                      allowScaling={false}
                    />
                  </View>
                ) : (
                  <View style={styles.numberingIconContainer} />
                )}
                {line.station && (
                  <View>
                    <Typography style={styles.lineName}>
                      {`${line.station?.name.replace(parenthesisRegexp, '')}駅`}
                    </Typography>
                    <Typography style={styles.lineNameEn}>
                      {`${(line.station?.nameRoman ?? '').replace(
                        parenthesisRegexp,
                        ''
                      )} Sta.`}
                    </Typography>
                    <Typography style={styles.lineNameEn}>
                      {`${(line.station?.nameChinese ?? '').replace(
                        parenthesisRegexp,
                        ''
                      )}站 / ${(line.station?.nameKorean ?? '').replace(
                        parenthesisRegexp,
                        ''
                      )}역`}
                    </Typography>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        )
      }),
    [getLineMarkFunc, lines, station, stationNumbers]
  )

  const CustomHeading = () => {
    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TY:
      case APP_THEME.TOEI:
        return (
          <LinearGradient
            colors={['#fcfcfc', '#f5f5f5', '#ddd']}
            locations={[0, 0.95, 1]}
            style={styles.headingContainerMetro}
          >
            <Heading>{translate('transfer')}</Heading>
          </LinearGradient>
        )
      case APP_THEME.SAIKYO:
        return (
          <LinearGradient
            colors={['white', '#ccc', '#ccc', 'white']}
            start={[0, 1]}
            end={[1, 0]}
            locations={[0, 0.1, 0.9, 1]}
            style={styles.headingContainerSaikyo}
          >
            <Heading style={{ color: '#212121', fontWeight: '600' }}>
              {translate('transfer')}
            </Heading>
          </LinearGradient>
        )
      default:
        return null
    }
  }

  if (isLEDTheme) {
    return null
  }

  return (
    <>
      <CustomHeading />
      <ScrollView style={styles.scrollViewContainer}>
        <Pressable onPress={onPress}>
          <SafeAreaView style={styles.transferView}>
            {renderTransferLines()}
          </SafeAreaView>
        </Pressable>
      </ScrollView>
    </>
  )
}

export default React.memo(Transfers)
