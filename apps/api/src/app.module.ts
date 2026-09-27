import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ParcelasModule } from './modules/parcelas/parcelas.module';
import { CultivosModule } from './modules/cultivos/cultivos.module';
import { CampanasModule } from './modules/campanas/campanas.module';
import { ActividadesModule } from './modules/actividades/actividades.module';
import { ContactosModule } from './modules/contactos/contactos.module';
import { PrediccionModule } from './modules/prediccion/prediccion.module';
import { IntegridadModule } from './modules/integridad/integridad.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { PublicModule } from './modules/public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ParcelasModule,
    CultivosModule,
    CampanasModule,
    ActividadesModule,
    ContactosModule,
    PrediccionModule,
    IntegridadModule,
    ReportesModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
