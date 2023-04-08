import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  EasingNode,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import truncateTrainType from '../constants/truncateTrainType';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI';
import { TrainType } from '../models/TrainType';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { getIsLocal, getIsRapid } from '../utils/localType';

type Props = {
  trainType: APITrainType | APITrainTypeMinimum | TrainType;
  lineColor: string;
};

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    borderLeftWidth: isTablet ? 0.5 : 0.75,
    borderRightWidth: isTablet ? 0.5 : 0.75,
    borderBottomWidth: isTablet ? 0.5 : 0.75,
    borderColor: 'white',
  },
  container: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    position: 'absolute',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
    fontSize: isTablet ? 18 * 1.5 : 18,
    maxWidth: isTablet ? 175 : 96.25,
    maxHeight: isTablet ? 55 : 30.25,
  },
  textWrapper: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    fontSize: isTablet ? 18 * 1.5 : 18,
    maxWidth: isTablet ? 175 : 96.25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
});

const TrainTypeBoxSaikyo: React.FC<Props> = ({
  trainType,
  lineColor,
}: Props) => {
  const { selectedBound } = useRecoilValue(stationState);
  const { headerState } = useRecoilValue(navigationState);
  const { headerTransitionDelay } = useRecoilValue(tuningState);
  const [trainTypeText, setTrainTypeText] = useState('');
  const [prevTrainTypeText, setPrevTrainTypeText] = useState('');
  const [paddingLeft, setPaddingLeft] = useState(0);
  const [prevPaddingLeft, setPrevPaddingLeft] = useState(0);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [prevLetterSpacing, setPrevLetterSpacing] = useState(0);

  const textOpacityAnim = useValue<0 | 1>(0);

  const trainTypeColor = useMemo(() => {
    if (typeof trainType !== 'string') {
      if (getIsLocal(trainType)) {
        return lineColor;
      }
      if (getIsRapid(trainType)) {
        return '#1e8ad2';
      }
      return trainType?.color;
    }

    switch (trainType) {
      case 'local':
        return lineColor;
      case 'rapid':
        return '#1e8ad2';
      case 'ltdexp':
        return '#fd5a2a';
      default:
        return '#00ac9a';
    }
  }, [lineColor, trainType]);

  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('localEn');
      case 'ZH':
        return translate('localZh');
      case 'KO':
        return translate('localKo');
      default:
        return translate('local');
    }
  }, [headerLangState]);

  const trainTypeNameJa = (
    (trainType as APITrainTypeMinimum).name || localTypeText
  )?.replace(parenthesisRegexp, '');

  const trainTypeNameR =
    truncateTrainType(
      (trainType as APITrainTypeMinimum).nameR || translate('localEn')
    ) ?? '';

  const trainTypeNameZh = truncateTrainType(
    (trainType as APITrainTypeMinimum).nameZh || translate('localZh')
  );
  const trainTypeNameKo = truncateTrainType(
    (trainType as APITrainTypeMinimum).nameKo || translate('localKo')
  );

  const trainTypeName = useMemo((): string => {
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR ?? '';
      case 'ZH':
        return trainTypeNameZh ?? '';
      case 'KO':
        return trainTypeNameKo ?? '';
      default:
        return trainTypeNameJa;
    }
  }, [
    headerLangState,
    trainTypeNameJa,
    trainTypeNameKo,
    trainTypeNameR,
    trainTypeNameZh,
  ]);

  const rapidTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('rapidEn');
      case 'ZH':
        return translate('rapidZh');
      case 'KO':
        return translate('rapidKo');
      default:
        return translate('rapid');
    }
  }, [headerLangState]);
  const ltdExpTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return truncateTrainType(translate('ltdExpEn'));
      case 'ZH':
        return translate('ltdExpZh');
      case 'KO':
        return translate('ltdExpKo');
      default:
        return translate('ltdExp');
    }
  }, [headerLangState]);

  const animateAsync = useCallback(
    () =>
      new Promise<void>((resolve) => {
        timing(textOpacityAnim, {
          toValue: 0,
          duration: headerTransitionDelay,
          easing: EasingNode.ease,
        }).start(() => resolve());
      }),
    [headerTransitionDelay, textOpacityAnim]
  );

  useEffect(() => {
    if (prevTrainTypeText !== trainTypeText) {
      textOpacityAnim.setValue(1);
    }
  }, [headerState, prevTrainTypeText, textOpacityAnim, trainTypeText]);

  const computedTrainTypeText = useMemo((): string => {
    switch (trainType) {
      case 'local':
        return localTypeText;
      case 'rapid':
        return rapidTypeText;
      case 'ltdexp':
        return ltdExpTypeText;
      default:
        if (typeof trainType === 'string') {
          return '';
        }
        return trainTypeName;
    }
  }, [localTypeText, ltdExpTypeText, rapidTypeText, trainType, trainTypeName]);

  const isEn = useMemo(() => headerLangState === 'EN', [headerLangState]);

  const adjustedLetterSpacing = useMemo((): number => {
    if (!isEn) {
      if (trainType === 'rapid' || trainTypeName?.length === 2) {
        return 8;
      }
    }
    return 0;
  }, [isEn, trainType, trainTypeName]);

  const adjustedPaddingLeft = useMemo((): number => {
    if (Platform.OS === 'android' && !isTablet) {
      return 0;
    }
    if (!isEn) {
      if (trainType === 'rapid' || trainTypeName?.length === 2) {
        return 8;
      }
    }
    return 0;
  }, [isEn, trainType, trainTypeName]);

  useEffect(() => {
    const updateAsync = async () => {
      if (!selectedBound) {
        setTrainTypeText(localTypeText);
        setPrevTrainTypeText(localTypeText);
        return;
      }

      setLetterSpacing(adjustedLetterSpacing);
      setPaddingLeft(adjustedPaddingLeft);
      setTrainTypeText(computedTrainTypeText);
      await animateAsync();
      setPrevLetterSpacing(adjustedLetterSpacing);
      setPrevPaddingLeft(adjustedPaddingLeft);
      setPrevTrainTypeText(computedTrainTypeText);
    };
    updateAsync();
  }, [
    adjustedLetterSpacing,
    adjustedPaddingLeft,
    animateAsync,
    computedTrainTypeText,
    localTypeText,
    ltdExpTypeText,
    rapidTypeText,
    selectedBound,
    trainType,
    trainTypeName,
  ]);

  const textTopAnimatedStyles = {
    opacity: sub(1, textOpacityAnim),
  };

  const textBottomAnimatedStyles = {
    opacity: textOpacityAnim,
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#000', '#000', '#fff']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['#aaaaaaff', '#aaaaaabb']}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['#000', '#000', '#fff']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainTypeColor}bb`, `${trainTypeColor}ff`]}
          style={styles.gradient}
        />

        <Animated.View style={[styles.textWrapper, textTopAnimatedStyles]}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={2}
            style={[
              {
                ...styles.text,
                paddingLeft,
                letterSpacing,
              },
            ]}
          >
            {trainTypeText}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.textWrapper, textBottomAnimatedStyles]}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={2}
            style={[
              {
                ...styles.text,
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
              },
            ]}
          >
            {prevTrainTypeText}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxSaikyo);
