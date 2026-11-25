import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Album } from '../fotos/entities/album.entity.js';
import { AlbumesService } from './albumes.service.js';

@Controller('api/albumes')
export class AlbumesController {
  constructor(private readonly albumesService: AlbumesService) {}

  @Get()
  findAll(): Promise<Album[]> {
    return this.albumesService.findAll();
  }

  @Get(':id/fotos')
  findFotos(@Param('id', ParseIntPipe) id: number): Promise<Album> {
    return this.albumesService.findFotos(id);
  }
}
