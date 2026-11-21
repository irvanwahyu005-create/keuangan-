import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type Auth,
  type User,
} from 'firebase/auth';
import type { KasRumahBackupPayload } from '../types/finance';

export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const BACKUP_FILE_NAME = 'kas_rumah_backup.json';

// Safely load firebase-applet-config.json if provisioned by AI Studio OAuth setup
const configModules = import.meta.glob('/firebase-applet-config.json', { eager: true }) as Record<
  string,
  { default?: Record<string, unknown> }
>;

const firebaseConfig = configModules['/firebase-applet-config.json']?.default ?? null;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Strictly in-memory OAuth access token caching (never localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function isDriveOAuthConfigured(): boolean {
  return Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.authDomain);
}

function ensureFirebaseAuth(): { auth: Auth; provider: GoogleAuthProvider } | null {
  if (!isDriveOAuthConfigured() || !firebaseConfig) return null;
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    for (const scope of DRIVE_SCOPES) {
      googleProvider.addScope(scope);
    }
  }
  if (!firebaseAuth || !googleProvider) return null;
  return { auth: firebaseAuth, provider: googleProvider };
}

export function initDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  const ctx = ensureFirebaseAuth();
  if (!ctx) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(ctx.auth, (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  const ctx = ensureFirebaseAuth();
  if (!ctx) {
    throw new Error('Integrasi Google Drive belum diaktifkan di konfigurasi aplikasi.');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(ctx.auth, ctx.provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Token akses Google Drive tidak diperoleh. Silakan coba masuk lagi.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
}

export function getCachedDriveToken(): string | null {
  return cachedAccessToken;
}

export interface DriveFileMeta {
  id: string;
  name: string;
  modifiedTime?: string;
}

export async function findDriveBackupFile(accessToken: string): Promise<DriveFileMeta | null> {
  const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memeriksa file Google Drive (${res.status}): ${errText}`);
  }
  const data = (await res.json()) as { files?: DriveFileMeta[] };
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

export async function uploadBackupToDrive(
  accessToken: string,
  payload: KasRumahBackupPayload,
  existingFileId?: string
): Promise<DriveFileMeta> {
  const targetId = existingFileId ?? (await findDriveBackupFile(accessToken))?.id;
  const jsonBody = JSON.stringify(payload, null, 2);

  if (targetId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${targetId}?uploadType=media&fields=id,name,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonBody,
      }
    );
    if (!res.ok) {
      throw new Error(`Gagal memperbarui backup Google Drive (${res.status})`);
    }
    return (await res.json()) as DriveFileMeta;
  }

  // Create new file via multipart upload
  const boundary = 'kas_rumah_boundary_' + Date.now();
  const metadata = JSON.stringify({
    name: BACKUP_FILE_NAME,
    mimeType: 'application/json',
  });
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    jsonBody,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );
  if (!res.ok) {
    throw new Error(`Gagal membuat file backup di Google Drive (${res.status})`);
  }
  return (await res.json()) as DriveFileMeta;
}

export async function downloadBackupFromDrive(
  accessToken: string,
  fileId: string
): Promise<KasRumahBackupPayload> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gagal mengunduh cadangan dari Google Drive (${res.status})`);
  }
  const data = (await res.json()) as KasRumahBackupPayload;
  if (!data || data.app !== 'Kas Rumah' || !Array.isArray(data.transactions)) {
    throw new Error('Format file cadangan Google Drive tidak valid.');
  }
  return data;
}

export async function deleteDriveBackupFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Gagal menghapus cadangan di Google Drive (${res.status})`);
  }
}

export function exportLocalJsonFile(payload: KasRumahBackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kas_rumah_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseLocalJsonBackup(text: string): KasRumahBackupPayload {
  const data = JSON.parse(text) as KasRumahBackupPayload;
  if (!data || data.app !== 'Kas Rumah' || !Array.isArray(data.transactions)) {
    throw new Error('File JSON bukan cadangan Kas Rumah yang valid.');
  }
  return data;
}
