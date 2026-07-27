import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DbModule } from '../db/db.module';
import { ZkProofProcessor, ZK_PROOF_QUEUE } from './zk-proof.processor';
import { ZkProofService } from './zk-proof.service';

@Module({
  imports: [
    DbModule,
    BullModule.registerQueue({ name: ZK_PROOF_QUEUE }),
  ],
  providers: [ZkProofProcessor, ZkProofService],
  exports: [ZkProofService],
})
export class ZkProofModule {}
