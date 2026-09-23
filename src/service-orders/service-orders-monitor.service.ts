import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceOrdersService } from './service-orders.service';

export interface PaymentReconciliationResult {
  checked: number;
  paid: number;
}

@Injectable()
export class ServiceOrdersMonitorService {
  private readonly logger = new Logger(ServiceOrdersMonitorService.name);
  private running = false;

  constructor(private readonly serviceOrders: ServiceOrdersService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Previous payment reconciliation still running, skipping this tick',
      );
      return;
    }
    this.running = true;
    try {
      await this.reconcile();
    } finally {
      this.running = false;
    }
  }

  async reconcile(): Promise<PaymentReconciliationResult> {
    const orders = await this.serviceOrders.findPendingOrders();

    let paid = 0;
    for (const order of orders) {
      try {
        if (await this.serviceOrders.reconcilePendingOrder(order)) paid++;
      } catch (err) {
        this.logger.error(
          `Failed to reconcile service order ${order.id}: ${String(err)}`,
        );
      }
    }

    if (paid > 0) {
      this.logger.log(
        `Payment reconciliation: ${orders.length} pending, ${paid} newly paid`,
      );
    }

    return { checked: orders.length, paid };
  }
}
