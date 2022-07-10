import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import { NumberingIconSize } from '../constants/numbering';
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
    borderWidth: isTablet ? 4 * 1.5 : 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    fontSize: isTablet ? 21 * 1.5 : 21,
    lineHeight: isTablet ? 21 * 1.5 : 21,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
    marginTop: isTablet ? 4 : 2,
  },
  rootTiny: {
    width: 25.6,
    height: 25.6,
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
  lineSymbolTiny: {
    fontSize: 14,
    lineHeight: 14,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
    marginTop: 2,
  },
  lineSymbolSmall: {
    fontSize: 18,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
  },
  lineSymbolSmallLong: {
    fontSize: 12,
    lineHeight: 12,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
  },
  stationNumber: {
    fontSize: isTablet ? 35 * 1.5 : 35,
    lineHeight: isTablet ? 35 * 1.5 : 35,
    textAlign: 'center',
    fontFamily: FONTS.VerdanaBold,
    marginTop: isTablet ? -4 : -2,
  },
});

const NumberingIconHanshin: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  if (size === 'tiny') {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <Text style={[styles.lineSymbolTiny, { color: lineColor }]}>
          {lineSymbol}
        </Text>
      </View>
    );
  }

  if (size === 'small') {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Text
          style={[
            lineSymbol.length === 2
              ? styles.lineSymbolSmallLong
              : styles.lineSymbolSmall,
            { color: lineColor },
          ]}
        >
          {lineSymbol}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text style={[styles.lineSymbol, { color: lineColor }]}>
        {lineSymbol}
      </Text>
      <Text style={[styles.stationNumber, { color: lineColor }]}>
        {stationNumber}
      </Text>
    </View>
  );
};

NumberingIconHanshin.defaultProps = {
  size: 'default',
};

export default NumberingIconHanshin;
