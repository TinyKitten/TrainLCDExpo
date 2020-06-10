import i18n from 'i18n-js';
import React, { useState, useCallback, memo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  PlatformIOSStatic,
  StyleProp,
  TextStyle,
} from 'react-native';

import { Line, Station } from '../../models/StationAPI';
import Chevron from '../Chevron';
import { getLineMark } from '../../lineMark';
import { filterWithoutCurrentLine } from '../../utils/line';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';

interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
}

const { isPad } = Platform as PlatformIOSStatic;

const LineBoardWest: React.FC<Props> = ({ arrived, stations, line }: Props) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );

  const isJaLocale = i18n.locale === 'ja';

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
    setWindowHeight(Dimensions.get('window').height);
  };

  const getStationNameEnLineHeight = useCallback((): number => {
    if (Platform.OS === 'android') {
      return 24;
    }
    if (isPad) {
      return 28;
    }
    return 21;
  }, []);

  const getStationNameEnExtraStyle = useCallback((isLast: boolean): StyleProp<
    TextStyle
  > => {
    if (!isPad) {
      return {
        width: 200,
        marginBottom: 64,
      };
    }
    if (isLast) {
      return {
        width: 200,
        marginBottom: 70,
      };
    }
    return {
      width: 250,
      marginBottom: 84,
    };
  }, []);

  const stationNameEnLineHeight = getStationNameEnLineHeight();

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      height: windowHeight,
      bottom: isPad ? windowHeight / 2.5 : undefined,
    },
    bar: {
      backgroundColor: `#${line.lineColorC}`,
      position: 'absolute',
      bottom: isPad ? 32 : 48,
      width: isPad ? windowWidth - 72 : windowWidth - 48,
      height: isPad ? 64 : 32,
      shadowColor: '#212121',
      shadowOffset: {
        width: 0,
        height: isPad ? 8 : 4,
      },
      shadowRadius: 0,
      shadowOpacity: 1,
    },
    barTerminal: {
      left: isPad ? windowWidth - 72 + 6 : windowWidth - 48 + 6,
      position: 'absolute',
      width: 0,
      height: 0,
      bottom: isPad ? 32 : 48,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: isPad ? 32 : 16,
      borderRightWidth: isPad ? 32 : 16,
      borderBottomWidth: isPad ? 64 : 32,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      transform: [{ rotate: '90deg' }],
      margin: 0,
      marginLeft: -6,
      borderWidth: 0,
      borderBottomColor: `#${line.lineColorC}`,
      shadowColor: '#212121',
      shadowOffset: {
        width: isPad ? 8 : 4,
        height: 0,
      },
      shadowRadius: 0,
      shadowOpacity: 1,
    },
    stationNameWrapper: {
      flexDirection: 'row',
      justifyContent: isPad ? 'space-between' : undefined,
      marginLeft: 32,
      flex: 1,
    },
    stationNameContainer: {
      width: windowWidth / 9,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      bottom: isPad ? 110 : undefined,
      paddingBottom: !isPad ? 96 : undefined,
    },
    stationName: {
      width: isPad ? 48 : 32,
      textAlign: 'center',
      fontSize: isPad ? 32 : 21,
      lineHeight: stationNameEnLineHeight,
      fontWeight: 'bold',
    },
    stationNameEn: {
      fontSize: isPad ? 28 : 21,
      lineHeight: stationNameEnLineHeight,
      transform: [{ rotate: '-55deg' }],
      fontWeight: 'bold',
      marginLeft: -30,
    },
    grayColor: {
      color: '#ccc',
    },
    rotatedStationName: {
      width: 'auto',
      transform: [{ rotate: '-55deg' }],
      marginBottom: 8,
      paddingBottom: 0,
      fontSize: 21,
    },
    lineDot: {
      width: isPad ? 48 : 28,
      height: isPad ? 48 : 28,
      position: 'absolute',
      zIndex: 9999,
      bottom: isPad ? -70 : 50,
      overflow: 'visible',
      backgroundColor: '#fff',
      borderRadius: 24,
    },
    arrivedLineDot: {
      backgroundColor: 'crimson',
      width: isPad ? 44 : 24,
      height: isPad ? 44 : 24,
      borderRadius: 22,
      position: 'absolute',
      left: 2,
      top: 2,
    },
    chevron: {
      marginLeft: isPad ? 57 : 38,
      width: isPad ? 48 : 32,
      height: isPad ? 48 : 24,
      marginTop: isPad ? undefined : 2,
    },
    chevronArrived: {
      marginLeft: 0,
    },
  });

  const includesLongStatioName = !!stations.filter(
    (s) => s.name.includes('ー') || s.name.length > 6
  ).length;

  interface StationNameProps {
    station: Station;
    en?: boolean;
    horizonal?: boolean;
    passed?: boolean;
    index: number;
  }

  const StationName: React.FC<StationNameProps> = ({
    station,
    en,
    horizonal,
    passed,
    index,
  }: StationNameProps) => {
    if (en) {
      return (
        <Text
          style={[
            styles.stationNameEn,
            getStationNameEnExtraStyle(index === stations.length - 1),
            passed ? styles.grayColor : null,
          ]}
        >
          {station.nameR}
        </Text>
      );
    }
    if (horizonal) {
      return (
        <Text
          style={[
            styles.stationNameEn,
            getStationNameEnExtraStyle(index === stations.length - 1),
            passed ? styles.grayColor : null,
          ]}
        >
          {station.name}
        </Text>
      );
    }
    return (
      <>
        {station.name.split('').map((c, j) => (
          <Text
            style={[styles.stationName, passed ? styles.grayColor : null]}
            key={`${j + 1}${c}`}
          >
            {c}
          </Text>
        ))}
      </>
    );
  };

  interface StationNamesWrapperProps {
    station: Station;
    passed: boolean;
    index: number;
  }

  const StationNamesWrapper: React.FC<StationNamesWrapperProps> = ({
    station,
    passed,
    index,
  }: StationNamesWrapperProps) => {
    return (
      <StationName
        station={station}
        en={!isJaLocale}
        horizonal={includesLongStatioName}
        passed={passed}
        index={index}
      />
    );
  };

  interface StationNameCellProps {
    station: Station;
    index: number;
  }

  const StationNameCell: React.FC<StationNameCellProps> = ({
    station,
    index,
  }: StationNameCellProps) => {
    const passed = !index && !arrived;
    const transferLines = filterWithoutCurrentLine(stations, line, index);
    const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);
    const lineMarks = omittedTransferLines.map((l) => getLineMark(l));
    const getLocalizedLineName = useCallback((l: Line) => {
      if (i18n.locale === 'ja') {
        return l.name;
      }
      return l.nameR;
    }, []);

    const PadLineMarks: React.FC = () => {
      if (!isPad) {
        return <></>;
      }
      const padLineMarksStyle = StyleSheet.create({
        root: {
          marginTop: 16,
        },
        topBar: {
          width: 8,
          height: 16,
          marginTop: -4,
          backgroundColor: '#333',
          alignSelf: 'center',
        },
        lineMarkWrapper: {
          marginTop: 4,
          width: windowWidth / 10,
          flexDirection: 'row',
        },
        lineMarkWrapperDouble: {
          marginTop: 4,
          width: windowWidth / 10,
          flexDirection: 'column',
        },
        lineNameWrapper: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        lineName: {
          fontWeight: 'bold',
          fontSize: 16,
        },
        lineNameLong: {
          fontWeight: 'bold',
          fontSize: 14,
        },
      });

      const containLongLineName = !!omittedTransferLines.find(
        (l) => getLocalizedLineName(l).length > 15
      );

      return (
        <View style={padLineMarksStyle.root}>
          {!!lineMarks.length && <View style={padLineMarksStyle.topBar} />}
          {lineMarks.map((lm, i) =>
            lm ? (
              <View
                style={
                  lm.subSign
                    ? padLineMarksStyle.lineMarkWrapperDouble
                    : padLineMarksStyle.lineMarkWrapper
                }
                key={omittedTransferLines[i].id}
              >
                <TransferLineMark
                  line={omittedTransferLines[i]}
                  mark={lm}
                  small
                />
                <View style={padLineMarksStyle.lineNameWrapper}>
                  <Text
                    style={
                      containLongLineName
                        ? padLineMarksStyle.lineNameLong
                        : padLineMarksStyle.lineName
                    }
                  >
                    {getLocalizedLineName(omittedTransferLines[i])}
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={padLineMarksStyle.lineMarkWrapper}
                key={omittedTransferLines[i].id}
              >
                <TransferLineDot
                  key={omittedTransferLines[i].id}
                  line={omittedTransferLines[i]}
                  small
                />
                <Text
                  style={
                    containLongLineName
                      ? padLineMarksStyle.lineNameLong
                      : padLineMarksStyle.lineName
                  }
                >
                  {getLocalizedLineName(omittedTransferLines[i])}
                </Text>
              </View>
            )
          )}
        </View>
      );
    };

    return (
      <View
        key={station.name}
        onLayout={onLayout}
        style={styles.stationNameContainer}
      >
        <StationNamesWrapper index={index} station={station} passed={passed} />
        <View style={styles.lineDot}>
          {!index && arrived && <View style={styles.arrivedLineDot} />}
          <View style={styles.chevron}>
            {!index && !arrived ? <Chevron /> : null}
          </View>
          <PadLineMarks />
        </View>
      </View>
    );
  };

  const stationNameCellForMap = (s: Station, i: number): JSX.Element => (
    <StationNameCell key={s.groupId} station={s} index={i} />
  );
  return (
    <View style={styles.root}>
      <View style={styles.bar} />
      <View style={styles.barTerminal} />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default memo(LineBoardWest);
