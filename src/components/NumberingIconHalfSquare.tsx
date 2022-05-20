import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FONTS from '../constants/fonts';
import isTablet from '../utils/isTablet';

type Props = {
  stationNumber: string;
  lineColor: string;
  withRadius: boolean;
  small?: boolean;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  rootSmall: {
    width: isTablet ? 38 * 1.5 : 38,
    height: isTablet ? 38 * 1.5 : 38,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 22 * 1.5 : 22,
    lineHeight: isTablet ? 22 * 1.5 : 22,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: 4,
  },
  lineSymbolSmall: {
    color: 'white',
    fontSize: isTablet ? 11 * 1.5 : 14,
    lineHeight: isTablet ? 11 * 1.5 : 14,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
  stationNumberContainer: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    width: isTablet ? 55 * 1.5 : 55,
    height: isTablet ? 34 * 1.5 : 34,
  },
  stationNumber: {
    color: '#231f20',
    fontSize: isTablet ? 37 * 1.5 : 37,
    lineHeight: isTablet ? 37 * 1.5 : 37,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
  stationNumberContainerSmall: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    width: isTablet ? 38 * 0.8 * 1.5 : 38 * 0.8,
    height: isTablet ? 38 * 0.45 * 1.5 : 38 * 0.45,
  },
  stationNumberSmall: {
    color: '#231f20',
    fontSize: isTablet ? 18.5 * 1.5 : 18.5,
    lineHeight: isTablet ? 18.5 * 1.5 : 18.5,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconHalfSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  withRadius,
  small,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  const borderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    if (small) {
      return isTablet ? 4 * 1.5 : 4;
    }

    return isTablet ? 8 * 1.5 : 8;
  }, [small, withRadius]);
  const stationNumberContainerBorderRadius = useMemo(() => {
    if (!withRadius) {
      return 0;
    }

    return isTablet ? 2 * 1.5 : 2;
  }, [withRadius]);

  if (small) {
    return (
      <View
        style={[styles.rootSmall, { borderRadius, backgroundColor: lineColor }]}
      >
        <Text style={styles.lineSymbolSmall}>{lineSymbol}</Text>
        <View
          style={[
            styles.stationNumberContainerSmall,
            { borderRadius: stationNumberContainerBorderRadius },
          ]}
        >
          <Text style={styles.stationNumberSmall}>{stationNumber}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { borderRadius, backgroundColor: lineColor }]}>
      <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      <View
        style={[
          styles.stationNumberContainer,
          { borderRadius: stationNumberContainerBorderRadius },
        ]}
      >
        <Text style={styles.stationNumber}>{stationNumber}</Text>
      </View>
    </View>
  );
};

NumberingIconHalfSquare.defaultProps = { small: false };

export default NumberingIconHalfSquare;
