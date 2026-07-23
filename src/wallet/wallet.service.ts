import { BadRequestException, ConflictException, Injectable, Inject, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { eq } from 'drizzle-orm';
import { Horizon, Keypair, StrKey } from '@stellar/stellar-sdk';
import { uuidv7 } from 'uuidv7';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { wallets } from '../db/schema';
import type { AddWalletDto } from './dto/add-wallet.dto';

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
  ) {}

  async add(userId: string, dto: AddWalletDto) {
    if (!StrKey.isValidEd25519PublicKey(dto.address)) {
      throw new BadRequestException('Invalid Stellar public key');
    }

    const existing = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (existing) throw new ConflictException('Wallet already linked to this account');

    const network = dto.network ?? 'MAINNET';

    const [wallet] = await this.db
      .insert(wallets)
      .values({ userId, address: dto.address, network, label: dto.label })
      .returning();

    const nonce = uuidv7();
    await this.cache.set(this.nonceKey(userId), nonce, WALLET_NONCE_TTL_MS);

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

    if (!wallet) throw new NotFoundException('No wallet linked to this account');

    if (!this.verifyStellarSignature(wallet.address, nonce, signature)) {
      throw new UnauthorizedException('Wallet signature verification failed');
    }

    await this.cache.del(this.nonceKey(userId));

    const [updated] = await this.db
      .update(wallets)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id))
      .returning();

    return updated;
  }

  async get(userId: string) {
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) throw new NotFoundException('No wallet linked to this account');

    const balance = await this.fetchBalance(wallet.address, wallet.network);

    return { ...wallet, balance };
  }

  async remove(userId: string) {
    const [deleted] = await this.db
      .delete(wallets)
      .where(eq(wallets.userId, userId))
      .returning();

    if (!deleted) throw new NotFoundException('No wallet linked to this account');
  }

  private verifyStellarSignature(publicKey: string, message: string, signature: string): boolean {
    try {
      const keypair = Keypair.fromPublicKey(publicKey);
      return keypair.verify(Buffer.from(message, 'utf8'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }

  private async fetchBalance(address: string, network: string): Promise<string | null> {
    try {
      const server = new Horizon.Server(horizonUrls[network] ?? horizonUrls.MAINNET);
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
