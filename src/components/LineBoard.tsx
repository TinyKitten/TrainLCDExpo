import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import { StopCondition } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import isTablet from '../utils/isTablet';
import LineBoardEast from './LineBoardEast';
import LineBoardLightweight from './LineBoardLightWeight';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardWest from './LineBoardWest';

export interface Props {
  hasTerminus: boolean;
}

const styles = StyleSheet.create({
  bottomNotice: {
    position: 'absolute',
    bottom: isTablet ? 96 : 12,
    fontWeight: 'bold',
    color: '#3a3a3a',
    fontSize: RFValue(12),
  },
});

const LineBoard: React.FC<Props> = ({ hasTerminus }: Props) => {
  const { theme } = useRecoilValue(themeState);
  const { arrived } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);
  const slicedLeftStations = leftStations.slice(0, 8);

  const belongingLines = leftStations.map((ls) => ls.currentLine);

  const lineColors = useMemo(
    () => slicedLeftStations.map((s) => s.currentLine?.lineColorC),
    [slicedLeftStations]
  );

  const passStations = useMemo(
    () =>
      slicedLeftStations.filter(
        (s) => s.stopCondition === StopCondition.PARTIAL
      ),
    [slicedLeftStations]
  );

  const Inner = useCallback(() => {
    switch (theme) {
      case AppTheme.JRWest:
        return (
          <LineBoardWest
            lineColors={lineColors}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            lines={belongingLines}
          />
        );
      // TODO: 加工していないprops渡しを消して子コンポーネントでstateを取るようにする
      case AppTheme.Saikyo:
        return (
          <LineBoardSaikyo
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            lines={belongingLines}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        );
      case AppTheme.Lightweight:
        return (
          <LineBoardLightweight
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            lines={belongingLines}
            lineColors={lineColors}
          />
        );
      default:
        return (
          <LineBoardEast
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            hasTerminus={hasTerminus}
            lines={belongingLines}
            lineColors={lineColors}
          />
        );
    }
  }, [
    arrived,
    belongingLines,
    hasTerminus,
    lineColors,
    selectedLine,
    slicedLeftStations,
    theme,
  ]);

  const { left: safeAreaLeft } = useSafeAreaInsets();

  return (
    <>
      <Inner />
      {passStations.length ? (
        <Text style={[styles.bottomNotice, { left: safeAreaLeft || 16 }]}>
          {translate('partiallyPassBottomNoticePrefix')}
          {isJapanese
            ? passStations.map((s) => s.name).join('、')
            : ` ${passStations.map((s) => s.nameR).join(', ')}`}
          {translate('partiallyPassBottomNoticeSuffix')}
        </Text>
      ) : null}
    </>
  );
};

export default React.memo(LineBoard);
