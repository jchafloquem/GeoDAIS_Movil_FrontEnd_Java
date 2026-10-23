import { Injectable, NgZone } from '@angular/core';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { GpsData, GpsDataService } from './gps-data.service';
import { ToastController } from '@ionic/angular/standalone';


@Injectable({
  providedIn: 'root'
})
export class GpsAcquisitionService {

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
        minimumUpdateInterval: 2000
      };

      console.log('[GpsAcquisitionService] Iniciando seguimiento GPS (watchPosition)...');
      const watchId = await Geolocation.watchPosition(options, (position, err) => {
        this.zone.run(() => {
          if (err) {
            console.error('Error al observar la posición del GPS', err);
            return;
          }

          if (position) {
            const gpsData: GpsData = {
              lat: position.coords.latitude ?? null,
              lng: position.coords.longitude ?? null,
              alt: position.coords.altitude ?? null,
              vel: position.coords.speed ?? null,
              accH: position.coords.accuracy ?? null,
              accV: position.coords.altitudeAccuracy ?? null,
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
