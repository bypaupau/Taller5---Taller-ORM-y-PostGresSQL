import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import type { CreateFotoDto } from './dto/create-foto.dto.js';
import type { UpdateFotoDto } from './dto/update-foto.dto.js';
import { Etiqueta } from './entities/etiqueta.entity.js';
import { Foto } from './entities/foto.entity.js';

export interface FiltroFotos {
  min: number;
  max: number;
  q?: string;
  etiqueta?: string;
  orden?: string;
  page: number;
  limit: number;
}

export interface FotosPaginadas {
  data: Foto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotoRepo: Repository<Foto>,
    @InjectRepository(Etiqueta)
    private readonly etiquetasRepo: Repository<Etiqueta>,
  ) {}

  async findAll({
    min,
    max,
    q,
    etiqueta,
    orden,
    page,
    limit,
  }: FiltroFotos): Promise<FotosPaginadas> {
    if (min > max) {
      throw new BadRequestException('min no puede ser mayor que max');
    }
    if (page < 1 || limit < 1) {
      throw new BadRequestException('page y limit deben ser mayores que 0');
    }

    // Reto 2: ?orden=asc|desc ordena por calificación (sin orden, por id)
    const direccion = orden?.trim().toUpperCase();
    if (direccion && direccion !== 'ASC' && direccion !== 'DESC') {
      throw new BadRequestException('orden debe ser asc o desc');
    }

    // Reto 1: ?etiqueta=playa filtra por la relación N:M.
    // Se hace en dos pasos: si filtráramos y cargáramos `etiquetas` en la misma
    // consulta, el JOIN recortaría la lista y cada foto mostraría solo "playa".
    const base: FindOptionsWhere<Foto> = { calificacion: Between(min, max) };
    const nombreEtiqueta = etiqueta?.trim().toLowerCase();
    if (nombreEtiqueta) {
      const conEtiqueta = await this.fotoRepo.find({
        select: { id: true },
        where: { etiquetas: { nombre: nombreEtiqueta } },
      });
      if (conEtiqueta.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      base.id = In(conEtiqueta.map((foto) => foto.id));
    }

    const texto = q?.trim();
    const where: FindOptionsWhere<Foto>[] = texto
      ? [
          { ...base, titulo: ILike(`%${texto}%`) },
          { ...base, descripcion: ILike(`%${texto}%`) },
        ]
      : [base];

    const [data, total] = await this.fotoRepo.findAndCount({
      where,
      // Reto 3: el listado incluye el álbum de cada foto
      relations: { album: true, etiquetas: true },
      order: direccion
        ? { calificacion: direccion as 'ASC' | 'DESC', id: 'ASC' }
        : { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Foto> {
    const foto = await this.fotoRepo.findOne({
      where: { id },
      relations: { album: true, etiquetas: true },
    });

    if (!foto) {
      throw new NotFoundException(`Foto ${id} no encontrada`);
    }

    return foto;
  }

  async create({ albumId, etiquetas, ...datos }: CreateFotoDto): Promise<Foto> {
    const foto = this.fotoRepo.create({
      ...datos,
      album: albumId ? { id: albumId } : null,
      etiquetas: await this.buscarOCrearEtiquetas(etiquetas),
    });
    const guardada = await this.fotoRepo.save(foto);
    return this.findOne(guardada.id);
  }

  // Reutiliza las etiquetas que ya existen y crea las nuevas
  private async buscarOCrearEtiquetas(nombres: string[] = []): Promise<Etiqueta[]> {
    const limpios = [...new Set(nombres.map((n) => n.trim().toLowerCase()))];
    const existentes = await this.etiquetasRepo.findBy({ nombre: In(limpios) });
    const nuevas = limpios
      .filter((n) => !existentes.some((e) => e.nombre === n))
      .map((nombre) => this.etiquetasRepo.create({ nombre }));
    return [...existentes, ...(await this.etiquetasRepo.save(nuevas))];
  }

  async update(id: number, { albumId, etiquetas, ...datos }: UpdateFotoDto): Promise<Foto> {
    const foto = await this.findOne(id); // 404 si no existe
    Object.assign(foto, datos);
    if (albumId !== undefined) {
      // albumId: null quita la foto de su álbum
      foto.album = albumId ? ({ id: albumId } as Foto['album']) : null;
    }
    if (etiquetas) foto.etiquetas = await this.buscarOCrearEtiquetas(etiquetas);
    await this.fotoRepo.save(foto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const foto = await this.findOne(id); // 404 si no existe
    await this.fotoRepo.remove(foto);
  }
}
