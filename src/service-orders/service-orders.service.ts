import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { serviceOrders, users, wallets } from '../db/schema';
import { StellarService } from '../wallet/stellar.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildMeta, SortOrder } from '../common/dto/pagination.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import type { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { env } from '../config/env';

function generateReference(): string {
  return `ORD-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class ServiceOrdersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly stellar: StellarService,
    private readonly activityLog: ActivityLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(providerId: string, dto: CreateServiceOrderDto) {
    const patient = await this.db.query.users.findFirst({
      where: eq(users.id, dto.patientId),
      columns: { id: true, role: true },
    });
    if (!patient || patient.role !== 'PATIENT')
      throw new NotFoundException('Patient not found');

    const providerWallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, providerId),
    });
    if (!providerWallet || !providerWallet.verifiedAt)
      throw new BadRequestException(
        'Link and verify a Stellar wallet before creating a service order',
      );

    const hasTrustline = await this.stellar.hasUsdcTrustline(
      providerWallet.address,
    );
    if (!hasTrustline)
      throw new BadRequestException(
        'Your Stellar wallet does not have a USDC trustline yet. Please wait a few minutes and try again.',
      );

    const [order] = await this.db
      .insert(serviceOrders)
      .values({
        reference: generateReference(),
        patientId: dto.patientId,
        providerId,
        providerWalletAddress: providerWallet.address,
        description: dto.description,
        amount: dto.amount,
      })
      .returning();

    this.activityLog.log(providerId, 'SERVICE_ORDER_CREATED', {
      orderId: order.id,
      patientId: dto.patientId,
      amount: dto.amount,
    });
    this.notifications.push(
      dto.patientId,
      'SERVICE_ORDER_CREATED',
      'New Healthcare Service',
      `A provider created a service order for ${dto.amount} USDC: ${dto.description}`,
      { orderId: order.id },
    );

    return order;
  }

  async findOne(userId: string, id: string) {
    const order = await this.db.query.serviceOrders.findFirst({
      where: eq(serviceOrders.id, id),
    });
    if (!order) throw new NotFoundException('Service order not found');
    if (order.patientId !== userId && order.providerId !== userId)
      throw new ForbiddenException();
    return order;
  }

  async findAll(userId: string, pagination: PaginationDto) {
    const { page, take, sortOrder } = pagination;
    const offset = (page - 1) * take;
    const where = or(
      eq(serviceOrders.patientId, userId),
      eq(serviceOrders.providerId, userId),
    );

    const rows = await this.db.query.serviceOrders.findMany({
      where,
      orderBy: (t, { asc, desc }) =>
        sortOrder === SortOrder.ASC ? [asc(t.createdAt)] : [desc(t.createdAt)],
      limit: take,
      offset,
    });
    const all = await this.db.query.serviceOrders.findMany({ where });

    return { data: rows, meta: buildMeta(all.length, page, take, rows.length) };
  }

  async getPaymentIntent(patientUserId: string, id: string) {
    const order = await this.findOne(patientUserId, id);
    if (order.patientId !== patientUserId) throw new ForbiddenException();
    if (order.status !== 'PENDING')
      throw new BadRequestException('Service order is not awaiting payment');

    const patientWallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, patientUserId),
    });
    if (!patientWallet)
      throw new BadRequestException('Link a Stellar wallet before paying');

    const hasTrustline = await this.stellar.hasUsdcTrustline(
      patientWallet.address,
    );
    if (!hasTrustline)
      throw new BadRequestException(
        'Your Stellar wallet does not have a USDC trustline yet. Please wait a few minutes and try again.',
      );

    return {
      orderId: order.id,
      reference: order.reference,
      destination: order.providerWalletAddress,
      assetCode: env().STELLAR_USDC_ASSET_CODE,
      assetIssuer: env().STELLAR_USDC_ISSUER,
      amount: order.amount,
      memo: order.reference,
    };
  }

  async verifyPayment(patientUserId: string, id: string, txHash: string) {
    const order = await this.findOne(patientUserId, id);
    if (order.patientId !== patientUserId) throw new ForbiddenException();
    if (order.status !== 'PENDING')
      throw new BadRequestException('Service order is not awaiting payment');

    const existing = await this.db.query.serviceOrders.findFirst({
      where: eq(serviceOrders.txHash, txHash),
    });
    if (existing)
      throw new ConflictException(
        'This transaction has already been used to pay a service order',
      );

    const result = await this.stellar.verifyPayment(txHash, {
      destination: order.providerWalletAddress,
      amount: order.amount,
      assetCode: env().STELLAR_USDC_ASSET_CODE,
      assetIssuer: env().STELLAR_USDC_ISSUER,
      memo: order.reference,
    });

    if (!result.valid)
      throw new BadRequestException(
        result.reason ?? 'Payment verification failed',
      );

    const [updated] = await this.db
      .update(serviceOrders)
      .set({
        status: 'PAID',
        txHash,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(serviceOrders.id, id), eq(serviceOrders.status, 'PENDING')))
      .returning();

    if (!updated) throw new ConflictException('Service order was already paid');

    this.activityLog.log(patientUserId, 'SERVICE_ORDER_PAID', {
      orderId: order.id,
      txHash,
    });
    this.notifications.push(
      order.providerId,
      'SERVICE_ORDER_PAID',
      'Payment Received',
      `Payment of ${order.amount} USDC received for order ${order.reference}.`,
      { orderId: order.id, txHash },
    );
    this.notifications.push(
      patientUserId,
      'SERVICE_ORDER_PAID',
      'Payment Verified',
      `Your payment of ${order.amount} USDC for order ${order.reference} has been verified.`,
      { orderId: order.id, txHash },
    );

    return updated;
  }
}
