import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { CommonNumberingIconSize } from '../constants/numbering';
import isTablet from '../utils/isTablet';

type Props = {
  fullStationNumber: string;
  lineColor: string;
  size?: CommonNumberingIconSize;
};

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 64 * 1.5 : 64,
    height: isTablet ? 64 * 1.5 : 64,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 4,
    borderRadius: (isTablet ? 64 * 1.5 : 64) / 2,
    overflow: 'hidden',
  },
  lineSymbolContainer: {
    flex: 0.75,
    width: '100%',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? RFValue(18 * 1.2) : RFValue(18),
    lineHeight: isTablet ? RFValue(18 * 1.2) : RFValue(18),
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 4,
  },
  stationNumber: {
    flex: 1,
    color: '#231f20',
    fontSize: isTablet ? RFValue(25 * 1.2) : RFValue(25),
    lineHeight: isTablet ? RFValue(25 * 1.2) : RFValue(25),
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

const NumberingIconKeio: React.FC<Props> = ({
  fullStationNumber,
  lineColor,
  size = 'normal',
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = fullStationNumber.split('-');
  const stationNumber = stationNumberRest.join('');

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <View
        style={[styles.lineSymbolContainer, { backgroundColor: lineColor }]}
      >
        <Text style={styles.lineSymbol}>{lineSymbol}</Text>
      </View>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

NumberingIconKeio.defaultProps = {
  size: undefined,
};

export default NumberingIconKeio;
