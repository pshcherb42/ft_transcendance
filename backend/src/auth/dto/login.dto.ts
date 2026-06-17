import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto 
{
  @IsNotEmpty({ message: 'El nom d’usuari o email és obligatori' })
  @IsString()
  username!: string;

  @IsNotEmpty({ message: 'La contrasenya és obligatòria' })
  @IsString()
  @MinLength(8, { message: 'La contrasenya ha de tenir com a mínim 8 caràcters' })
  password!: string;
}