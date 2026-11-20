import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Foto } from './entities/foto.entity.js';
import { FotosService } from './fotos.service.js';

describe('FotosService', () => {
  let service: FotosService;
  let repo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repo = {
      find: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((datos) => datos),
      save: vi.fn(async (foto) => ({ id: 3, ...foto })),
      delete: vi.fn(),
    };
    service = new FotosService(repo as unknown as Repository<Foto>);
  });

  it('crea una foto', async () => {
    const creada = await service.create({
      titulo: 'Laguna de Quilotoa',
      descripcion: 'Excursión de fin de semana',
      calificacion: 5,
    });

    expect(creada).toMatchObject({ id: 3, titulo: 'Laguna de Quilotoa', calificacion: 5 });
  });

  it('actualiza parcialmente una foto', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, titulo: 'Atardecer', calificacion: 4.5 });

    await expect(service.update(1, { calificacion: 0 })).resolves.toMatchObject({
      id: 1,
      titulo: 'Atardecer',
      calificacion: 0,
    });
  });

  it('lanza NotFoundException si la foto no existe', async () => {
    repo.findOneBy.mockResolvedValue(null);
    repo.delete.mockResolvedValue({ affected: 0 });

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });

  it('valida el título al actualizar', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, titulo: 'Atardecer' });

    await expect(service.update(1, { titulo: '' })).rejects.toThrow(BadRequestException);
  });
});
