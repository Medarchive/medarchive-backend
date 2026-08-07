import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { eq } from 'drizzle-orm';
import { Horizon, Keypair, StrKey } from '@stellar/stellar-sdk';
import { uuidv7 } from 'uuidv7';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { wallets, users } from '../db/schema';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { MailService } from '../mail/mail.service';
import { buildMeta, SortOrder } from '../common/dto/pagination.dto';
import type { AddWalletDto } from './dto/add-wallet.dto';
import type { WalletTransactionsQueryDto } from './dto/wallet-transactions-query.dto';

const WALLET_NONCE_TTL_MS = 10 * 60 * 1000;

const horizonUrls: Record<string, string> = {
  MAINNET: 'https://horizon.stellar.org',
  TESTNET: 'https://horizon-testnet.stellar.org',
};

@Injectable()
export class WalletService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly activityLog: ActivityLogService,
    private readonly mail: MailService,
  ) {}

  async add(userId: string, dto: AddWalletDto) {
    if (!StrKey.isValidEd25519PublicKey(dto.address)) {
      throw new BadRequestException('Invalid Stellar public key');
    }

    const existing = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (existing)
      throw new ConflictException('Wallet already linked to this account');

    const network = dto.network ?? 'MAINNET';

    let wallet: typeof wallets.$inferSelect;
    try {
      [wallet] = await this.db
        .insert(wallets)
        .values({ userId, address: dto.address, network, label: dto.label })
        .returning();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('unique') || msg.includes('23505')) {
        throw new ConflictException('Wallet or address already linked to an account');
      }
      throw err;
    }

    const nonce = uuidv7();
    await this.cache.set(this.nonceKey(userId), nonce, WALLET_NONCE_TTL_MS);

    this.activityLog.log(userId, 'WALLET_LINKED', {
      address: dto.address,
      network,
    });
    return { wallet, nonce };
  }

  async verify(userId: string, nonce: string, signature: string) {
    const storedNonce = await this.cache.get<string>(this.nonceKey(userId));

    if (!storedNonce || storedNonce !== nonce) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet)
      throw new NotFoundException('No wallet linked to this account');

    if (!this.verifyStellarSignature(wallet.address, nonce, signature)) {
      throw new UnauthorizedException('Wallet signature verification failed');
    }

    await this.cache.del(this.nonceKey(userId));

    const [updated] = await this.db
      .update(wallets)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id))
      .returning();

    this.activityLog.log(userId, 'WALLET_VERIFIED', {
      address: wallet.address,
    });

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user)
      this.mail
        .sendWalletLinked(
          user.email,
          user.fullName,
          wallet.address,
          wallet.network,
        )
        .catch(() => {});

    return updated;
  }

  async get(userId: string) {
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet)
      throw new NotFoundException('No wallet linked to this account');

    const balance = await this.fetchBalance(wallet.address, wallet.network);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encryptedSecret: _omit, ...safeWallet } = wallet;
    return { ...safeWallet, balance };
  }

  async getForDashboard(userId: string) {
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) return null;

    const balance = await this.fetchBalance(wallet.address, wallet.network);

    return {
      address: wallet.address,
      network: wallet.network,
      balance,
      verifiedAt: wallet.verifiedAt,
    };
  }

  async getTransactions(userId: string, query: WalletTransactionsQueryDto) {
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) throw new NotFoundException('No wallet linked to this account');

    const { page, take, sortOrder } = query;
    const offset = (page - 1) * take;
    const order = sortOrder === SortOrder.ASC ? 'asc' : 'desc';

    const server = new Horizon.Server(
      horizonUrls[wallet.network] ?? horizonUrls.MAINNET,
    );

    const fetched = await server
      .transactions()
      .forAccount(wallet.address)
      .limit(200)
      .order(order)
      .call();

    const all = fetched.records.map((tx) => ({
      id: tx.id,
      hash: tx.hash,
      createdAt: tx.created_at,
      successful: tx.successful,
      ledger: tx.ledger_attr,
      operationCount: tx.operation_count,
      feeCharged: tx.fee_charged,
      memoType: tx.memo_type,
      memo: tx.memo ?? null,
    }));

    const items = all.slice(offset, offset + take);
    const meta = buildMeta(all.length, page, take, items.length);

    return { items, meta };
  }

  async remove(userId: string) {
    const [deleted] = await this.db
      .delete(wallets)
      .where(eq(wallets.userId, userId))
      .returning();

    if (!deleted)
      throw new NotFoundException('No wallet linked to this account');

    this.activityLog.log(userId, 'WALLET_REMOVED');
  }

  private verifyStellarSignature(
    publicKey: string,
    message: string,
    signature: string,
  ): boolean {
    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      return keypair.verify(
        Buffer.from(message, 'utf8'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      return false;
    }
  }

  private async fetchBalance(
    address: string,
    network: string,
  ): Promise<string | null> {
    try {
      const server = new Horizon.Server(
        horizonUrls[network] ?? horizonUrls.MAINNET,
      );
      const account = await server.loadAccount(address);
      const native = account.balances.find((b) => b.asset_type === 'native');
      return native?.balance ?? '0';
    } catch {
      return null;
    }
  }

  private nonceKey(userId: string) {
    return `wallet:nonce:${userId}`;
  }
}
