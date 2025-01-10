import { atom } from "recoil";
import { Station } from "../../../gen/proto/stationapi_pb";
import { RECOIL_STATES } from "../../constants";
import { LineDirection } from "../../models/Bound";

export interface StationState {
	arrived: boolean;
	approaching: boolean;
	averageDistance: number | null;
	station: Station | null;
	stations: Station[];
	selectedDirection: LineDirection | null;
	selectedBound: Station | null;
	wantedDestination: Station | null;
}

export const initialStationState: StationState = {
	arrived: true,
	approaching: false,
	averageDistance: null,
	station: null,
	stations: [],
	selectedDirection: null,
	selectedBound: null,
	wantedDestination: null,
};

const stationState = atom<StationState>({
	key: RECOIL_STATES.station,
	default: initialStationState,
});

export default stationState;
