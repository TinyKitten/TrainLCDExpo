import { getBundleId } from "react-native-device-info";
import { DEV_APP_BUNDLE_IDENTIFIER } from "../constants";

export const isDevApp =
	(() => getBundleId() === DEV_APP_BUNDLE_IDENTIFIER)() || __DEV__;
