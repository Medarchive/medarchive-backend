import { ForbiddenException } from '@nestjs/common';
import { ProviderProfileService } from './provider-profile.service';
import { ClinicalProofType } from '../clinical-proofs/dto/create-clinical-proof.dto';

function createDbMock() {
  return {
    query: {
      providerRecordRequests: { findFirst: jest.fn(), findMany: jest.fn() },
    },
  };
}

describe('ProviderProfileService.verifyClinicalProof', () => {
  let db: ReturnType<typeof createDbMock>;
  let clinicalProofs: { verify: jest.Mock; findAllForProvider: jest.Mock };
  let activityLog: { log: jest.Mock };
  let service: ProviderProfileService;

  beforeEach(() => {
    db = createDbMock();
    clinicalProofs = { verify: jest.fn(), findAllForProvider: jest.fn() };
    activityLog = { log: jest.fn() };
    service = new ProviderProfileService(
      db as never,
      undefined as never,
      undefined as never,
      activityLog as never,
      clinicalProofs as never,
    );
  });

  it('rejects when the provider has no approved request for this proof type from this patient', async () => {
    clinicalProofs.verify.mockResolvedValue({
      valid: true,
      patientId: 'patient-1',
      proofType: ClinicalProofType.BLOOD_GROUP,
      claimData: { bloodGroup: 'O_POSITIVE' },
    });
    db.query.providerRecordRequests.findFirst.mockResolvedValue(undefined);

    await expect(
      service.verifyClinicalProof('provider-1', 'proof-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(activityLog.log).not.toHaveBeenCalled();
  });

  it('returns the verification result once an approved request exists', async () => {
    clinicalProofs.verify.mockResolvedValue({
      valid: true,
      patientId: 'patient-1',
      proofType: ClinicalProofType.BLOOD_GROUP,
      claimData: { bloodGroup: 'O_POSITIVE' },
    });
    db.query.providerRecordRequests.findFirst.mockResolvedValue({
      id: 'req-1',
      status: 'APPROVED',
    });

    const result = await service.verifyClinicalProof('provider-1', 'proof-1');

    expect(result).toEqual({
      valid: true,
      proofType: ClinicalProofType.BLOOD_GROUP,
      claimData: { bloodGroup: 'O_POSITIVE' },
    });
    expect(activityLog.log).toHaveBeenCalledWith(
      'provider-1',
      'CLINICAL_PROOF_VERIFIED',
      expect.any(Object),
    );
  });

  describe('listPatientClinicalProofs', () => {
    it('passes an empty proof-type list when the provider has no approved requests', async () => {
      db.query.providerRecordRequests.findMany.mockResolvedValue([
        { proofType: null },
      ]);
      clinicalProofs.findAllForProvider.mockResolvedValue([]);

      const result = await service.listPatientClinicalProofs(
        'provider-1',
        'patient-1',
      );

      expect(result).toEqual([]);
      expect(clinicalProofs.findAllForProvider).toHaveBeenCalledWith(
        'patient-1',
        [],
      );
    });

    it('scopes the lookup to distinct approved proof types only', async () => {
      db.query.providerRecordRequests.findMany.mockResolvedValue([
        { proofType: ClinicalProofType.BLOOD_GROUP },
        { proofType: ClinicalProofType.BLOOD_GROUP },
        { proofType: ClinicalProofType.GENOTYPE },
      ]);
      clinicalProofs.findAllForProvider.mockResolvedValue([
        { id: 'proof-1', proofType: ClinicalProofType.BLOOD_GROUP },
      ]);

      const result = await service.listPatientClinicalProofs(
        'provider-1',
        'patient-1',
      );

      expect(clinicalProofs.findAllForProvider).toHaveBeenCalledWith(
        'patient-1',
        [ClinicalProofType.BLOOD_GROUP, ClinicalProofType.GENOTYPE],
      );
      expect(result).toEqual([
        { id: 'proof-1', proofType: ClinicalProofType.BLOOD_GROUP },
      ]);
    });
  });
});
