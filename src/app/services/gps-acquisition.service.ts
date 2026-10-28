import { Injectable, NgZone } from '@angular/core';
import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';
import {
  GpsData,
  GpsDataService,
  isBetterHorizontalPosition,
  isBetterVerticalPosition,
  isValidGpsAccuracy,
} from './gps-data.service';
import { ToastController } from '@ionic/angular/standalone';


@Injectable({
  providedIn: 'root'
})
export class GpsAcquisitionService {

  private readonly captureDurationMs = 3000;
  private watchId: string | null = null;
  private startPromise: Promise<void> | null = null;
  private generation = 0;

  constructor(
    private readonly gpsDataService: GpsDataService,
    private readonly zone: NgZone,
    private readonly toastController: ToastController
  ) { }

  public async startGpsWatch() {
    if (this.watchId) {
      console.log('[GpsAcquisitionService] El seguimiento GPS ya está activo.');
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    const generation = ++this.generation;
    const startPromise = this.createGpsWatch(generation);
    this.startPromise = startPromise;

    try {
      await startPromise;
    } finally {
      if (this.startPromise === startPromise) {
        this.startPromise = null;
      }
    }
  }

  private async createGpsWatch(generation: number): Promise<void> {
    try {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        permissions = await Geolocation.requestPermissions({ permissions: ['location'] });
      }

      if (permissions.location !== 'granted') {
        console.error('El permiso de ubicación precisa no fue concedido.');
        await this.showToast(
          'Activa la ubicación precisa para GeoMovilDAIS en los permisos de la aplicación.',
          'danger'
        );
        return;
      }

      if (generation !== this.generation) {
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        minimumUpdateInterval: 1000
      };

      console.log('[GpsAcquisitionService] Iniciando seguimiento GPS (watchPosition)...');
      const watchId = await Geolocation.watchPosition(options, (position, err) => {
        this.zone.run(() => {
          if (err) {
            console.error('Error al observar la posición del GPS', err);
            return;
          }

          if (position) {
            const { latitude, longitude, accuracy, altitude, altitudeAccuracy, speed } = position.coords;
            if (
              !Number.isFinite(latitude) ||
              latitude < -90 ||
              latitude > 90 ||
              !Number.isFinite(longitude) ||
              longitude < -180 ||
              longitude > 180 ||
              !isValidGpsAccuracy(accuracy)
            ) {
              console.warn('[GpsAcquisitionService] Se descartó una posición GPS inválida.');
              return;
            }

            const gpsData: GpsData = {
              lat: latitude,
              lng: longitude,
              alt: typeof altitude === 'number' && Number.isFinite(altitude) ? altitude : null,
              vel: typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
              accH: accuracy,
              accV: isValidGpsAccuracy(altitudeAccuracy) ? altitudeAccuracy : null,
            };
            this.gpsDataService.updateGpsData(gpsData);
          }
        });
      });

      if (generation !== this.generation) {
        await Geolocation.clearWatch({ id: watchId });
        return;
      }

      this.watchId = watchId;
    } catch (e) {
      console.error('Error al iniciar el seguimiento del GPS', e);
      const detail = e instanceof Error ? e.message : 'Error desconocido';
      await this.showToast(`Error al iniciar el servicio de GPS: ${detail}`, 'danger');
    }
  }

  public async getBestPositionForCapture(): Promise<Position> {
    let permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted') {
      permissions = await Geolocation.requestPermissions({ permissions: ['location'] });
    }

    if (permissions.location !== 'granted') {
      throw new Error('Activa la ubicación precisa para GeoMovilDAIS en los permisos de la aplicación.');
    }

    return new Promise<Position>((resolve, reject) => {
      let watchId: string | null = null;
      let bestHorizontalPosition: Position | null = null;
      let bestVerticalPosition: Position | null = null;
      let lastError: Error | null = null;
      let settled = false;

      const clearWatch = (id: string) => {
        void Geolocation.clearWatch({ id }).catch(error => {
          console.error('Error al detener la captura temporal del GPS', error);
        });
      };

      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        if (watchId) {
          clearWatch(watchId);
          watchId = null;
        }

        if (!bestHorizontalPosition) {
          reject(lastError ?? new Error('No se recibieron coordenadas GPS válidas en 3 segundos.'));
          return;
        }

        const horizontalCoords = bestHorizontalPosition.coords;
        const verticalCoords = bestVerticalPosition?.coords;
        const position: Position = {
          ...bestHorizontalPosition,
          coords: {
            ...horizontalCoords,
            altitude: verticalCoords ? verticalCoords.altitude : horizontalCoords.altitude,
            altitudeAccuracy: verticalCoords ? verticalCoords.altitudeAccuracy : null,
          },
        };
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, speed } = position.coords;
        const gpsData: GpsData = {
          lat: latitude,
          lng: longitude,
          alt: typeof altitude === 'number' && Number.isFinite(altitude) ? altitude : null,
          vel: typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
          accH: accuracy,
          accV: isValidGpsAccuracy(altitudeAccuracy) ? altitudeAccuracy : null,
        };
        this.zone.run(() => this.gpsDataService.updateGpsData(gpsData));
        resolve(position);
      };

      const timeoutId = setTimeout(finish, this.captureDurationMs);
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 1000,
        maximumAge: 0,
        minimumUpdateInterval: 1000,
      };

      Geolocation.watchPosition(options, (position, err) => {
        if (err) {
          lastError = err instanceof Error ? err : new Error('No se pudo leer la ubicación GPS.');
          return;
        }

        if (!position || !this.isValidPosition(position)) {
          return;
        }

        if (isBetterHorizontalPosition(bestHorizontalPosition, position)) {
          bestHorizontalPosition = position;
        }
        if (isBetterVerticalPosition(bestVerticalPosition, position)) {
          bestVerticalPosition = position;
        }
      }).then(id => {
        if (settled) {
          clearWatch(id);
        } else {
          watchId = id;
        }
      }).catch(error => {
        lastError = error instanceof Error ? error : new Error('No se pudo iniciar la captura GPS.');
        finish();
      });
    });
  }

  private isValidPosition(position: Position): boolean {
    const { latitude, longitude, accuracy } = position.coords;
    return Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180 &&
      isValidGpsAccuracy(accuracy);
  }

  public stopGpsWatch() {
    this.generation++;
    this.startPromise = null;

    if (this.watchId) {
      const watchId = this.watchId;
      this.watchId = null;
      void Geolocation.clearWatch({ id: watchId }).catch(error => {
        console.error('Error al detener el seguimiento del GPS', error);
      });
      console.log('[GpsAcquisitionService] Seguimiento GPS detenido.');
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      cssClass: 'multiline-toast'
    });
    await toast.present();
  }
}
