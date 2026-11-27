import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Album } from '../fotos/entities/album.entity.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { UpdateAlbumDto } from './dto/update-album.dto.js';

@Injectable()
export class AlbumesService {
  constructor(
    @InjectRepository(Album)
    private readonly albumesRepo: Repository<Album>,
  ) {}

  findAll(): Promise<Album[]> {
    return this.albumesRepo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Album> {
    const album = await this.albumesRepo.findOneBy({ id });
    if (!album) throw new NotFoundException(`Álbum ${id} no encontrado`);
    return album;
  }

  async findFotos(id: number): Promise<Album> {
    const album = await this.albumesRepo.findOne({
      where: { id },
      relations: { fotos: true },
    });
    if (!album) throw new NotFoundException(`Álbum ${id} no encontrado`);
    return album;
  }

  // Si el nombre ya existe, PostgreSQL lanza 23505 y el filtro responde 409
  create(dto: CreateAlbumDto): Promise<Album> {
    return this.albumesRepo.save(this.albumesRepo.create(dto));
  }

  async update(id: number, dto: UpdateAlbumDto): Promise<Album> {
    const album = await this.findOne(id); // 404 si no existe
    Object.assign(album, dto);
    return this.albumesRepo.save(album);
  }

  // Las fotos del álbum no se borran: quedan con album = null (onDelete: 'SET NULL')
  async remove(id: number): Promise<void> {
    const album = await this.findOne(id); // 404 si no existe
    await this.albumesRepo.remove(album);
  }
}
