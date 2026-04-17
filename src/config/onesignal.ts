import { ONESIGNAL_APP_ID as ONESIGNAL_APP_ID_ENV } from '@env';

export const ONESIGNAL_APP_ID = (ONESIGNAL_APP_ID_ENV ?? '').trim();
