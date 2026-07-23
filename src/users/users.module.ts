import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PersonalInfoController } from './personal-info.controller';
import { PersonalInfoService } from './personal-info.service';

@Module({
  controllers: [UsersController, PersonalInfoController],
  providers: [UsersService, PersonalInfoService],
  exports: [UsersService],
})
export class UsersModule {}
