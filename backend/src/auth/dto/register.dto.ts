import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto 
{
  @IsEmail({}, { message: 'El correu no és vàlid' })
  email!: string;

  @IsNotEmpty({ message: 'El nom d’usuari és obligatori' })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: 'La contrasenya és obligatòria' })
  @IsString()
  @MinLength(8, { message: 'La contrasenya ha de tenir com a mínim 8 caràcters' })
  password!: string;
}