import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './entities/album.entity.js';
import { Etiqueta } from './entities/etiqueta.entity.js';
import { Foto } from './entities/foto.entity.js';
import { FotosController } from './fotos.controller.js';
import { FotosService } from './fotos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Foto, Album, Etiqueta])],
  controllers: [FotosController],
  providers: [FotosService],
  exports: [FotosService],
})
export class FotosModule {}
