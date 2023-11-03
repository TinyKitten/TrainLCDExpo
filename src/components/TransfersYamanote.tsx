import React, { useMemo } from 'react'
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Station } from '../gen/stationapi_pb'
import useGetLineMark from '../hooks/useGetLineMark'
import useTransferLines from '../hooks/useTransferLines'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import TransferLineDot from './TransferLineDot'
import TransferLineMark from './TransferLineMark'
import Typography from './Typography'
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants'

interface Props {
  onPress: () => void
  station: Station.AsObject
}

const styles = StyleSheet.create({
  transferLine: {
    flex: isTablet ? 0 : 1,
    marginBottom: isTablet ? 32 : 8,
  },
  header: {
    backgroundColor: '#ccc',
    alignItems: 'center',
    padding: 4,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: isTablet ? 32 : 24,
    padding: 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineNameContainer: {
    width: '100%',
  },
  lineName: {
    fontSize: RFValue(18),
    color: '#333',
    fontWeight: 'bold',
    width: '85%',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
})

const TransfersYamanote: React.FC<Props> = ({ onPress, station }: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets()
  const getLineMarkFunc = useGetLineMark()
  const lines = useTransferLines()

  const flexBasis = useMemo(() => Dimensions.get('window').width / 3, [])

  const renderTransferLines = (): (JSX.Element | null)[] =>
    lines.map((line) => {
      if (!station) {
        return null
      }
      const lineMark = getLineMarkFunc({ line })

      return (
        <View
          style={[
            styles.transferLine,
            {
              marginLeft: safeAreaLeft,
              marginRight: safeAreaRight,
              flexBasis,
            },
          ]}
          key={line.id}
        >
          <View style={styles.transferLineInner}>
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
            </View>
          </View>
        </View>
      )
    })

  return (
    <ScrollView>
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={styles.header}>
          <Typography style={styles.headerText}>
            {translate('transferYamanote')}
          </Typography>
        </View>

        <View style={styles.transferList}>{renderTransferLines()}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
  )
}

export default TransfersYamanote
