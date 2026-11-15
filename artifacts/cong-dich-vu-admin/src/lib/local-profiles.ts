export type LocalAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

export type LocalProfile = {
  id: string;
  savedAt: string;
  fields: Record<string, string>;
  attachment?: LocalAttachment;
};

const STORAGE_KEY = "independent-service-local-profiles";

export function readLocalProfiles(): LocalProfile[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile[]) : [];
  } catch {
    return [];
  }
}

function writeLocalProfiles(profiles: LocalProfile[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function updateLocalProfile(profile: LocalProfile) {
  writeLocalProfiles(readLocalProfiles().map((item) => item.id === profile.id ? profile : item));
}

export function removeLocalProfile(profileId: string) {
  writeLocalProfiles(readLocalProfiles().filter((item) => item.id !== profileId));
}
