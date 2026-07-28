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
    return env().NODE_ENV === 'production'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';
  }

  private get networkPassphrase(): string {
    return env().NODE_ENV === 'production' ? Networks.PUBLIC : Networks.TESTNET;
  }

  private commitmentToHash(commitment: string): Buffer {
    return createHash('sha256').update(commitment).digest();
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
