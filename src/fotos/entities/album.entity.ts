import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Foto } from '../../fotos/entities/foto.entity.js';

@Entity('albumes')
export class Album {
  @PrimaryGeneratedColumn()
  id: number;

  // Reto: repetir un nombre responde 409 gracias al TypeOrmExceptionFilter
  @Column({ length: 80, unique: true })
  nombre: string;

  // 1:N (al borrar el álbum, sus fotos quedan con album = null: onDelete 'SET NULL' en Foto)
  @OneToMany(() => Foto, (foto) => foto.album)
  fotos: Foto[];
}
