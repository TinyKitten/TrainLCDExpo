import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRecoilState } from 'recoil';
import { RFValue } from 'react-native-responsive-fontsize';
import Button from '../../components/Button';
import { directionToDirectionName, LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';
import Heading from '../../components/Heading';
import useStationList from '../../hooks/useStationList';
import { isJapanese, translate } from '../../translation';
import ErrorScreen from '../../components/ErrorScreen';
import stationState from '../../store/atoms/station';
import lineState from '../../store/atoms/line';
import navigationState from '../../store/atoms/navigation';
import useStationListByTrainType from '../../hooks/useStationListByTrainType';
import useValueRef from '../../hooks/useValueRef';
import getLocalType from '../../utils/localType';
import { HeaderLangState } from '../../models/HeaderTransitionState';

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 24,
  },
  bottom: {
    padding: 24,
  },
  buttons: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizontalButtons: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  iosShakeCaption: {
    fontWeight: 'bold',
    marginTop: 12,
    color: '#555',
    fontSize: RFValue(18),
  },
});

const SelectBoundScreen: React.FC = () => {
  const [yamanoteLine, setYamanoteLine] = useState(false);
  const [osakaLoopLine, setOsakaLoopLine] = useState(false);
  const navigation = useNavigation();
  const [
    { station, stations, stationsWithTrainTypes, selectedBound },
    setStation,
  ] = useRecoilState(stationState);
  const currentStation = stationsWithTrainTypes.find(
    (s) => station?.name === s.name
  );
  const [withTrainTypes, setWithTrainTypes] = useState(false);
  const localType = getLocalType(
    stationsWithTrainTypes.find((s) => station?.name === s.name)
  );
  const [{ headerState, trainType, autoMode }, setNavigation] =
    useRecoilState(navigationState);

  useEffect(() => {
    if (selectedBound) {
      return;
    }

    const trainTypes = currentStation?.trainTypes || [];
    if (!trainTypes.length) {
      setWithTrainTypes(false);
      return;
    }
    if (trainTypes.length === 1) {
      const branchLineType = trainTypes.find(
        (tt) => tt.name.indexOf('支線') !== -1
      );
      if (branchLineType) {
        setWithTrainTypes(false);
        setNavigation((prev) => ({
          ...prev,
          trainType: branchLineType,
        }));
        return;
      }
      if (trainTypes.find((tt) => tt.id === localType?.id)) {
        setNavigation((prev) => ({
          ...prev,
          trainType: localType,
        }));
        setWithTrainTypes(false);
        return;
      }
      setWithTrainTypes(true);
    }
    setWithTrainTypes(true);
  }, [currentStation?.trainTypes, localType, selectedBound, setNavigation]);

  const trainTypeRef = useValueRef(trainType).current;
  const [{ selectedLine }, setLine] = useRecoilState(lineState);
  const currentIndex = getCurrentStationIndex(stations, station);
  const [fetchStationListFunc, stationListLoading, stationListError] =
    useStationList();
  const [
    fetchStationListByTrainTypeFunc,
    fetchStationListByTrainTypeLoading,
    fetchStationListByTrainTypeError,
  ] = useStationListByTrainType();

  useEffect(() => {
    if (fetchStationListByTrainTypeError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [fetchStationListByTrainTypeError]);

  const headerLangState = headerState.split('_')[1] as HeaderLangState;

  const isLoopLine = yamanoteLine || osakaLoopLine;
  const inbound = inboundStationForLoopLine(
    stations,
    currentIndex,
    selectedLine,
    headerLangState
  );
  const outbound = outboundStationForLoopLine(
    stations,
    currentIndex,
    selectedLine,
    headerLangState
  );

  const handleSelectBoundBackButtonPress = useCallback((): void => {
    setLine((prev) => ({
      ...prev,
      selectedLine: null,
    }));
    setStation((prev) => ({
      ...prev,
      stations: [],
    }));
    setNavigation((prev) => ({
      ...prev,
      trainType: null,
    }));
    setYamanoteLine(false);
    setOsakaLoopLine(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, setLine, setNavigation, setStation]);

  const handleBoundSelected = useCallback(
    (selectedStation: Station, direction: LineDirection): void => {
      setStation((prev) => ({
        ...prev,
        selectedBound: selectedStation,
        selectedDirection: direction,
      }));
      navigation.navigate('Main');
    },
    [navigation, setStation]
  );

  const handleNotificationButtonPress = (): void => {
    navigation.navigate('Notification');
  };

  const handleTrainTypeButtonPress = (): void => {
    navigation.navigate('TrainType');
  };

  const handleAutoModeButtonPress = () =>
    setNavigation((prev) => ({
      ...prev,
      autoMode: !prev.autoMode,
    }));

  const renderButton: React.FC<RenderButtonProps> = useCallback(
    ({ boundStation, direction }: RenderButtonProps) => {
      if (!boundStation) {
        return <></>;
      }
      if (isLoopLine) {
        if (!inbound || !outbound) {
          return <></>;
        }
      } else if (direction === 'INBOUND') {
        if (currentIndex === stations.length - 1) {
          return <></>;
        }
      } else if (direction === 'OUTBOUND') {
        if (!currentIndex) {
          return <></>;
        }
      }
      const directionName = directionToDirectionName(direction);
      let directionText = '';
      if (isLoopLine) {
        if (isJapanese) {
          if (direction === 'INBOUND') {
            directionText = `${directionName}(${inbound.boundFor}方面)`;
          } else {
            directionText = `${directionName}(${outbound.boundFor}方面)`;
          }
        } else if (direction === 'INBOUND') {
          directionText = `${directionName}(for ${inbound.boundFor})`;
        } else {
          directionText = `${directionName}(for ${outbound.boundFor})`;
        }
      } else if (isJapanese) {
        directionText = `${boundStation.name}方面`;
      } else {
        directionText = `for ${boundStation.nameR}`;
      }
      const boundSelectOnPress = (): void =>
        handleBoundSelected(boundStation, direction);
      return (
        <Button
          style={styles.button}
          color="#333"
          key={boundStation.groupId}
          onPress={boundSelectOnPress}
        >
          {directionText}
        </Button>
      );
    },
    [
      currentIndex,
      handleBoundSelected,
      inbound,
      isLoopLine,
      outbound,
      stations.length,
    ]
  );
  const handler = useMemo(
    () =>
      BackHandler.addEventListener('hardwareBackPress', () => {
        handleSelectBoundBackButtonPress();
        return true;
      }),
    [handleSelectBoundBackButtonPress]
  );

  const initialize = useCallback(() => {
    if (!selectedLine || trainType) {
      return;
    }

    if (!stations.length) {
      fetchStationListFunc(selectedLine?.id);
    }

    if (localType) {
      setNavigation((prev) => ({
        ...prev,
        trainType: localType,
      }));
    }
    setYamanoteLine(isYamanoteLine(selectedLine?.id));
    setOsakaLoopLine(!trainType && selectedLine?.id === 11623);
  }, [
    fetchStationListFunc,
    localType,
    selectedLine,
    setNavigation,
    stations.length,
    trainType,
  ]);

  useFocusEffect(
    useCallback(() => {
      initialize();
    }, [initialize])
  );

  const trainTypesAreDifferent = trainType?.id !== trainTypeRef?.id;
  useEffect(() => {
    if (!trainType && selectedLine) {
      fetchStationListFunc(selectedLine.id);
    }
    if (trainTypesAreDifferent && trainType) {
      fetchStationListByTrainTypeFunc(trainType.groupId);
    }
  }, [
    fetchStationListByTrainTypeFunc,
    fetchStationListFunc,
    selectedLine,
    trainType,
    trainTypesAreDifferent,
  ]);

  useEffect(() => {
    return (): void => {
      if (handler) {
        handler.remove();
      }
    };
  }, [handler]);

  const autoModeButtonText = `${translate('autoModeSettings')}: ${
    autoMode ? 'ON' : 'OFF'
  }`;

  if (stationListError) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={initialize}
      />
    );
  }

  if (
    !stations.length ||
    stationListLoading ||
    fetchStationListByTrainTypeLoading
  ) {
    return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <View style={styles.container}>
          <Heading>{translate('selectBoundTitle')}</Heading>
          <ActivityIndicator
            style={styles.boundLoading}
            size="large"
            color="#555"
          />
          <View style={styles.buttons}>
            <Button color="#333" onPress={handleSelectBoundBackButtonPress}>
              {translate('back')}
            </Button>
          </View>

          <Text style={styles.iosShakeCaption}>
            {translate('shakeToOpenMenu')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const inboundStation = stations[stations.length - 1];
  const outboundStation = stations[0];

  let computedInboundStation: Station;
  let computedOutboundStation: Station;
  if (yamanoteLine) {
    if (inbound) {
      computedInboundStation = inbound.station;
      computedOutboundStation = outboundStation;
    } else if (outbound) {
      computedInboundStation = inboundStation;
      computedOutboundStation = outbound.station;
    }
  } else {
    computedInboundStation = inboundStation;
    computedOutboundStation = outboundStation;
  }

  interface RenderButtonProps {
    boundStation: Station;
    direction: LineDirection;
  }

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <View style={styles.container}>
        <Heading>{translate('selectBoundTitle')}</Heading>
        <View style={styles.horizontalButtons}>
          {renderButton({
            boundStation: computedInboundStation,
            direction: 'INBOUND',
          })}
          {renderButton({
            boundStation: computedOutboundStation,
            direction: 'OUTBOUND',
          })}
        </View>

        <Button color="#333" onPress={handleSelectBoundBackButtonPress}>
          {translate('back')}
        </Button>
        <Text style={styles.iosShakeCaption}>
          {translate('shakeToOpenMenu')}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Button
            style={{ marginHorizontal: 6 }}
            color="#555"
            onPress={handleNotificationButtonPress}
          >
            {translate('notifySettings')}
          </Button>
          {withTrainTypes ? (
            <Button
              style={{ marginHorizontal: 6 }}
              color="#555"
              onPress={handleTrainTypeButtonPress}
            >
              {translate('trainTypeSettings')}
            </Button>
          ) : null}
          <Button
            style={{ marginHorizontal: 6 }}
            color="#555"
            onPress={handleAutoModeButtonPress}
          >
            {autoModeButtonText}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

export default SelectBoundScreen;
