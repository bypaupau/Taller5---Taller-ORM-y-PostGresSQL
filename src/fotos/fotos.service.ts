import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, ILike, Repository } from 'typeorm';
import type { UpdateFotoDto } from './dto/update-foto.dto.js';
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

    // Reto 1: ?etiqueta=playa filtra por la relación N:M
    const nombreEtiqueta = etiqueta?.trim();
    const base: FindOptionsWhere<Foto> = {
      calificacion: Between(min, max),
      ...(nombreEtiqueta && { etiquetas: { nombre: nombreEtiqueta } }),
    };

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

  create(datos: Partial<Foto>): Promise<Foto> {
    const foto = this.fotoRepo.create(datos);
    return this.fotoRepo.save(foto);
  }

  async update(id: number, updateFotoDto: UpdateFotoDto): Promise<Foto> {
    const foto = await this.findOne(id);

    if ('titulo' in updateFotoDto) {
      foto.titulo = this.validarTitulo(updateFotoDto.titulo);
    }
    if ('descripcion' in updateFotoDto) {
      foto.descripcion = this.validarDescripcion(updateFotoDto.descripcion);
    }
    if ('calificacion' in updateFotoDto) {
      foto.calificacion = this.validarCalificacion(updateFotoDto.calificacion);
    }

    return this.fotoRepo.save(foto);
  }

  async remove(id: number): Promise<void> {
    const foto = await this.findOne(id);
    await this.fotoRepo.remove(foto);
  }

  private validarTitulo(valor: unknown): string {
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new BadRequestException('El título es obligatorio');
    }
    if (valor.trim().length > 100) {
      throw new BadRequestException('El título no puede superar 100 caracteres');
    }

    return valor.trim();
  }

  private validarDescripcion(valor: unknown): string | null {
    if (valor === undefined || valor === null) {
      return null;
    }
    if (typeof valor !== 'string') {
      throw new BadRequestException('La descripción debe ser texto');
    }

    return valor;
  }

  private validarCalificacion(valor: unknown): number | null {
    if (valor === undefined || valor === null) {
      return null;
    }
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      throw new BadRequestException('La calificación debe ser un número válido');
    }

    return valor;
  }
}
