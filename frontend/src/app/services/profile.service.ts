import { Injectable, signal } from '@angular/core';

const STORAGE_PROFILE_PHOTOS = 'fm_profile_photos';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly photos = signal<Record<string, string>>(this.readPhotos());

  photoFor(usuarioId: string | undefined): string {
    if (!usuarioId) {
      return '';
    }

    return this.photos()[usuarioId] ?? '';
  }

  initials(nome: string | undefined): string {
    const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
      return 'FM';
    }

    return partes
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  savePhoto(usuarioId: string, photo: string): void {
    const nextPhotos = { ...this.photos(), [usuarioId]: photo };
    this.photos.set(nextPhotos);
    localStorage.setItem(STORAGE_PROFILE_PHOTOS, JSON.stringify(nextPhotos));
  }

  private readPhotos(): Record<string, string> {
    const raw = localStorage.getItem(STORAGE_PROFILE_PHOTOS);

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {};
    }
  }
}
