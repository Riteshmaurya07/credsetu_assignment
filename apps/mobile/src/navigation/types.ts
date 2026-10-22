import type { NavigatorScreenParams } from '@react-navigation/native';

/** Screens shown before the user is signed in. */
export type AuthStackParamList = {
  Login: undefined;
  Otp: {
    /** Canonical international phone number, e.g. `+919876543210`. */
    phone: string;
    /** ISO country code used for the dial code. */
    countryCode: string;
    /** Seconds the user has to wait before another code can be requested. */
    resendAvailableInSeconds: number;
  };
};

/** Tabs shown after the user is signed in. */
export type MainTabParamList = {
  Dashboard: undefined;
  Loans: undefined;
  AddLoan: undefined;
  Settings: undefined;
};

export type RootParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
