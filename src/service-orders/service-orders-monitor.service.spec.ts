import { ServiceOrdersMonitorService } from './service-orders-monitor.service';

describe('ServiceOrdersMonitorService', () => {
  let serviceOrders: {
    findPendingOrders: jest.Mock;
    reconcilePendingOrder: jest.Mock;
  };
  let monitor: ServiceOrdersMonitorService;

  beforeEach(() => {
    serviceOrders = {
      findPendingOrders: jest.fn(),
      reconcilePendingOrder: jest.fn(),
    };
    monitor = new ServiceOrdersMonitorService(serviceOrders as never);
  });

  it('reports zero paid when there are no pending orders', async () => {
    serviceOrders.findPendingOrders.mockResolvedValue([]);

    await expect(monitor.reconcile()).resolves.toEqual({
      checked: 0,
      paid: 0,
    });
  });

  it('counts orders newly reconciled as paid', async () => {
    serviceOrders.findPendingOrders.mockResolvedValue([
      { id: 'order-1' },
      { id: 'order-2' },
    ]);
    serviceOrders.reconcilePendingOrder
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(monitor.reconcile()).resolves.toEqual({
      checked: 2,
      paid: 1,
    });
  });

  it('keeps processing remaining orders after one throws', async () => {
    serviceOrders.findPendingOrders.mockResolvedValue([
      { id: 'order-1' },
      { id: 'order-2' },
    ]);
    serviceOrders.reconcilePendingOrder
      .mockRejectedValueOnce(new Error('horizon down'))
      .mockResolvedValueOnce(true);

    await expect(monitor.reconcile()).resolves.toEqual({
      checked: 2,
      paid: 1,
    });
  });

  it('skips a tick if the previous one is still running', async () => {
    let resolveFirst!: () => void;
    serviceOrders.findPendingOrders
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = () => resolve([]))),
      )
      .mockResolvedValueOnce([]);

    const first = monitor.handleCron();
    await monitor.handleCron();

    expect(serviceOrders.findPendingOrders).toHaveBeenCalledTimes(1);

    resolveFirst();
    await first;
  });
});
