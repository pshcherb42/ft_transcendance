import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreatePublicUserDto {
  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'newuser' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @ApiPropertyOptional({ example: 'New User' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;
}

// following its companion creates what user sees about our Users