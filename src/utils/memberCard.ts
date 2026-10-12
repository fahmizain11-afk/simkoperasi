import { Member, KoperasiSetup } from '../types';

/**
 * Standard structured payload for the Digital Member Card QR Code
 */
export interface MemberCardQrPayload {
  app: string;
  type: string;
  id: string;
  noAnggota: string;
  nama: string;
  nik?: string;
  hp?: string;
}

/**
 * Creates standardized JSON payload string for QR Code on Member Card
 */
export function createMemberCardPayload(member: Member): string {
  const payload: MemberCardQrPayload = {
    app: 'KOPERASI_DANA_SEGAR',
    type: 'MEMBER_CARD',
    id: member.id,
    noAnggota: member.noAnggota,
    nama: member.nama,
    nik: member.nik,
    hp: member.noHp
  };
  return JSON.stringify(payload);
}

/**
 * Parses and matches a scanned string (from camera, 2D QR reader, or 1D barcode scanner)
 * to an existing cooperative member.
 */
export function parseMemberScanCode(code: string, members: Member[]): Member | null {
  if (!code || !Array.isArray(members) || members.length === 0) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;

  // 1. Try parsing JSON structure
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('%7B') && trimmed.endsWith('%7D'))) {
    try {
      const decoded = trimmed.startsWith('%') ? decodeURIComponent(trimmed) : trimmed;
      const parsed = JSON.parse(decoded);
      if (parsed) {
        const targetNo = parsed.noAnggota ? String(parsed.noAnggota).trim().toLowerCase() : '';
        const targetId = parsed.id ? String(parsed.id).trim().toLowerCase() : '';

        const found = members.find(m => 
          (targetNo && m.noAnggota.trim().toLowerCase() === targetNo) ||
          (targetId && m.id.trim().toLowerCase() === targetId) ||
          (parsed.nik && m.nik && m.nik.trim() === String(parsed.nik).trim())
        );
        if (found) return found;
      }
    } catch {
      // Continue to next matcher
    }
  }

  // 2. Remove common prefixes like "MEMBER:", "ANGGOTA:", "KTA:", "ID:"
  let cleanCode = trimmed.replace(/^(MEMBER:|ANGGOTA:|KTA:|ID:)/i, '').trim();

  // 3. Handle URL or query parameters if scanned as URL
  if (cleanCode.includes('?')) {
    try {
      const urlParams = new URLSearchParams(cleanCode.split('?')[1]);
      const paramNo = urlParams.get('noAnggota') || urlParams.get('id') || urlParams.get('member');
      if (paramNo) cleanCode = paramNo.trim();
    } catch {}
  }

  // 4. Match exact noAnggota, id, or NIK (case-insensitive)
  const cleanLower = cleanCode.toLowerCase();
  const matched = members.find(m => 
    m.noAnggota.trim().toLowerCase() === cleanLower ||
    m.id.trim().toLowerCase() === cleanLower ||
    (m.nik && m.nik.trim() === cleanCode)
  );

  if (matched) return matched;

  // 5. Match by sanitized alphanumeric (e.g. ignoring hyphens in KOP-001 vs KOP001)
  const alphaNumericClean = cleanLower.replace(/[^a-z0-9]/g, '');
  if (alphaNumericClean.length >= 2) {
    const looseMatch = members.find(m => {
      const memSanitized = m.noAnggota.toLowerCase().replace(/[^a-z0-9]/g, '');
      return memSanitized === alphaNumericClean;
    });
    if (looseMatch) return looseMatch;
  }

  return null;
}
