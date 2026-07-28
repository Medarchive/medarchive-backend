import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({ example: 'dr.okonkwo@hospital.ng' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'Dr. Okonkwo' })
  @IsString()
  @IsNotEmpty()
  declare name: string;
}
