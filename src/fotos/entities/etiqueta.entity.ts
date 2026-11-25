import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Foto } from './foto.entity.js';

@Entity('etiquetas')
export class Etiqueta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  nombre: string;

  // N:M lado inverso (el @JoinTable está en Foto)
  @ManyToMany(() => Foto, (foto) => foto.etiquetas)
  fotos: Foto[];
}
