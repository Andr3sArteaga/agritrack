import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCampanaDto } from './create-campana.dto';

export class UpdateCampanaDto extends PartialType(
  OmitType(CreateCampanaDto, ['parcelaId', 'cultivoId'] as const),
) {}
