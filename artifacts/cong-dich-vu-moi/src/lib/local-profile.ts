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

function readProfiles(): LocalProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile[]) : [];
  } catch {
    return [];
  }
}

function writeProfiles(profiles: LocalProfile[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function createLocalProfile(fields: Record<string, string>): LocalProfile {
  const stamp = Date.now().toString(36).slice(-7).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return { id: `HS-${stamp}-${random}`, savedAt: new Date().toISOString(), fields };
}

export function saveLocalProfile(profile: LocalProfile) {
  const profiles = readProfiles().filter((item) => item.id !== profile.id);
  writeProfiles([profile, ...profiles].slice(0, 10));
}

export function findLocalProfile(id: string) {
  return readProfiles().find((profile) => profile.id === id.trim().toUpperCase()) ?? null;
}

export function findLocalProfileByNationalId(nationalId: string) {
  const normalized = nationalId.replace(/\D/g, "");
  return readProfiles().find((profile) => profile.fields.nationalId === normalized) ?? null;
}

export function updateLocalProfile(profile: LocalProfile) {
  saveLocalProfile(profile);
}
