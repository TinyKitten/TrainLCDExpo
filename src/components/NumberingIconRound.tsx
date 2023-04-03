import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { NUMBERING_ICON_SIZE, NumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 8 * 1.5 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#221714',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  rootTiny: {
    width: 20,
    height: 20,
    borderRadius: 25.6 / 2,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  rootSmall: {
    width: 38,
    height: 38,
    borderRadius: 38 / 2,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: (isTablet ? 35 * 1.5 : 35) / 2,
    borderWidth: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbolTiny: {
    color: '#221714',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolSmall: {
    color: '#221714',
    fontSize: 18,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolMedium: {
    color: '#221714',
    fontSize: 20,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolSmallLong: {
    color: '#221714',
    fontSize: 12,
    lineHeight: 12,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  stationNumber: {
    color: '#221714',
    fontSize: isTablet ? 26 * 1.5 : 26,
    lineHeight: isTablet ? 26 * 1.5 : 26,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? -4 : -2,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
});

const NumberingIconRound: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');
  const isIncludesSubNumber = stationNumber.includes('-');
  const stationNumberTextStyles = useMemo(() => {
    if (isIncludesSubNumber) {
      return [styles.stationNumber, styles.longStationNumberAdditional];
    }
    return styles.stationNumber;
  }, [isIncludesSubNumber]);

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <Text style={styles.lineSymbolTiny}>{lineSymbol}</Text>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { borderColor: lineColor }]}>
        <Text style={styles.lineSymbolMedium}>{lineSymbol}</Text>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Text
          style={
            lineSymbol.length === 2
              ? styles.lineSymbolSmallLong
              : styles.lineSymbolSmall
          }
        >
          {lineSymbol}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      {stationNumber ? (
        <Text style={stationNumberTextStyles}>{stationNumber}</Text>
      ) : null}
    </View>
  );
};

NumberingIconRound.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
};

export default NumberingIconRound;
