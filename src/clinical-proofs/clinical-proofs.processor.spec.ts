jest.mock('@zk-kit/poseidon-proof', () => ({
  generate: jest.fn(),
}));

import { generate } from '@zk-kit/poseidon-proof';
import {
  buildClaimPreimages,
  ClinicalProofsProcessor,
} from './clinical-proofs.processor';
import { ClinicalProofType } from './dto/create-clinical-proof.dto';

describe('buildClaimPreimages', () => {
  const base = {
    proofId: 'proof-1',
    userId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
  };

  it('produces different preimages for different proof types with the same claim shape', () => {
    const blood = buildClaimPreimages({
      ...base,
      proofType: ClinicalProofType.BLOOD_GROUP,
      claimData: { bloodGroup: 'O_POSITIVE' },
    });
    const genotype = buildClaimPreimages({
      ...base,
      proofType: ClinicalProofType.GENOTYPE,
      claimData: { genotype: 'O_POSITIVE' },
    });

    expect(blood).not.toEqual(genotype);
  });

  it('produces different preimages for different claim values of the same type', () => {
    const a = buildClaimPreimages({
      ...base,
      proofType: ClinicalProofType.BLOOD_GROUP,
      claimData: { bloodGroup: 'O_POSITIVE' },
    });
    const b = buildClaimPreimages({
      ...base,
      proofType: ClinicalProofType.BLOOD_GROUP,
      claimData: { bloodGroup: 'A_NEGATIVE' },
    });

    expect(a).not.toEqual(b);
  });

  it('is deterministic for the same input', () => {
    const data = {
      ...base,
      proofType: ClinicalProofType.CHRONIC_CONDITION,
      claimData: { conditionId: 'cond-1', hasCondition: true },
    };

    expect(buildClaimPreimages(data)).toEqual(buildClaimPreimages(data));
  });

  it('folds in userId so two patients with the same claim get different preimages', () => {
    const a = buildClaimPreimages({
      ...base,
      userId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
      proofType: ClinicalProofType.GENOTYPE,
      claimData: { genotype: 'AA' },
    });
    const b = buildClaimPreimages({
      ...base,
      userId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4c',
      proofType: ClinicalProofType.GENOTYPE,
      claimData: { genotype: 'AA' },
    });

    expect(a).not.toEqual(b);
  });
});

describe('ClinicalProofsProcessor', () => {
  function createDbMock() {
    return {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };
  }

  let db: ReturnType<typeof createDbMock>;
  let notifications: { push: jest.Mock };
  let dashboard: { invalidate: jest.Mock };
  let processor: ClinicalProofsProcessor;

  const jobData = {
    proofId: 'proof-1',
    userId: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
    proofType: ClinicalProofType.BLOOD_GROUP,
    claimData: { bloodGroup: 'O_POSITIVE' },
  };

  beforeEach(() => {
    db = createDbMock();
    notifications = { push: jest.fn() };
    dashboard = { invalidate: jest.fn() };
    processor = new ClinicalProofsProcessor(
      db as never,
      notifications as never,
      dashboard as never,
    );
    jest.clearAllMocks();
  });

  it('marks the proof GENERATED and invalidates the dashboard cache on success', async () => {
    (generate as jest.Mock).mockResolvedValue({
      digest: 'commitment-value',
      proof: { some: 'proof' },
      scope: 'scope-value',
      numberOfInputs: 3,
    });

    await processor.process({ data: jobData } as never);

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(notifications.push).toHaveBeenCalledWith(
      jobData.userId,
      'CLINICAL_PROOF_GENERATED',
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
    expect(dashboard.invalidate).toHaveBeenCalledWith(jobData.userId);
  });

  it('marks the proof FAILED and still invalidates the dashboard cache on error', async () => {
    (generate as jest.Mock).mockRejectedValue(new Error('circuit blew up'));

    await processor.process({ data: jobData } as never);

    expect(notifications.push).toHaveBeenCalledWith(
      jobData.userId,
      'CLINICAL_PROOF_FAILED',
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
    expect(dashboard.invalidate).toHaveBeenCalledWith(jobData.userId);
  });
});
