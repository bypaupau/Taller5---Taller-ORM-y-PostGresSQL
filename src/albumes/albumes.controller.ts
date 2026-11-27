import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Album } from '../fotos/entities/album.entity.js';
import { AlbumesService } from './albumes.service.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { UpdateAlbumDto } from './dto/update-album.dto.js';

@Controller('albumes')
export class AlbumesController {
  constructor(private readonly albumesService: AlbumesService) {}

  @Get()
  findAll(): Promise<Album[]> {
    return this.albumesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Album> {
    return this.albumesService.findOne(id);
  }

  // Parámetro de ruta: /api/albumes/2/fotos
  @Get(':id/fotos')
  findFotos(@Param('id', ParseIntPipe) id: number): Promise<Album> {
    return this.albumesService.findFotos(id);
  }

  @Post()
  create(@Body() dto: CreateAlbumDto): Promise<Album> {
    return this.albumesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlbumDto,
  ): Promise<Album> {
    return this.albumesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204: éxito sin cuerpo
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.albumesService.remove(id);
  }
}
