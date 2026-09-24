import { HealthRecordsService } from './health-records.service';

function createSelectChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'from',
    'innerJoin',
    'leftJoin',
    'where',
    'orderBy',
    'limit',
    'offset',
  ];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

describe('HealthRecordsService.getAccessRequests', () => {
  let db: { select: jest.Mock };
  let service: HealthRecordsService;

  function build(rows: unknown[], total: number) {
    db = { select: jest.fn() };
    db.select
      .mockReturnValueOnce(createSelectChain(rows))
      .mockReturnValueOnce(createSelectChain([{ total }]));

    service = new HealthRecordsService(
      db as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );
  }

  const query = { page: 1, take: 20 } as never;

  it('nests recordId/recordTitle into a record object when the request targets a specific record', async () => {
    build(
      [
        {
          id: 'req-1',
          patientId: 'patient-1',
          providerId: 'provider-1',
          recordId: 'record-1',
          recordTitle: 'Blood Test — March 2026',
          requestType: 'Lab results',
          proofType: null,
          note: null,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          providerName: 'Dr. Jane',
          providerProfilePictureUrl: null,
          organizationName: null,
          providerType: null,
        },
      ],
      1,
    );

    const result = await service.getAccessRequests('patient-1', query);

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'req-1',
        record: { id: 'record-1', title: 'Blood Test — March 2026' },
      }),
    );
    expect(result.data[0]).not.toHaveProperty('recordId');
    expect(result.data[0]).not.toHaveProperty('recordTitle');
  });

  it('sets record to null for a proofType or free-text request with no recordId', async () => {
    build(
      [
        {
          id: 'req-2',
          patientId: 'patient-1',
          providerId: 'provider-1',
          recordId: null,
          recordTitle: null,
          requestType: 'Blood group confirmation',
          proofType: 'BLOOD_GROUP',
          note: null,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          providerName: 'Dr. Jane',
          providerProfilePictureUrl: null,
          organizationName: null,
          providerType: null,
        },
      ],
      1,
    );

    const result = await service.getAccessRequests('patient-1', query);

    expect(result.data[0].record).toBeNull();
    expect(result.data[0].proofType).toBe('BLOOD_GROUP');
  });

  it('paginates using the actual returned row count, not the raw query rows', async () => {
    build([], 0);

    const result = await service.getAccessRequests('patient-1', query);

    expect(result.data).toEqual([]);
    expect(result.meta.totalCount).toBe(0);
  });
});
