import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const SKIPPED_KEY = '@update_skipped';
const REMIND_KEY = '@update_remind';
const OPEN_COUNT_KEY = '@update_open_count';
const REMIND_HOURS = 3;
const REMIND_OPENS = 3;

const PROJECT_ID = 'a539a082-58a3-4f29-9bb7-107913124e7d';
const OWNER = 'subhajitgorai';

async function getOpenCount(): Promise<number> {
  const val = await AsyncStorage.getItem(OPEN_COUNT_KEY);
  return val ? parseInt(val, 10) : 0;
}

async function incrementOpenCount(): Promise<void> {
  const count = await getOpenCount();
  await AsyncStorage.setItem(OPEN_COUNT_KEY, String(count + 1));
}

async function isSkipped(updateId: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(SKIPPED_KEY);
  if (!val) return false;
  const skipped: string[] = JSON.parse(val);
  return skipped.includes(updateId);
}

async function skipUpdate(updateId: string): Promise<void> {
  const val = await AsyncStorage.getItem(SKIPPED_KEY);
  const skipped: string[] = val ? JSON.parse(val) : [];
  if (!skipped.includes(updateId)) {
    skipped.push(updateId);
    await AsyncStorage.setItem(SKIPPED_KEY, JSON.stringify(skipped));
  }
}

async function shouldRemind(updateId: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(REMIND_KEY);
  if (!val) return true;
  try {
    const remind = JSON.parse(val);
    if (remind.updateId !== updateId) return true;
    const hoursPassed =
      Date.now() - remind.timestamp >= REMIND_HOURS * 60 * 60 * 1000;
    const openCount = await getOpenCount();
    const opensPassed = openCount - remind.openCount >= REMIND_OPENS;
    return hoursPassed || opensPassed;
  } catch {
    return true;
  }
}

async function remindLater(updateId: string): Promise<void> {
  const openCount = await getOpenCount();
  await AsyncStorage.setItem(
    REMIND_KEY,
    JSON.stringify({
      updateId,
      timestamp: Date.now(),
      openCount,
    }),
  );
}

function verifyManifest(manifest: any): boolean {
  const extra = manifest?.extra;
  const expoClient = extra?.expoClient;
  const manifestProjectId = expoClient?.extra?.eas?.projectId;
  if (!manifestProjectId || manifestProjectId !== PROJECT_ID) return false;
  const manifestOwner = expoClient?.owner;
  if (!manifestOwner || manifestOwner !== OWNER) return false;
  return true;
}

async function checkForUpdate(): Promise<Updates.UpdateCheckResult | null> {
  if (__DEV__ || !Updates.isEnabled) return null;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable || !result.manifest) return null;
    if (!verifyManifest(result.manifest)) return null;
    return result;
  } catch {
    return null;
  }
}

async function fetchAndReload(): Promise<void> {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}

function getChangelog(manifest: any): string[] {
  return manifest?.extra?.expoClient?.extra?.changelog || [];
}

function getUpdateId(manifest: any): string {
  return manifest?.id || '';
}

function isManifestAutoUpdate(manifest: any): boolean {
  return manifest?.extra?.expoClient?.extra?.autoUpdate === true;
}

export const updateService = {
  getOpenCount,
  incrementOpenCount,
  isSkipped,
  skipUpdate,
  shouldRemind,
  remindLater,
  checkForUpdate,
  fetchAndReload,
  getChangelog,
  getUpdateId,
  isManifestAutoUpdate,
};
