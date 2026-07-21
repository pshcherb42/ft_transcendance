// friends/dto/respond-request.dto.ts
import { IsIn } from 'class-validator';

export class RespondRequestDto {
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}