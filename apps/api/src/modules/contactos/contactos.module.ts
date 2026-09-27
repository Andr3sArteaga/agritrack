import { Module } from '@nestjs/common';
import { CONTACTO_REPOSITORY } from './domain/repositories/contacto.repository';
import { ContactoPrismaRepository } from './infrastructure/contacto.prisma.repository';
import { ContactosService } from './application/contactos.service';
import { ContactosController } from './presentation/contactos.controller';

@Module({
  controllers: [ContactosController],
  providers: [
    ContactosService,
    { provide: CONTACTO_REPOSITORY, useClass: ContactoPrismaRepository },
  ],
  exports: [ContactosService],
})
export class ContactosModule {}
