import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm';
import {Foto} from '../../fotos/entities/foto.entity.js'

@Entity('albumes')
export class Album {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 80})
    nombre: string;

    // 1:N
    @OneToMany(() => Foto, (foto) => foto.album)
    fotos: Foto[];
}