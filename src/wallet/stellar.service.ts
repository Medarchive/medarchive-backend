import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { env } from '../config/env';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private fundQueue: Promise<unknown> = Promise.resolve();

  private get networkUrl(): string {
    return env().STELLAR_NETWORK === 'mainnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';
  }

  private get networkPassphrase(): string {
    return env().STELLAR_NETWORK === 'mainnet'
      ? Networks.PUBLIC
      : Networks.TESTNET;
  }

  private commitmentToHash(commitment: string): Buffer {
    return createHash('sha256').update(commitment).digest();
  }

  getUsdcAsset(): Asset {
    return new Asset(env().STELLAR_USDC_ASSET_CODE, env().STELLAR_USDC_ISSUER);
  }

  private isNotFoundError(err: unknown): boolean {
    if (err && typeof err === 'object' && 'response' in err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 404) return true;
    }
    if (err instanceof Error && err.message.includes('Not Found')) return true;
    return false;
  }

  async accountExists(address: string): Promise<boolean> {
    const server = new Horizon.Server(this.networkUrl);
    try {
      await server.loadAccount(address);
      return true;
    } catch (err) {
      if (this.isNotFoundError(err)) return false;
      throw err;
    }
  }

  async hasUsdcTrustline(address: string): Promise<boolean> {
    const server = new Horizon.Server(this.networkUrl);
    let account: Horizon.AccountResponse;
    try {
      account = await server.loadAccount(address);
    } catch (err) {
      if (this.isNotFoundError(err)) return false;
      throw err;
    }

    const asset = this.getUsdcAsset();
    return account.balances.some(
      (b) =>
        b.asset_type !== 'native' &&
        b.asset_type !== 'liquidity_pool_shares' &&
        b.asset_code === asset.getCode() &&
        b.asset_issuer === asset.getIssuer(),
    );
  }

  async establishUsdcTrustline(secret: string): Promise<string> {
    const server = new Horizon.Server(this.networkUrl);
    const keypair = Keypair.fromSecret(secret);
    const sourceAccount = await server.loadAccount(keypair.publicKey());

    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(Operation.changeTrust({ asset: this.getUsdcAsset() }))
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    return result.hash;
  }

  async fundTestnetAccountViaFriendbot(publicKey: string): Promise<void> {
    if (env().STELLAR_NETWORK !== 'testnet') {
      throw new BadRequestException(
        'Friendbot funding is only available on Stellar Testnet',
      );
    }

    const response = await fetch(
      `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`,
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Friendbot funding failed (${response.status}): ${body}`);
    }
  }

  async verifyPayment(
    txHash: string,
    expected: {
      destination: string;
      amount: string;
      assetCode: string;
      assetIssuer: string;
      memo: string;
    },
  ): Promise<{ valid: boolean; reason?: string }> {
    const server = new Horizon.Server(this.networkUrl);

    let tx: Horizon.ServerApi.TransactionRecord;
    try {
      tx = await server.transactions().transaction(txHash).call();
    } catch {
      return { valid: false, reason: 'Transaction not found' };
    }

    if (!tx.successful) return { valid: false, reason: 'Transaction failed' };

    if (tx.memo_type !== 'text' || tx.memo !== expected.memo) {
      return { valid: false, reason: 'Transaction memo does not match order' };
    }

    const ops = await server.operations().forTransaction(txHash).call();
    const payment = ops.records.find(
      (op): op is Horizon.ServerApi.PaymentOperationRecord =>
        op.type === Horizon.HorizonApi.OperationResponseType.payment,
    );

    if (!payment) return { valid: false, reason: 'No payment operation found' };
    if (payment.to !== expected.destination)
      return { valid: false, reason: 'Payment destination does not match' };
    if (
      payment.asset_type === 'native' ||
      payment.asset_code !== expected.assetCode ||
      payment.asset_issuer !== expected.assetIssuer
    )
      return { valid: false, reason: 'Payment asset does not match' };
    if (payment.amount !== expected.amount)
      return { valid: false, reason: 'Payment amount does not match' };

    return { valid: true };
  }

  private isInsufficientBalanceError(err: unknown): boolean {
    if (err && typeof err === 'object' && 'response' in err) {
      const response = (
        err as {
          response?: {
            data?: { extras?: { result_codes?: { operations?: string[] } } };
          };
        }
      ).response;
      const ops = response?.data?.extras?.result_codes?.operations ?? [];
      if (ops.includes('op_underfunded') || ops.includes('op_no_account'))
        return true;
    }
    if (err instanceof Error && err.message.includes('Not Found')) return true;
    return false;
  }

  async submitVerificationTx(
    patientSecret: string,
    commitment: string,
  ): Promise<string> {
    try {
      const server = new Horizon.Server(this.networkUrl);
      const patientKeypair = Keypair.fromSecret(patientSecret);
      const commitmentHash = this.commitmentToHash(commitment);

      const sourceAccount = await server.loadAccount(
        patientKeypair.publicKey(),
      );

      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addMemo(Memo.hash(commitmentHash))
        .addOperation(
          Operation.payment({
            destination: patientKeypair.publicKey(),
            asset: Asset.native(),
            amount: '0.0000001',
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(patientKeypair);
      const result = await server.submitTransaction(tx);
      return result.hash;
    } catch (err) {
      if (this.isInsufficientBalanceError(err)) {
        throw new BadRequestException(
          'Insufficient XLM balance for verification. Please fund your wallet.',
        );
      }
      throw err;
    }
  }

  fundNewAccount(newPublicKey: string): Promise<void> {
    const result = this.fundQueue.then(() =>
      this.submitFundAccount(newPublicKey),
    );
    this.fundQueue = result.catch(() => {});
    return result;
  }

  private async submitFundAccount(newPublicKey: string): Promise<void> {
    try {
      const server = new Horizon.Server(this.networkUrl);
      const anchorKeypair = Keypair.fromSecret(env().STELLAR_ANCHOR_SECRET);

      const sourceAccount = await server.loadAccount(anchorKeypair.publicKey());

      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          Operation.createAccount({
            destination: newPublicKey,
            startingBalance: '1.5',
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(anchorKeypair);
      await server.submitTransaction(tx);
      this.logger.log(`Funded new Stellar account: ${newPublicKey}`);
    } catch (err) {
      this.logger.warn(
        `Failed to fund Stellar account ${newPublicKey}: ${String(err)}`,
      );
    }
  }
}
