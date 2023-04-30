declare module 'react-native-dotenv' {
  export const APP_ENV: 'development' | 'staging' | 'production';
  export const API_URL: string;
  export const GOOGLE_API_KEY: string;
  export const NEARBY_STATIONS_LIMIT: string;
  export const MIRRORING_SHARE_DEEPLINK_URL: string;
  export const ENABLE_WDYR: 'true' | 'false';
}
