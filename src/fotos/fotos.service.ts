import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UpdateFotoDto } from './dto/update-foto.dto.js';
import { Foto } from './entities/foto.entity.js';

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotoRepo: Repository<Foto>,
  ) {}

  findAll(): Promise<Foto[]> {
    return this.fotoRepo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Foto> {
    const foto = await this.fotoRepo.findOneBy({ id });

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
