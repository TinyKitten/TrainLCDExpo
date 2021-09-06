import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
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

import { useRecoilValue } from 'recoil';
import { hasNotch } from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import { Line, Station } from '../../models/StationAPI';
import Chevron from '../ChervronTY';
import BarTerminal from '../BarTerminalEast';
import { getLineMark } from '../../lineMark';
import { filterWithoutCurrentLine } from '../../utils/line';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import { isJapanese } from '../../translation';
import navigationState from '../../store/atoms/navigation';
import PassChevronTY from '../PassChevronTY';
import { heightScale, widthScale } from '../../utils/scale';
import { parenthesisRegexp } from '../../constants/regexp';
import isAndroidTablet from '../../utils/isAndroidTablet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const { isPad } = Platform as PlatformIOSStatic;
const isTablet = isPad || isAndroidTablet;

const useBarStyles = ({
  index,
}: {
  index?: number;
}): { left: number; width: number } => {
  const left = useMemo(() => {
    if (Platform.OS === 'android' && !isTablet) {
      if (index === 0) {
        return widthScale(-32);
      }
      return widthScale(-18);
    }

    if (index === 0) {
      return widthScale(-32);
    }
    return widthScale(-20);
  }, [index]);

  const width = useMemo(() => {
    if (isTablet) {
      if (index === 0) {
        return widthScale(200);
      }
      if (index === 1) {
        return widthScale(61.75);
      }
    }
    if (index === 1) {
      if (!hasNotch() && Platform.OS === 'ios') {
        return widthScale(62);
      }
      if (Platform.OS === 'android' && !isTablet) {
        return widthScale(58);
      }
      return widthScale(62);
    }
    if (!hasNotch() && Platform.OS === 'ios') {
      return widthScale(62);
    }
    if (Platform.OS === 'android' && !isTablet) {
      return widthScale(58);
    }
    return widthScale(62);
  }, [index]);
  return { left, width };
};

interface Props {
  arrived: boolean;
  lineColors: string[];
  line: Line;
  lines: Line[];
  stations: Station[];
  hasTerminus: boolean;
}

const stationNameLineHeight = ((): number => {
  if (Platform.OS === 'android') {
    return 21;
  }
  return 18;
})();

const getStationNameEnExtraStyle = (): StyleProp<TextStyle> => {
  if (!isTablet) {
    return {
      width: heightScale(320),
      marginBottom: 58,
    };
  }
  return {
    width: 250,
    marginBottom: 96,
  };
};

const getBarTerminalRight = (): number => {
  if (isTablet) {
    return -42;
  }
  if (Platform.OS === 'android' && !isTablet) {
    return -26;
  }
  return -31;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: screenHeight,
    bottom: isTablet ? screenHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
  },
  barTerminal: {
    width: isTablet ? 42 : 33.7,
    height: isTablet ? 53 : 32,
    position: 'absolute',
    right: getBarTerminalRight(),
    bottom: isTablet ? -54 : 32,
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    width: screenWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
    paddingBottom: !isTablet ? 84 : undefined,
  },
  stationName: {
    width: RFValue(21),
    textAlign: 'center',
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    fontWeight: 'bold',
    marginLeft: isTablet ? 5 : 2.5,
  },
  stationNameEn: {
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    bottom: 32,
    marginLeft: widthScale(14),
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  passChevron: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
    marginLeft: isTablet ? 0 : widthScale(3),
  },
  chevronNotPassed: {
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  chevronPassed: {
    left: isTablet ? 64 : 32,
    height: isTablet ? 48 : 32,
    bottom: isTablet ? 38 : 28,
  },
});
interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
}

interface StationNameCellProps {
  arrived: boolean;
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
  lines: Line[];
  lineColors: string[];
  hasTerminus: boolean;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
}: StationNameProps) => {
  if (en) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.nameR}
      </Text>
    );
  }
  if (horizontal) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(),
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
StationName.defaultProps = {
  en: false,
  horizontal: false,
  passed: false,
};
interface StationNamesWrapperProps {
  stations: Station[];
  station: Station;
  passed: boolean;
}

