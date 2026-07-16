import { ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty({ nullable: true })
  avatar: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(partial: Partial<PublicUserResponseDto>) {
    Object.assign(this, partial);
  }
}

// the info that the user may get from the API, User info but no email, password or refreshtoken