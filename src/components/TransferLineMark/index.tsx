import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { LineMark, MarkShape } from '../../lineMark';
import { Line } from '../../models/StationAPI';

interface Props {
  line: Line;
  mark: LineMark;
  small?: boolean;
  white?: boolean;
}

const TransferLineMark: React.FC<Props> = ({
  line,
  mark,
  small,
  white,
}: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
    },
    lineMarkSquare: {
      borderWidth: 4,
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 1,
    },
    lineMarkReversedSquare: {
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 1,
    },
    lineMarkRound: {
      borderWidth: small ? 4 : 6,
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    lineMarkReversedRound: {
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
      borderRadius: small ? 25.6 : 38,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lineSignSingle: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 21 : 32,
      color: white ? '#fff' : '#333',
    },
    lineSignDouble: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 14 : 24,
      color: white ? '#fff' : '#333',
    },
    roundLineSignSingle: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 12 : 21,
      color: white ? '#fff' : '#000',
    },
    roundLineSignDouble: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 8 : 14,
      color: white ? '#fff' : '#000',
    },
    reversedRoundLineSignSingle: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 18 : 28,
      color: white ? '#fff' : '#000',
    },
    reversedRoundLineSignDouble: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 14 : 24,
      color: white ? '#fff' : '#000',
    },
    reversedText: {
      color: '#fff',
    },
    lineMarkImage: {
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
    },
    signPathWrapper: {
      flexDirection: 'row',
    },
  });

  if (mark.signPath && mark.subSignPath) {
    return (
      <View style={styles.signPathWrapper}>
        <FastImage
          style={styles.lineMarkImage}
          source={mark.signPath as unknown}
        />
        <FastImage
          style={styles.lineMarkImage}
          source={mark.subSignPath as unknown}
        />
      </View>
    );
  }
  if (mark.signPath) {
    return (
      <FastImage
        style={styles.lineMarkImage}
        source={mark.signPath as unknown}
      />
    );
  }
  if (mark.subSign) {
    switch (mark.shape) {
      case MarkShape.square:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkSquare,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={
                  mark.sign.length === 1
                    ? styles.lineSignSingle
                    : styles.lineSignDouble
                }
              >
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkSquare,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={styles.lineSignSingle}>{mark.subSign}</Text>
            </View>
          </View>
        );
      case MarkShape.reversedSquare:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkReversedSquare,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={[
                  mark.sign.length === 1
                    ? styles.lineSignSingle
                    : styles.lineSignDouble,
                  styles.reversedText,
                ]}
              >
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkReversedSquare,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={[
                  mark.sign.length === 1
                    ? styles.lineSignSingle
                    : styles.lineSignDouble,
                  styles.reversedText,
                ]}
              >
                {mark.subSign}
              </Text>
            </View>
          </View>
        );
      case MarkShape.round:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkRound,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={
                  mark.sign.length === 1
                    ? styles.roundLineSignSingle
                    : styles.roundLineSignDouble
                }
              >
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkRound,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={
                  mark.sign.length === 1
                    ? styles.roundLineSignSingle
                    : styles.roundLineSignDouble
                }
              >
                {mark.subSign}
              </Text>
            </View>
          </View>
        );
      case MarkShape.reversedRound:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkReversedRound,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={[
                  mark.sign.length === 1
                    ? styles.reversedRoundLineSignSingle
                    : styles.reversedRoundLineSignDouble,
                  styles.reversedText,
                ]}
              >
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkReversedRound,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={[
                  mark.sign.length === 1
                    ? styles.roundLineSignSingle
                    : styles.roundLineSignDouble,
                ]}
              >
                {mark.subSign}
              </Text>
            </View>
          </View>
        );
      default:
        return <></>;
    }
  }
  switch (mark.shape) {
    case MarkShape.square:
      return (
        <View
          style={[
            styles.lineMarkSquare,
            { borderColor: `#${line.lineColorC}` },
          ]}
        >
          <Text
            style={
              mark.sign.length === 1
                ? styles.lineSignSingle
                : styles.lineSignDouble
            }
          >
            {mark.sign}
          </Text>
        </View>
      );
    case MarkShape.reversedSquare:
      return (
        <View
          style={[
            styles.lineMarkReversedSquare,
            { backgroundColor: `#${line.lineColorC}` },
          ]}
        >
          <Text
            style={[
              mark.sign.length === 1
                ? styles.lineSignSingle
                : styles.lineSignDouble,
              styles.reversedText,
            ]}
          >
            {mark.sign}
          </Text>
        </View>
      );
    case MarkShape.round:
      return (
        <View
          style={[styles.lineMarkRound, { borderColor: `#${line.lineColorC}` }]}
        >
          <Text
            style={
              mark.sign.length === 1
                ? styles.roundLineSignSingle
                : styles.roundLineSignDouble
            }
          >
            {mark.sign}
          </Text>
        </View>
      );
    case MarkShape.reversedRound:
      return (
        <View
          style={[
            styles.lineMarkReversedRound,
            { backgroundColor: `#${line.lineColorC}` },
          ]}
        >
          <Text
            style={[
              mark.sign.length === 1
                ? styles.reversedRoundLineSignSingle
                : styles.reversedRoundLineSignDouble,
              styles.reversedText,
            ]}
          >
            {mark.sign}
          </Text>
        </View>
      );
    default:
      return <></>;
  }
};

TransferLineMark.defaultProps = {
  small: undefined,
  white: false,
};

export default TransferLineMark;
