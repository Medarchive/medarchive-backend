import { DashboardService, dashboardCacheKey } from './dashboard.service';

function createDbMock() {
  return {
    query: {
      userMedicalProfile: { findFirst: jest.fn().mockResolvedValue(null) },
      userMedicalConditions: { findMany: jest.fn().mockResolvedValue([]) },
      healthRecords: { findMany: jest.fn().mockResolvedValue([]) },
      patientCareIds: { findFirst: jest.fn().mockResolvedValue(null) },
      emergencyContacts: { findMany: jest.fn().mockResolvedValue([]) },
      clinicalProofs: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
}

describe('DashboardService', () => {
  let db: ReturnType<typeof createDbMock>;
  let cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let s3: { getDownloadUrl: jest.Mock };
  let wallet: { getForDashboard: jest.Mock };
  let service: DashboardService;

  beforeEach(() => {
    db = createDbMock();
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
    };
    s3 = { getDownloadUrl: jest.fn() };
    wallet = { getForDashboard: jest.fn().mockResolvedValue(null) };
    service = new DashboardService(
      db as never,
      cache as never,
      s3 as never,
      wallet as never,
    );
  });

  it('includes the 5 most recent clinical proofs in the aggregated response', async () => {
    const proofs = [
      { id: 'proof-1', proofType: 'BLOOD_GROUP', status: 'GENERATED' },
    ];
    db.query.clinicalProofs.findMany.mockResolvedValue(proofs);

    const result = await service.get('user-1');

    expect(result).toEqual(
      expect.objectContaining({ recentClinicalProofs: proofs }),
    );
    expect(db.query.clinicalProofs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });

  it('returns the cached value without re-querying when present', async () => {
    cache.get.mockResolvedValue({ recentClinicalProofs: [] });

    await service.get('user-1');

    expect(db.query.clinicalProofs.findMany).not.toHaveBeenCalled();
  });

  it('caches the aggregated result after computing it', async () => {
    await service.get('user-1');

    expect(cache.set).toHaveBeenCalledWith(
      dashboardCacheKey('user-1'),
      expect.any(Object),
      expect.any(Number),
    );
  });

  it('invalidate() clears the cache for that user', async () => {
    await service.invalidate('user-1');

    expect(cache.del).toHaveBeenCalledWith(dashboardCacheKey('user-1'));
  });
});
