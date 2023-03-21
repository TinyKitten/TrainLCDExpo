import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import isTablet from '../utils/isTablet';

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 6 * 1.5 : 6,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  stationNumber: {
    color: 'black',
    fontSize: isTablet ? 35 * 1.5 : 35,
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: 'red',
  },
});

type Props = {
  stationNumber: string;
};

const NumberingIconMonochromeRound: React.FC<Props> = ({ stationNumber }) => {
  return (
    <View style={styles.root}>
      <Text style={styles.stationNumber}>{stationNumber}</Text>
    </View>
  );
};

export default NumberingIconMonochromeRound;
