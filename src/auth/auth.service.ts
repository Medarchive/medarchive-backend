import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { sql as rawSql, eq, and, isNull, gt } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { Keypair } from '@stellar/stellar-sdk';
import { uuidv7 } from 'uuidv7';
import { randomInt, createHash } from 'crypto';
import { env } from '../config/env';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import {
  users,
  wallets,
  patientProfiles,
  providerProfiles,
  refreshTokens,
  providerInvitations,
} from '../db/schema';
import { MailService } from '../mail/mail.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { WalletEncryptionService } from '../wallet/wallet-encryption.service';
import { StellarService } from '../wallet/stellar.service';
import { setContextUserId } from '../common/context/request.context';
import type { RegisterDto } from './dto/register.dto';
import { RegisterRole } from './dto/register.dto';
import type { AuthTokens, JwtPayload } from './auth.types';

const ARGON2_OPTIONS: Parameters<typeof argon2.hash>[1] = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const WALLET_NONCE_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly activityLog: ActivityLogService,
    private readonly walletEncryption: WalletEncryptionService,
    private readonly stellar: StellarService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });

    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = (await argon2.hash(
      dto.password,
      ARGON2_OPTIONS,
    )) as string;

    const userId = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          fullName: dto.fullName,
          email: dto.email.toLowerCase(),
          phone: dto.phone ?? null,
          password: passwordHash,
          role: dto.role,
        })
        .returning({ id: users.id });

      if (dto.role === RegisterRole.PATIENT) {
        await tx.insert(patientProfiles).values({ userId: user.id });
      } else {
        await tx.insert(providerProfiles).values({ userId: user.id });
      }

      return user.id;
    });

    const keypair = Keypair.random();
    const encryptedSecret = this.walletEncryption.encrypt(keypair.secret());
    await this.db.insert(wallets).values({
      userId,
      address: keypair.publicKey(),
      network: env().NODE_ENV === 'production' ? 'MAINNET' : 'TESTNET',
      encryptedSecret,
    });
    this.stellar.fundNewAccount(keypair.publicKey()).catch(() => {});

    const { resendAfterSeconds } = await this.sendOtp(
      dto.email.toLowerCase(),
      dto.fullName,
    );

    this.logger.log(`User registered userId=${userId} role=${dto.role}`);

    return { resendAfterSeconds };
  }

  async verifyEmail(email: string, otp: string) {
    const key = this.otpKey(email);
    const stored = await this.cache.get<string>(key);

    if (!stored || stored !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.email, email.toLowerCase()));

    await this.cache.del(key);

    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (user) this.mail.sendWelcome(user.email, user.fullName).catch(() => {});

    this.logger.log(`Email verified email=${email}`);

    return null;
  }

  async resendOtp(email: string) {
    const cooldownKey = this.otpCooldownKey(email);
    const expiresAt = await this.cache.get<string>(cooldownKey);

    if (expiresAt) {
      const secondsLeft = Math.ceil((Number(expiresAt) - Date.now()) / 1000);
      throw new BadRequestException(
        `Please wait ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''} before requesting another OTP`,
      );
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) throw new BadRequestException('Email not found');
    if (user.emailVerifiedAt)
      throw new BadRequestException('Email already verified');

    const { resendAfterSeconds } = await this.sendOtp(
      email.toLowerCase(),
      user.fullName,
    );

    return { resendAfterSeconds };
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Email not verified. Please verify your email first.',
      );
    }

    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    setContextUserId(user.id);
    this.logger.log(`Login success userId=${user.id}`);
    this.activityLog.log(user.id, 'LOGIN');

    const now = new Date().toLocaleString('en-GB', {
      timeZone: 'Africa/Lagos',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    this.mail
      .sendLoginAlert(user.email, user.fullName, 'Unknown', now)
      .catch(() => {});

    return this.issueTokens(user, wallet?.address ?? null);
  }

  async walletNonce(address: string) {
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.address, address),
    });

    if (!wallet)
      throw new UnauthorizedException('No wallet found for this address');

    const nonce = uuidv7();
    await this.cache.set(
      this.walletNonceKey(address),
      nonce,
      WALLET_NONCE_TTL_MS,
    );

    return { nonce };
  }

  async walletLogin(
    address: string,
    nonce: string,
    signature: string,
  ): Promise<AuthTokens> {
    const storedNonce = await this.cache.get<string>(
      this.walletNonceKey(address),
    );
    if (!storedNonce || storedNonce !== nonce) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.address, address),
    });

    if (!wallet)
      throw new UnauthorizedException('No wallet found for this address');

    if (!wallet.verifiedAt) {
      throw new UnauthorizedException(
        'Wallet not verified. Complete wallet verification first via POST /wallet/verify',
      );
    }

    if (!this.verifyStellarSignature(address, nonce, signature)) {
      throw new UnauthorizedException('Wallet signature verification failed');
    }

    await this.cache.del(this.walletNonceKey(address));

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, wallet.userId),
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    setContextUserId(user.id);
    this.logger.log(`Wallet login success userId=${user.id}`);

    return this.issueTokens(user, wallet.address);
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const token = await this.db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });

    if (!token)
      throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, token.userId),
    });

    if (!user) throw new UnauthorizedException();

    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(refreshTokens.id, token.id));

    return this.issueTokens(user, wallet?.address ?? null);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      );

    return null;
  }

  private readonly RESET_TTL_MS = 15 * 60 * 1000;
  private resetKey(token: string) {
    return `pwd:reset:${token}`;
  }

  async forgotPassword(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (!user) return null;

    const token = uuidv7();
    await this.cache.set(this.resetKey(token), user.id, this.RESET_TTL_MS);
    const resetLink = `${env().APP_URL}/auth/reset-password?token=${token}`;
    this.mail
      .sendPasswordReset(user.email, user.fullName, resetLink, '15 minutes')
      .catch(() => {});
    return null;
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.cache.get<string>(this.resetKey(token));
    if (!userId)
      throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = (await argon2.hash(
      newPassword,
      ARGON2_OPTIONS,
    )) as string;
    await this.db
      .update(users)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await this.cache.del(this.resetKey(token));
    return null;
  }

  async activateProvider(rawToken: string, password: string) {
    const tokenHash = this.hashToken(rawToken);

    const passwordHash = (await argon2.hash(
      password,
      ARGON2_OPTIONS,
    )) as string;

    const newUser = await this.db.transaction(async (tx) => {
      type InviteRow = {
        id: string;
        email: string;
        name: string;
        expires_at: string;
        used_at: string | null;
      };

      const result = await tx.execute(
        rawSql`
          SELECT id, email, name, expires_at, used_at
          FROM provider_invitations
          WHERE token_hash = ${tokenHash}
          FOR UPDATE
        `,
      );

      const invite = (result as unknown as InviteRow[])[0];

      if (!invite) throw new BadRequestException('Invalid activation token');
      if (invite.used_at !== null)
        throw new BadRequestException('Activation token has already been used');
      if (new Date(invite.expires_at) <= new Date())
        throw new BadRequestException('Activation token has expired');

      const existingUser = await tx.query.users.findFirst({
        where: eq(users.email, invite.email),
      });
      if (existingUser)
        throw new ConflictException(
          'An account with this email already exists',
        );

      const [created] = await tx
        .insert(users)
        .values({
          fullName: invite.name,
          email: invite.email,
          password: passwordHash,
          role: 'PROVIDER',
          emailVerifiedAt: new Date(),
        })
        .returning();

      await tx.insert(providerProfiles).values({ userId: created.id });

      await tx
        .update(providerInvitations)
        .set({ usedAt: new Date() })
        .where(eq(providerInvitations.id, invite.id));

      return created;
    });

    this.logger.log(`Provider account activated email=${newUser.email}`);
    return this.issueTokens(newUser, null);
  }

  private async issueTokens(
    user: typeof users.$inferSelect,
    walletAddress: string | null,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      walletAddress,
    };

    const accessToken = this.jwt.sign(payload);

    const rawRefresh = uuidv7();
    const refreshTokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    const decoded: { exp: number } = this.jwt.decode(accessToken);

    return {
      accessToken,
      refreshToken: rawRefresh,

      expiresIn: decoded.exp - Math.floor(Date.now() / 1000),
    };
  }

  private async sendOtp(
    email: string,
    name: string,
  ): Promise<{ resendAfterSeconds: number }> {
    const otp = String(randomInt(100000, 999999));
    const expiresAt = Date.now() + OTP_RESEND_COOLDOWN_MS;
    await this.cache.set(this.otpKey(email), otp, OTP_TTL_MS);
    await this.cache.set(
      this.otpCooldownKey(email),
      String(expiresAt),
      OTP_RESEND_COOLDOWN_MS,
    );
    await this.mail.sendOtp(email, otp, name);
    return { resendAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000) };
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

  private walletNonceKey(address: string) {
    return `auth:wallet:nonce:${address}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private otpKey(email: string) {
    return `otp:${email}`;
  }

  private otpCooldownKey(email: string) {
    return `otp:cooldown:${email}`;
  }
}
