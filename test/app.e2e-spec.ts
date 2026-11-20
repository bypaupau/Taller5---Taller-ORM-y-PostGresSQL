import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('Fotos API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('completa el CRUD en memoria', async () => {
    await request(app.getHttpServer())
      .get('/api/fotos')
      .expect(200)
      .expect([
        {
          id: 1,
          titulo: 'Atardecer',
          descripcion: 'Playa de Montañita',
          calificacion: 4.5,
        },
        {
          id: 2,
          titulo: 'Malecón',
          descripcion: 'Guayaquil de noche',
          calificacion: 4,
        },
      ]);

    const creada = await request(app.getHttpServer())
      .post('/api/fotos')
      .send({
        titulo: 'Laguna de Quilotoa',
        descripcion: 'Excursión de fin de semana',
        calificacion: 5,
      })
      .expect(201);

    expect(creada.body).toMatchObject({ id: 3, titulo: 'Laguna de Quilotoa' });

    await request(app.getHttpServer())
      .patch('/api/fotos/1')
      .send({ calificacion: 0 })
      .expect(200)
      .expect({
        id: 1,
        titulo: 'Atardecer',
        descripcion: 'Playa de Montañita',
        calificacion: 0,
      });

    return request(app.getHttpServer())
      .delete('/api/fotos/3')
      .expect(204)
      .expect('');
  });

  it('devuelve 404 al consultar una foto inexistente', () => {
    return request(app.getHttpServer()).get('/api/fotos/999').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
