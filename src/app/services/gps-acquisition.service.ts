import { Injectable, NgZone } from '@angular/core';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { GpsData, GpsDataService } from './gps-data.service';
import { ToastController } from '@ionic/angular/standalone';


@Injectable({
  providedIn: 'root'
})
export class GpsAcquisitionService {

  private watchId: string | null = null;

  constructor(
    private readonly gpsDataService: GpsDataService,
    private readonly zone: NgZone,
    private readonly toastController: ToastController
  ) { }

  public async startGpsWatch() {
    // Evitar iniciar múltiples seguimientos
    if (this.watchId) {
      console.log('[GpsAcquisitionService] El seguimiento GPS ya está activo.');
      return;
    }

    try {
      const permissions = await Geolocation.requestPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        console.error('El permiso de geolocalización no fue concedido.');
        this.showToast('No se pudo iniciar el GPS. Se requieren permisos de ubicación.', 'danger');
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000
      };

      console.log('[GpsAcquisitionService] Iniciando seguimiento GPS (watchPosition)...');
      this.watchId = await Geolocation.watchPosition(options, (position, err) => {
        // Usamos NgZone para asegurar que las actualizaciones se propaguen correctamente en Angular
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
            // Actualiza los datos en tu servicio de estado global
            this.gpsDataService.updateGpsData(gpsData);
          }
        });
      });

    } catch (e) {
      console.error('Error al iniciar el seguimiento del GPS', e);
      this.showToast('Error al iniciar el servicio de GPS.', 'danger');
    }
  }

  public stopGpsWatch() {
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
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
