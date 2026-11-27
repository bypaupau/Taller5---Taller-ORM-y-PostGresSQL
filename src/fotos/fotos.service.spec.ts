import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { In, type Repository } from 'typeorm';
import { Etiqueta } from './entities/etiqueta.entity.js';
import { Foto } from './entities/foto.entity.js';
import { FotosService } from './fotos.service.js';

describe('FotosService', () => {
  let service: FotosService;
  let repo: {
    find: ReturnType<typeof vi.fn>;
    findAndCount: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    remove?: ReturnType<typeof vi.fn>;
  };
  let etiquetasRepo: {
    findBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repo = {
      find: vi.fn(),
      findAndCount: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((datos) => datos),
      save: vi.fn(async (foto) => ({ id: 3, ...foto })),
      delete: vi.fn(),
    };
    etiquetasRepo = {
      findBy: vi.fn(async () => [{ id: 1, nombre: 'playa' }]),
      create: vi.fn((datos) => datos),
      save: vi.fn(async (nuevas: { nombre: string }[]) =>
        nuevas.map((e, i) => ({ id: 10 + i, ...e })),
      ),
    };
    service = new FotosService(
      repo as unknown as Repository<Foto>,
      etiquetasRepo as unknown as Repository<Etiqueta>,
    );
  });

  it('crea una foto con álbum y etiquetas (reutiliza las existentes)', async () => {
    repo.findOne.mockImplementation(async ({ where }) => ({ id: where.id, titulo: 'Laguna de Quilotoa' }));

    const creada = await service.create({
      titulo: 'Laguna de Quilotoa',
      calificacion: 5,
      ruta: 'https://picsum.photos/id/1/600/400',
      albumId: 2,
      etiquetas: [' Playa ', 'faro', 'playa'],
    });

    expect(creada).toMatchObject({ id: 3, titulo: 'Laguna de Quilotoa' });
    expect(etiquetasRepo.save).toHaveBeenCalledWith([{ nombre: 'faro' }]);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        album: { id: 2 },
        etiquetas: [{ id: 1, nombre: 'playa' }, { id: 10, nombre: 'faro' }],
      }),
    );
  });

  it('actualiza parcialmente una foto', async () => {
    repo.findOne.mockResolvedValue({ id: 1, titulo: 'Atardecer', calificacion: 4.5 });

    await expect(service.update(1, { calificacion: 0 })).resolves.toMatchObject({
      id: 1,
      titulo: 'Atardecer',
      calificacion: 0,
    });
  });

  it('lanza NotFoundException si la foto no existe', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.delete.mockResolvedValue({ affected: 0 });

    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });

  it('al actualizar cambia el álbum y reemplaza las etiquetas', async () => {
    const foto = { id: 21, titulo: 'Cerro Santa Ana', album: { id: 2 }, etiquetas: [] };
    repo.findOne.mockResolvedValue(foto);

    await service.update(21, { albumId: 3, etiquetas: ['playa'] });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Cerro Santa Ana',
        album: { id: 3 },
        etiquetas: [{ id: 1, nombre: 'playa' }],
      }),
    );
  });

  it('elimina una foto existente', async () => {
    const foto = { id: 21, titulo: 'Cerro Santa Ana' };
    repo.findOne.mockResolvedValue(foto);
    repo.remove = vi.fn();

    await service.remove(21);

    expect(repo.remove).toHaveBeenCalledWith(foto);
  });

  it('lista fotos con filtros y paginación', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 3, titulo: 'Atardecer' }], 12]);

    const resultado = await service.findAll({ min: 3, max: 5, q: 'atar', page: 2, limit: 5 });

    expect(resultado).toEqual({ data: [{ id: 3, titulo: 'Atardecer' }], total: 12, page: 2, limit: 5 });
    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { album: true, etiquetas: true },
        order: { id: 'ASC' },
        skip: 5,
        take: 5,
      }),
    );
  });

  it('rechaza min mayor que max', async () => {
    await expect(
      service.findAll({ min: 5, max: 1, page: 1, limit: 10 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('filtra por etiqueta en dos pasos (las fotos conservan todas sus etiquetas)', async () => {
    repo.find.mockResolvedValue([{ id: 3 }, { id: 8 }]);
    repo.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ min: 0, max: 5, etiqueta: ' Playa ', page: 1, limit: 10 });

    // 1) Busca los ids de las fotos que tienen la etiqueta
    expect(repo.find).toHaveBeenCalledWith({
      select: { id: true },
      where: { etiquetas: { nombre: 'playa' } },
    });
    // 2) Carga esas fotos por id, sin filtrar la relación etiquetas
    const { where } = repo.findAndCount.mock.calls[0][0];
    expect(where).toEqual([expect.objectContaining({ id: In([3, 8]) })]);
    expect(where[0]).not.toHaveProperty('etiquetas');
  });

  it('mantiene el filtro de etiqueta cuando también hay búsqueda', async () => {
    repo.find.mockResolvedValue([{ id: 3 }]);
    repo.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ min: 0, max: 5, q: 'foto', etiqueta: 'playa', page: 1, limit: 10 });

    const { where } = repo.findAndCount.mock.calls[0][0];
    expect(where).toHaveLength(2);
    for (const condicion of where) {
      expect(condicion).toMatchObject({ id: In([3]) });
    }
  });

  it('devuelve una lista vacía si ninguna foto tiene la etiqueta', async () => {
    repo.find.mockResolvedValue([]);

    const resultado = await service.findAll({ min: 0, max: 5, etiqueta: 'zzz', page: 1, limit: 10 });

    expect(resultado).toEqual({ data: [], total: 0, page: 1, limit: 10 });
    expect(repo.findAndCount).not.toHaveBeenCalled();
  });

  it('ordena por calificación descendente', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ min: 0, max: 5, orden: 'desc', page: 1, limit: 10 });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { calificacion: 'DESC', id: 'ASC' } }),
    );
  });

  it('rechaza un orden inválido', async () => {
    await expect(
      service.findAll({ min: 0, max: 5, orden: 'arriba', page: 1, limit: 10 }),
    ).rejects.toThrow(BadRequestException);
  });
});
