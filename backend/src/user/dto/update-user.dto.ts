import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';;

export class UpdateUserDto 
{
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correu no és vàlid' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contrasenya ha de tenir com a mínim 8 caràcters' })
  password?: string;
} 
