import { orderBy } from 'firebase/firestore';
import { addDocument, deleteDocument, queryDocuments, COLLECTIONS } from './firebase/firestore';
import type { ReconProtocol, SyringeType } from '../types/reconProtocol';
import type { ServiceResult } from '../types/service';

type ReconProtocolInput = {
  name: string;
  vialMg: number;
  waterMl: number;
  doseMg: number;
  syringeType: SyringeType;
};

export async function addReconProtocol(data: ReconProtocolInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.RECON_PROTOCOLS, data as any);
}

export async function deleteReconProtocol(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.RECON_PROTOCOLS, id);
}

export async function getReconProtocols(): Promise<ServiceResult<ReconProtocol[]>> {
  return queryDocuments<ReconProtocol>(COLLECTIONS.RECON_PROTOCOLS, [
    orderBy('createdAt', 'desc'),
  ]);
}
