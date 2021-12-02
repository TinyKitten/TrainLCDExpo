import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Line } from '../../models/StationAPI';

interface Props {
  line: Line;
  small?: boolean;
  shouldGrayscale?: boolean;
}

const TransferLineDot: React.FC<Props> = ({
  line,
  small,
  shouldGrayscale,
}: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      borderRadius: 1,
      marginRight: 4,
    },
  });

  return (
    <View
      style={[
        styles.lineDot,
        { backgroundColor: !shouldGrayscale ? `#${line.lineColorC}` : 'gray' },
      ]}
    />
  );
};

TransferLineDot.defaultProps = {
  small: false,
  shouldGrayscale: false,
};

export default TransferLineDot;
