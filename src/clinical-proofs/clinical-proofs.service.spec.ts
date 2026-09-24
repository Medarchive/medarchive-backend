import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClinicalProofsService } from './clinical-proofs.service';
import { ClinicalProofType } from './dto/create-clinical-proof.dto';

jest.mock('@zk-kit/poseidon-proof', () => ({
  verify: jest.fn(),
}));

import { verify } from '@zk-kit/poseidon-proof';

function createDbMock() {
  return {
    query: {
      clinicalProofs: { findFirst: jest.fn(), findMany: jest.fn() },
      userMedicalProfile: { findFirst: jest.fn() },
      medicalConditions: { findFirst: jest.fn() },
      userMedicalConditions: { findFirst: jest.fn(), findMany: jest.fn() },
      healthRecords: { findFirst: jest.fn(), findMany: jest.fn() },
    },
    insert: jest.fn(),
  };
}

function mockInsertReturning(
  db: ReturnType<typeof createDbMock>,
  row: unknown,
) {
  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([row]),
    }),
  });
}

describe('ClinicalProofsService', () => {
  let db: ReturnType<typeof createDbMock>;
  let queue: { add: jest.Mock };
  let activityLog: { log: jest.Mock };
  let dashboard: { invalidate: jest.Mock };
  let service: ClinicalProofsService;

  beforeEach(() => {
    db = createDbMock();
    queue = { add: jest.fn() };
    activityLog = { log: jest.fn() };
    dashboard = { invalidate: jest.fn() };
    service = new ClinicalProofsService(
      db as never,
      queue as never,
      activityLog as never,
      dashboard as never,
    );
    jest.clearAllMocks();
  });

  describe('create — BLOOD_GROUP', () => {
    it('rejects a claim that does not match the medical profile', async () => {
      db.query.userMedicalProfile.findFirst.mockResolvedValue({
        bloodGroup: 'A_POSITIVE',
      });

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.BLOOD_GROUP,
          claimData: { bloodGroup: 'O_POSITIVE' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('accepts a matching claim, persists it, and enqueues generation', async () => {
      db.query.userMedicalProfile.findFirst.mockResolvedValue({
        bloodGroup: 'O_POSITIVE',
      });
      mockInsertReturning(db, { id: 'proof-1' });

      const row = await service.create('user-1', {
        proofType: ClinicalProofType.BLOOD_GROUP,
        claimData: { bloodGroup: 'O_POSITIVE' },
      });

      expect(row).toEqual({ id: 'proof-1' });
      expect(queue.add).toHaveBeenCalledWith('generate', {
        proofId: 'proof-1',
        userId: 'user-1',
        proofType: ClinicalProofType.BLOOD_GROUP,
        claimData: { bloodGroup: 'O_POSITIVE' },
      });
      expect(activityLog.log).toHaveBeenCalledWith(
        'user-1',
        'CLINICAL_PROOF_REQUESTED',
        expect.any(Object),
      );
    });
  });

  describe('create — CHRONIC_CONDITION', () => {
    it('rejects when hasCondition claim contradicts actual records', async () => {
      db.query.medicalConditions.findFirst.mockResolvedValue({
        id: 'cond-1',
      });
      db.query.userMedicalConditions.findFirst.mockResolvedValue(undefined);

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.CHRONIC_CONDITION,
          claimData: { conditionId: 'cond-1', hasCondition: true },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a truthful absence claim', async () => {
      db.query.medicalConditions.findFirst.mockResolvedValue({
        id: 'cond-1',
      });
      db.query.userMedicalConditions.findFirst.mockResolvedValue(undefined);
      mockInsertReturning(db, { id: 'proof-2' });

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.CHRONIC_CONDITION,
          claimData: { conditionId: 'cond-1', hasCondition: false },
        }),
      ).resolves.toEqual({ id: 'proof-2' });
    });

    it('rejects an unknown condition id', async () => {
      db.query.medicalConditions.findFirst.mockResolvedValue(undefined);

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.CHRONIC_CONDITION,
          claimData: { conditionId: 'unknown', hasCondition: true },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — DIAGNOSIS_CATEGORY', () => {
    it('rejects when no condition in that category is recorded', async () => {
      db.query.userMedicalConditions.findMany.mockResolvedValue([
        { condition: { category: 'ALLERGY' } },
      ]);

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.DIAGNOSIS_CATEGORY,
          claimData: { category: 'DISEASE' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts when a condition in that category is recorded', async () => {
      db.query.userMedicalConditions.findMany.mockResolvedValue([
        { condition: { category: 'DISEASE' } },
      ]);
      mockInsertReturning(db, { id: 'proof-3' });

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.DIAGNOSIS_CATEGORY,
          claimData: { category: 'DISEASE' },
        }),
      ).resolves.toEqual({ id: 'proof-3' });
    });
  });

  describe('create — ALLERGY_CONFIRMATION', () => {
    it('rejects a health record that is not the patients or not an allergy record', async () => {
      db.query.healthRecords.findFirst.mockResolvedValue(undefined);

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.ALLERGY_CONFIRMATION,
          claimData: { healthRecordId: 'record-1' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create — PRIOR_PRESCRIPTION_PATTERN', () => {
    it('rejects when no prescription/medication record matches the drug class', async () => {
      db.query.healthRecords.findMany.mockResolvedValue([
        { recordType: 'PRESCRIPTION', drugClass: 'antibiotics' },
      ]);

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.PRIOR_PRESCRIPTION_PATTERN,
          claimData: { drugClass: 'antihistamines' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a matching prescription record', async () => {
      db.query.healthRecords.findMany.mockResolvedValue([
        { recordType: 'MEDICATION', drugClass: 'antihistamines' },
      ]);
      mockInsertReturning(db, { id: 'proof-4' });

      await expect(
        service.create('user-1', {
          proofType: ClinicalProofType.PRIOR_PRESCRIPTION_PATTERN,
          claimData: { drugClass: 'antihistamines' },
        }),
      ).resolves.toEqual({ id: 'proof-4' });
    });
  });

  describe('verify', () => {
    it('throws NotFoundException when the proof does not exist', async () => {
      db.query.clinicalProofs.findFirst.mockResolvedValue(undefined);
      await expect(service.verify('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException while still pending', async () => {
      db.query.clinicalProofs.findFirst.mockResolvedValue({
        status: 'PENDING',
      });
      await expect(service.verify('proof-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns the claim and validity once generated', async () => {
      db.query.clinicalProofs.findFirst.mockResolvedValue({
        status: 'GENERATED',
        publicSignals: ['scope-value', '3'],
        commitment: 'digest-value',
        proof: { some: 'proof' },
        userId: 'patient-1',
        proofType: ClinicalProofType.BLOOD_GROUP,
        claimData: { bloodGroup: 'O_POSITIVE' },
      });
      (verify as jest.Mock).mockResolvedValue(true);

      const result = await service.verify('proof-1');

      expect(result).toEqual({
        valid: true,
        patientId: 'patient-1',
        proofType: ClinicalProofType.BLOOD_GROUP,
        claimData: { bloodGroup: 'O_POSITIVE' },
      });
    });
  });
});
