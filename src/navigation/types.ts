export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Premium: undefined;
  Settings: undefined;
  Notifications: undefined;
  SubscriptionConfirm: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
};

export type PathStackParamList = {
  PathHome: undefined;
  TaskList: {
    categoryId: string;
    title: string;
    kicker: string;
    tint: string;
    icon: string;
    taskCount: number;
  };
  TaskDetail: {
    categoryId: string;
    taskId: string;
    categoryTitle: string;
    kicker: string;
    tint: string;
    icon: string;
  };
};

export type JournalStackParamList = {
  JournalBootstrap: undefined;
  JournalMain: undefined;
  JournalAnchor: undefined;
  JournalNewEntry: undefined;
};

export type MainTabParamList = {
  Journal: undefined;
  Path: undefined;
  Focus: undefined;
  Capture: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Payments: undefined;
  PrivacySecurity: undefined;
  HelpFeedback: undefined;
  TermsPrivacy: undefined;
};