const StationNamesWrapper: React.FC<StationNamesWrapperProps> = ({
  stations,
  station,
  passed,
}: StationNamesWrapperProps) => {
  const includesLongStatioName = !!stations.filter(
    (s) => s.name.includes('ー') || s.name.length > 6
  ).length;

  const [isEn, setIsEn] = useState(!isJapanese);
  const { headerState } = useRecoilValue(navigationState);

  useEffect(() => {
    setIsEn(headerState.endsWith('_EN') || headerState.endsWith('_ZH'));
  }, [headerState]);

  return (
    <StationName
      station={station}
      en={isEn}
      horizontal={includesLongStatioName}
      passed={station.pass || passed}
    />
  );
};
const StationNameCell: React.FC<StationNameCellProps> = ({
  arrived,
  station,
  index,
  stations,
  line,
  lines,
  lineColors,
  hasTerminus,
}: StationNameCellProps) => {
  const passed = !index && !arrived;
  const transferLines = filterWithoutCurrentLine(stations, line, index).filter(
    (l) => lines.findIndex((il) => l.id === il?.id) === -1
  );
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);
  const lineMarks = omittedTransferLines.map((l) => getLineMark(l));
  const getLocalizedLineName = useCallback((l: Line) => {
    if (isJapanese) {
      return l.name.replace(parenthesisRegexp, '');
    }
    return l.nameR.replace(parenthesisRegexp, '');
  }, []);

  const [chevronColor, setChevronColor] = useState<'RED' | 'BLUE'>('BLUE');

  useEffect(() => {
    const interval = setInterval(() => {
      setChevronColor((prev) => (prev === 'RED' ? 'BLUE' : 'RED'));
    }, 1000);

    return (): void => {
      clearInterval(interval);
    };
  }, []);

  const PadLineMarks: React.FC = useCallback(() => {
    if (!isTablet) {
      return <></>;
    }
    const padLineMarksStyle = StyleSheet.create({
      root: {
        marginTop: 4,
      },
      lineMarkWrapper: {
        marginTop: 4,
        width: screenWidth / 10,
        flexDirection: 'row',
      },
      lineMarkWrapperDouble: {
        marginTop: 4,
        width: screenWidth / 10,
        flexDirection: 'column',
      },
      lineNameWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
      lineName: {
        fontWeight: 'bold',
        fontSize: RFValue(10),
      },
      lineNameLong: {
        fontWeight: 'bold',
        fontSize: RFValue(7),
      },
    });

    const containLongLineName = !!omittedTransferLines.find(
      (l) => getLocalizedLineName(l).length > 15
    );

    return (
      <View style={padLineMarksStyle.root}>
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
  }, [getLocalizedLineName, lineMarks, omittedTransferLines]);
  const { left: barLeft, width: barWidth } = useBarStyles({ index });

  return (
    <>
      <View key={station.name} style={styles.stationNameContainer}>
        <StationNamesWrapper
          stations={stations}
          station={station}
          passed={passed}
        />
        <LinearGradient
          colors={['#fff', '#000', '#000', '#fff']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={{
            ...styles.bar,
            left: barLeft,
            width: barWidth,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        />
        <LinearGradient
          colors={
            line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
          }
          style={{
            ...styles.bar,
            left: barLeft,
            width: barWidth,
          }}
        />
        {arrived || index ? (
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barWidth,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
        ) : null}
        {arrived || index ? (
          <LinearGradient
            colors={
              line
                ? [
                    `#${lineColors[index] || line.lineColorC}ff`,
                    `#${lineColors[index] || line.lineColorC}bb`,
                  ]
                : ['#000000ff', '#000000bb']
            }
            style={{
              ...styles.bar,
              left: barLeft,
              width: barWidth,
            }}
          />
        ) : null}
        {station.pass ? (
          <View style={styles.lineDot}>
            <View style={[styles.passChevron]}>
              {index ? <PassChevronTY /> : null}
              {!index && !arrived ? <PassChevronTY /> : null}
            </View>
            <View style={{ marginTop: 8 }}>
              <PadLineMarks />
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={passed ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']}
            style={styles.lineDot}
          >
            <View
              style={{
                position: 'absolute',
                top: isTablet ? 38 : 0,
              }}
            >
              <PadLineMarks />
            </View>
          </LinearGradient>
        )}
        {stations.length - 1 === index ? (
          <BarTerminal
            style={styles.barTerminal}
            lineColor={
              line
                ? `#${lineColors[lineColors.length - 1] || line.lineColorC}`
                : '#000'
            }
            hasTerminus={hasTerminus}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.chevron,
          arrived ? { left: widthScale(-14) } : undefined,
        ]}
      >
        {!index ? <Chevron color={chevronColor} /> : null}
      </View>
    </>
  );
};

type EmptyStationNameCellProps = {
  lastLineColor: string;
  isLast: boolean;
  hasTerminus: boolean;
};

const EmptyStationNameCell: React.FC<EmptyStationNameCellProps> = ({
  lastLineColor: lastLineColorOriginal,
  isLast,
  hasTerminus,
}: EmptyStationNameCellProps) => {
  const lastLineColor = lastLineColorOriginal.startsWith('#')
    ? lastLineColorOriginal
    : `#${lastLineColorOriginal}`;
  const { left: barLeft, width: barWidth } = useBarStyles({});

  return (
    <View style={styles.stationNameContainer}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={
          lastLineColor
            ? [`${lastLineColor}ff`, `${lastLineColor}bb`]
            : ['#000000ff', '#000000bb']
        }
        style={{
          ...styles.bar,
          left: barLeft,
          width: barWidth,
        }}
      />
      {isLast ? (
        <BarTerminal
          style={styles.barTerminal}
          lineColor={lastLineColor}
          hasTerminus={hasTerminus}
        />
      ) : null}
    </View>
  );
};
const LineBoardEast: React.FC<Props> = ({
  arrived,
  stations,
  line,
  lines,
  hasTerminus,
  lineColors,
}: Props) => {
  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element => {
      if (!s) {
        return (
          <EmptyStationNameCell
            lastLineColor={
              lineColors[lineColors.length - 1] || `#${line.lineColorC}`
            }
            key={i}
            isLast={
              [...stations, ...Array.from({ length: 8 - stations.length })]
                .length -
                1 ===
              i
            }
            hasTerminus={hasTerminus}
          />
        );
      }

      return (
        <React.Fragment key={s.groupId}>
          <StationNameCell
            station={s}
            stations={stations}
            index={i}
            arrived={arrived}
            line={line}
            lines={lines}
            lineColors={lineColors}
            hasTerminus={hasTerminus}
          />
        </React.Fragment>
      );
    },
    [arrived, hasTerminus, line, lineColors, lines, stations]
  );

  return (
    <View style={styles.root}>
      <View style={styles.stationNameWrapper}>
        {[...stations, ...Array.from({ length: 8 - stations.length })].map(
          stationNameCellForMap
        )}
      </View>
    </View>
  );
};

export default LineBoardEast;
