import { Component, NgZone, OnDestroy } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonLoading,
  IonMenu,
  IonMenuButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { App } from '@capacitor/app';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  add,
  addCircleOutline,
  addOutline,
  analyticsOutline,
  cellularOutline,
  checkmarkCircleOutline,
  cloudUploadOutline,
  createOutline,
  downloadOutline,
  ellipseOutline,
  globeOutline,
  imageOutline,
  informationCircleOutline,
  layersOutline,
  listOutline,
  locate,
  locationOutline,
  mailOutline,
  mapOutline,
  personAddOutline,
  planetOutline,
  removeOutline,
  shapesOutline,
  stopCircleOutline,
  trashOutline,
  walkOutline,
  wifiOutline,
} from 'ionicons/icons';
import { exitOutline } from 'ionicons/icons';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { RouterLink } from '@angular/router';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';
import { RegisterDataService } from 'src/app/services/register-data.service';
import {
  GPS_ACCURACY_THRESHOLDS,
  getGpsAccuracyQuality,
  GpsData,
  GpsDataService,
  isValidGpsAccuracy,
} from 'src/app/services/gps-data.service';
import { GpsAcquisitionService } from 'src/app/services/gps-acquisition.service';
import { Subscription } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { LegendDataService, LegendCounts } from 'src/app/services/legend-data.service';
import { LegendPage } from './pages/legend/legend.page';
// Declara L como una variable global para que TypeScript no se queje.
// Leaflet y Leaflet-draw se cargan globalmente a través de angular.json
declare var L: any;
const iconRetinaUrl = 'assets/images/marker-icon-2x.png';
const iconUrl = 'assets/images/marker-icon.png';
const shadowUrl = 'assets/images/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const iconYellow = L.icon({
  iconUrl: 'assets/images/marker-icon-yellow.png',
  shadowUrl: 'assets/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const iconGreen = L.icon({
  iconUrl: 'assets/images/marker-icon-green.png',
  shadowUrl: 'assets/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonButtons,
    IonFab,
    IonFabButton,
    IonLoading,
    IonSpinner,
    HttpClientModule,
    IonMenu,
    IonMenuButton,
    IonList,
    IonItem,
    IonLabel,
    RouterLink,
    IonButton,
    LegendPage,

  ]
})

export class MapaPage implements OnDestroy {

  private map: any | null = null;
  private userCircle: any | null = null;
  private pulseCircle: any | null = null;
  private pulseInterval: any = null;
  private isUserLocationMarkerHidden = true;
  private peruLayer: any | null = null;
  private drawnItems: any | null = null; // FeatureGroup para elementos dibujados
  private satelliteLayer: any | null = null;
  private lightLayer: any | null = null;
  private vertexMarkers: any | null = null;
  private walkingPolyline: any | null = null;
  private crosshairMarker: any | null = null;
  private watchId: string | null = null;
  private fixedPathDistance = 0;
  private drawingAccuracy: number | null = null;
  private gpsSubscription: Subscription | null = null;
  private polygonVertices: any[] = [];

  public isLoading = false;
  public gpsLoadingMessage = 'Obteniendo Geolocalización...';
  public gpsData: GpsData = {
    lat: null,
    lng: null,
    alt: null,
    vel: null,
    accH: null,
    accV: null,
  };

  public activeLayer: 'satellite' | 'streets' = 'satellite';
  public isDrawingPolygon = false;
  public isEditingMode = false;
  public showInitialSpinner = true;
  public isDrawingLine = false;
  public isOnline = true;
  public networkStatusChanged = false;
  public userRole: 'default' | 'polygon-only' | 'other-crops' | 'point-polygon' | 'animal-crops' = 'default'; // Propiedad para almacenar el rol del usuario

  // --- Getters de Permisos basados en Roles ---
  get canDrawLines(): boolean {
    // Solo el rol 'default' puede dibujar líneas
    return this.userRole === 'default';
  }

  get canDrawPoints(): boolean {
    // Los roles 'default' y 'point-polygon' pueden añadir puntos
    return this.userRole === 'default' || this.userRole === 'point-polygon';
  }

  get canDrawPolygons(): boolean {
    // Todos los roles pueden dibujar polígonos
    return true;
  }
  constructor(
    private http: HttpClient,
    private alertController: AlertController,
    private navCtrl: NavController,
    private toastController: ToastController,
    private zone: NgZone,
    private registerDataService: RegisterDataService,
    private gpsDataService: GpsDataService,
    private gpsAcquisitionService: GpsAcquisitionService,
    private authService: AuthService, // Inyectamos el AuthService
    private apiService: ApiService, // Inyectamos el ApiService
    private loadingController: LoadingController,
    private legendDataService: LegendDataService
  ) {
    addIcons({personAddOutline,listOutline,cloudUploadOutline,downloadOutline,createOutline,globeOutline,trashOutline,informationCircleOutline,exitOutline,mapOutline,planetOutline,cellularOutline,imageOutline,layersOutline,addOutline,removeOutline,locate,addCircleOutline,locationOutline,mailOutline,ellipseOutline,walkOutline,stopCircleOutline,checkmarkCircleOutline,shapesOutline,add,analyticsOutline,wifiOutline});
  }

  /**
   * Devuelve una clase CSS basada en la precisión actual del GPS para aplicar un código de colores.
   * @returns 'gps-good', 'gps-medium', o 'gps-bad'.
   */
  public getGpsAccuracyClass(): string {
    return `gps-${getGpsAccuracyQuality(this.gpsData.accH)}`;
  }

  public getGpsStatusLabel(): string {
    const quality = getGpsAccuracyQuality(this.gpsData.accH);
    if (!isValidGpsAccuracy(this.gpsData.accH)) {
      return 'Buscando señal';
    }
    if (quality === 'bad') {
      return 'Señal débil';
    }
    if (quality === 'medium') {
      return 'Precisión media';
    }
    return 'Precisión alta';
  }

  async ionViewWillEnter() {
    // Obtenemos el rol del usuario cuando la página está a punto de entrar en la vista
    this.userRole = await this.authService.getUserRole();
  }

  ionViewDidEnter() {
    this.initializeNetworkListener();

    this.gpsSubscription?.unsubscribe();
    this.gpsSubscription = this.gpsDataService.currentGpsData.subscribe((data: GpsData) => {
      this.gpsData = data;
      this.updateUserLocationMarker();
    });
    void this.gpsAcquisitionService.startGpsWatch();

    // Muestra un spinner inicial durante 5 segundos por estética
    setTimeout(() => {
      this.showInitialSpinner = false;
      this.updateUserLocationMarker(); // Intentamos actualizar el marcador con los datos iniciales
    }, 5000);

    if (!this.map) {
      // Usamos un timeout para asegurarnos de que el DOM de Ionic esté 100% listo.
      // Aumentamos ligeramente el tiempo para dar margen al renderizado del FAB
      setTimeout(() => this.initMap(), 400);
    } else {
      setTimeout(() => {
        this.map?.invalidateSize();
        // Al volver a la página, limpiamos los polígonos existentes y recargamos los guardados
        // para reflejar cualquier cambio (ej. un nuevo polígono guardado).
        if (this.drawnItems) {
          this.drawnItems.clearLayers();
        }
        this.loadSavedGeometries();
      }, 200);
    }
  }

  ngOnDestroy() {
    Network.removeAllListeners();
    this.gpsAcquisitionService.stopGpsWatch();

    if (this.gpsSubscription) {
      this.gpsSubscription.unsubscribe();
    }

    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
    }
    if (this.map) {
      // Limpiamos el intervalo para evitar fugas de memoria
      if (this.pulseInterval) {
        clearInterval(this.pulseInterval);
      }
      this.map.off();
      this.map.remove();
      this.map = null;
    }
  }

  private async initializeNetworkListener() {
    const initialStatus = await Network.getStatus();
    this.zone.run(() => {
      this.isOnline = initialStatus.connected;
    });

    Network.addListener('networkStatusChange', status => {
      this.zone.run(() => {
        // Solo animar si el estado realmente cambia
        if (this.isOnline !== status.connected) {
          this.isOnline = status.connected;
          this.networkStatusChanged = true;
          // La duración debe ser un poco mayor que la animación en el SCSS (700ms)
          setTimeout(() => this.networkStatusChanged = false, 1000);
        }
      });
    });
  }

  /**
   * Oculta los marcadores hasta que el usuario vuelva a centrar su ubicación.
   * El seguimiento GPS continúa actualizando los datos en segundo plano.
   */
  resetUserLocation() {
    this.isUserLocationMarkerHidden = true;
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
    if (this.userCircle) { this.userCircle.remove(); this.userCircle = null; }
    if (this.pulseCircle) { this.pulseCircle.remove(); this.pulseCircle = null; }
    this.registerDataService.showToast('Marcador de ubicación limpiado.', 'medium', 'top');
  }

  zoomIn() {
    // Limita el zoom-in para que no supere el nivel 10.
    if (this.map && this.map.getZoom() < 10) {
      this.map.zoomIn();
    }
  }

  zoomOut() {
    if (this.map) {
      this.map.zoomOut();
    }
  }

  switchLayer(layerName: 'satellite' | 'streets') {
    if (!this.map || !this.satelliteLayer || !this.lightLayer) return;

    if (layerName === 'satellite') {
      if (this.map.hasLayer(this.lightLayer)) {
        this.map.removeLayer(this.lightLayer);
      }
      if (!this.map.hasLayer(this.satelliteLayer)) {
        this.map.addLayer(this.satelliteLayer);
      }
    } else { // streets
      if (this.map.hasLayer(this.satelliteLayer)) {
        this.map.removeLayer(this.satelliteLayer);
      }
      if (!this.map.hasLayer(this.lightLayer)) {
        this.map.addLayer(this.lightLayer);
      }
    }
    this.activeLayer = layerName;
  }

  /**
   * Ajusta el zoom del mapa para mostrar la extensión completa de Perú.
   */
  zoomToPeru() {
    if (this.map && this.peruLayer) {
      this.map.fitBounds(this.peruLayer.getBounds(), {
        paddingBottomRight: L.point(50, 150) // 50px padding derecho (mueve a la izq), 150px inferior (mueve arriba)
      });
    }
  }

  async startDownloadProcess() {
    const alert = await this.alertController.create({
      header: 'Advertencia Importante',
      message: 'La descarga de mapas de proveedores como Google viola sus Términos de Servicio. Esta función es solo una demostración técnica y no debe usarse con fuentes de mapas protegidas. ¿Deseas continuar con una fuente de ejemplo (OpenStreetMap)?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Continuar',
          handler: () => {
            this.downloadTiles();
          }
        }
      ]
    });
    await alert.present();
  }

  async downloadTiles() {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    const minZoom = this.map.getZoom();
    const maxZoom = minZoom + 2; // Descargar 2 niveles de zoom

    const confirmation = await this.alertController.create({
      header: 'Confirmar Descarga',
      message: `Se iniciará la descarga del área visible para los niveles de zoom ${minZoom} a ${maxZoom}. Esto puede tardar y consumir datos.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar', handler: async () => {
            this.isLoading = true;
            for (let z = minZoom; z <= maxZoom; z++) {
              const tiles = this.getTilesInBounds(bounds, z);

              for (const tile of tiles) {
                // URL de la tesela (¡NO USAR CON GOOGLE!)
                const tileUrl = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;

                // Ruta local para guardar
                const localPath = `offline-tiles/${tile.z}/${tile.x}/${tile.y}.png`;

                try {
                  // Aquí iría la lógica real de descarga y guardado con Capacitor Filesystem
                  // Por ahora, solo simulamos para no violar términos de servicio.
                  await new Promise(resolve => setTimeout(resolve, 10)); // Pequeña pausa

                } catch (error) {
                }
              }
            }
            this.isLoading = false;
            const finalAlert = await this.alertController.create({ header: 'Éxito', message: 'Descarga (simulada) completada.', buttons: ['OK'] });
            await finalAlert.present();
          }
        }
      ]
    });
    await confirmation.present();
  }

  // Función para calcular las teselas dentro de un área
  getTilesInBounds(bounds: any, zoom: number) {
    const tiles = [];
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    const lat2tile = (lat: number, zoom: number) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    const lon2tile = (lon: number, zoom: number) => Math.floor((lon + 180) / 360 * Math.pow(2, zoom));

    const startX = lon2tile(southWest.lng, zoom);
    const startY = lat2tile(northEast.lat, zoom);
    const endX = lon2tile(northEast.lng, zoom);
    const endY = lat2tile(southWest.lat, zoom);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        tiles.push({ z: zoom, x: x, y: y });
      }
    }
    return tiles;
  }

  /**
   * Descarta el dibujo actual (polígono o línea) sin detener la captura de coordenadas GPS.
   * Esto permite al usuario reiniciar un dibujo sin perder la precisión del GPS.
   */
  public discardCurrentDrawing() {
    if (!this.isDrawingPolygon && !this.isDrawingLine) {
      this.registerDataService.showToast('No hay dibujo en curso para descartar.', 'warning', 'top');
      return;
    }

    // Resetear variables específicas del dibujo
    this.polygonVertices = [];
    this.fixedPathDistance = 0;

    // Eliminar elementos visuales temporales del mapa
    if (this.walkingPolyline) {
      this.map.removeLayer(this.walkingPolyline);
      this.walkingPolyline = null; // Establecer a null para que startDrawingByWalking lo re-cree
    }
    if (this.vertexMarkers) {
      this.vertexMarkers.clearLayers();
    }

    // Resetear el contenido del tooltip de la mira
    if (this.crosshairMarker) {
      this.crosshairMarker.setTooltipContent('0.0 m');
    }

    // Asegurarse de que la mira (crosshair) permanezca visible si ya estaba en el mapa,
    // lista para el nuevo dibujo.
    if (this.crosshairMarker && !this.map.hasLayer(this.crosshairMarker)) {
      this.crosshairMarker.addTo(this.map);
    }
    this.registerDataService.showToast('Dibujo actual descartado. Puede empezar uno nuevo.', 'success', 'top');
  }

  toggleDrawingMode() {
    if (this.isDrawingLine) {
      this.registerDataService.showToast('Finalice el dibujo de la línea primero.', 'warning', 'top');
      return;
    }
    this.isDrawingPolygon = !this.isDrawingPolygon;

    if (this.isDrawingPolygon) {
      this.startDrawingByWalking();
    } else {
      this.stopDrawingByWalking();
    }
  }

  toggleLineDrawing() {
    if (this.isDrawingPolygon) {
      this.registerDataService.showToast('Finalice el dibujo del polígono primero.', 'warning', 'top');
      return;
    }
    this.isDrawingLine = !this.isDrawingLine;
    if (this.isDrawingLine) {
      this.startDrawingByWalking(); // Reutilizamos la misma lógica de inicio
    } else {
      this.stopDrawingLine();
    }
  }

  addPolygonPoint() {
    // --- CONTROL DE PRECISIÓN HORIZONTAL ---
    // Solo permite añadir un punto si la precisión del GPS es de 10 metros o menos.
    const currentAccuracy = this.drawingAccuracy;
    if (!isValidGpsAccuracy(currentAccuracy) || currentAccuracy > GPS_ACCURACY_THRESHOLDS.drawing) {
      this.registerDataService.showToast(
        `Precisión GPS muy baja (${currentAccuracy?.toFixed(1) || 'N/A'} m). Espere a que sea ≤ ${GPS_ACCURACY_THRESHOLDS.drawing}m.`,
        'warning',
        'middle'
      );
      return;
    }

    if (!this.crosshairMarker) {
      this.registerDataService.showToast('La mira de dibujo no está activa.', 'danger', 'top');
      return;
    }

    const pointToAdd = this.crosshairMarker.getLatLng();
    let segmentDistance = 0;

    // Calcular y acumular la distancia del nuevo segmento
    if (this.polygonVertices.length > 0) {
      const lastVertex = this.polygonVertices[this.polygonVertices.length - 1];
      segmentDistance = lastVertex.distanceTo(pointToAdd);
      this.fixedPathDistance += segmentDistance;
    }

    // 1. Añadir el vértice a la lista
    this.polygonVertices.push(pointToAdd);

    // 2. Actualizar la polilínea que une los vértices
    this.walkingPolyline?.setLatLngs(this.polygonVertices);

    // 3. Añadir un marcador visual en el vértice con una etiqueta
    const pointNumber = this.polygonVertices.length;
    const tooltipContent = `Punto: ${pointNumber}<br>Dist: ${segmentDistance.toFixed(1)} m`;

    L.circleMarker(pointToAdd, {
      color: '#ff0000',
      radius: 5,
      weight: 2,
      fillOpacity: 0.8
    }).bindTooltip(tooltipContent, {
      permanent: true,
      direction: 'right',
      offset: [10, 0],
      className: 'vertex-tooltip'
    }).addTo(this.vertexMarkers);
  }

  private async startDrawingByWalking() {
    // Si no tenemos una ubicación GPS inicial, no podemos empezar a dibujar.
    if (this.gpsData.lat === null || this.gpsData.lng === null) {
      // Revertimos el estado del botón para que el usuario pueda intentarlo de nuevo.
      this.isDrawingPolygon = false;
      return;
    }

    // 1. Limpiar estado de dibujo anterior
    this.polygonVertices = [];
    this.vertexMarkers.clearLayers();
    this.fixedPathDistance = 0;
    this.drawingAccuracy = null;
    if (this.walkingPolyline) {
      this.map.removeLayer(this.walkingPolyline);
    }

    // 2. Inicializar nueva polilínea para los bordes
    this.walkingPolyline = L.polyline([], { color: '#ff0000', weight: 3 }).addTo(this.map);

    // 3. Opciones para el seguimiento GPS
    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    this.isLoading = true;
    try {
      // 4. Usar la última posición conocida del GPS como punto de partida.
      // Esto evita la espera y el posible timeout de getCurrentPosition.
      const initialPoint = L.latLng(this.gpsData.lat, this.gpsData.lng);

      // 5. Crear o mover la "mira" (crosshair) a esa posición inicial
      if (!this.crosshairMarker) {
        const crosshairIcon = L.divIcon({
          className: 'crosshair-icon',
          html: '+',
          iconSize: [30, 30],
          iconAnchor: [15, 15] // Centrar el icono
        });
        this.crosshairMarker = L.marker(initialPoint, { icon: crosshairIcon, interactive: false }).addTo(this.map);
        this.crosshairMarker.bindTooltip('0.0 m', {
          permanent: true,
          direction: 'top',
          offset: L.point(0, -15),
          className: 'distance-tooltip'
        }).openTooltip();
      } else {
        this.crosshairMarker.setLatLng(initialPoint);
      }
      this.map.panTo(initialPoint);

      // 6. Ahora, iniciar el seguimiento continuo para actualizar la posición de la mira
      this.watchId = await Geolocation.watchPosition(watchOptions, (position, err) => {
        if (err || !position) {
          this.toggleDrawingMode(); // Detener si hay un error de GPS
          this.registerDataService.showToast('Error de GPS al dibujar. Intente de nuevo.', 'danger', 'top');
          return;
        }

        const { latitude, longitude, accuracy } = position.coords;
        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          this.drawingAccuracy = null;
          console.warn('[MapaPage] Se descartó una posición GPS inválida durante el dibujo.');
          return;
        }

        this.drawingAccuracy = isValidGpsAccuracy(accuracy) ? accuracy : null;
        const newPoint = L.latLng(latitude, longitude);

        if (this.crosshairMarker) {
          this.crosshairMarker.setLatLng(newPoint);

          // Calcular distancia en tiempo real y actualizar tooltip
          let liveDistance = 0;
          if (this.polygonVertices.length > 0) {
            const lastVertex = this.polygonVertices[this.polygonVertices.length - 1];
            liveDistance = lastVertex.distanceTo(newPoint);
          }
          const totalDistance = this.fixedPathDistance + liveDistance;
          this.crosshairMarker.setTooltipContent(`${totalDistance.toFixed(1)} m`);
        }
        this.map.panTo(newPoint);
      });
    } catch (e) {
      // Si falla (ej. permisos denegados), revertir el estado y limpiar
      if (this.isDrawingPolygon) {
        this.toggleDrawingMode();
      }
      this.registerDataService.showToast('No se pudo iniciar el dibujo. Verifique los permisos de GPS.', 'danger', 'top');
    } finally {
      this.isLoading = false;
    }
  }

  private stopDrawingByWalking() {
    // 1. Detener seguimiento de ubicación
    this.drawingAccuracy = null;
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }

    // 2. Convertir a polígono si es válido
    if (this.polygonVertices.length > 2) {
      const polygon = L.polygon(this.polygonVertices, { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.2, weight: 3 });
      this.drawnItems.addLayer(polygon);

      // Actualizar las coordenadas GPS con la última posición conocida antes de abrir el modal
      if (this.crosshairMarker) {
        const lastKnownPosition = this.crosshairMarker.getLatLng();
        this.gpsData.lat = lastKnownPosition.lat;
        this.gpsData.lng = lastKnownPosition.lng;
      }
      this.registerDataService.createDraftAndNavigate(polygon.toGeoJSON());
    } else {
      this.registerDataService.showToast('Dibujo cancelado: se necesitan al menos 3 puntos.', 'warning', 'top');
      // Mejorar el mensaje si no se añadieron puntos o no fueron suficientes
      if (this.polygonVertices.length > 0) {
        this.registerDataService.showToast('Dibujo de polígono cancelado: se necesitan al menos 3 puntos.', 'warning', 'top');
      } else {
        this.registerDataService.showToast('Modo de dibujo de polígono finalizado.', 'medium', 'top');
      }
    }

    // 3. Limpiar elementos temporales del mapa
    if (this.walkingPolyline) {
      this.map.removeLayer(this.walkingPolyline);
      this.walkingPolyline = null;
    }
    if (this.crosshairMarker) {
      this.map.removeLayer(this.crosshairMarker);
      this.crosshairMarker = null;
    }
    this.vertexMarkers.clearLayers();
    this.polygonVertices = []; // Resetear para la próxima vez
  }

  private stopDrawingLine() {
    // 1. Detener seguimiento de ubicación
    if (this.watchId) {
      Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }

    // 2. Convertir a línea si es válido (al menos 2 puntos)
    if (this.polygonVertices.length > 1) {
      const line = L.polyline(this.polygonVertices, { color: '#ff0000', weight: 3 });
      this.drawnItems.addLayer(line);

      // Actualizar las coordenadas GPS con la última posición conocida antes de abrir el modal
      if (this.crosshairMarker) {
        const lastKnownPosition = this.crosshairMarker.getLatLng();
        this.gpsData.lat = lastKnownPosition.lat;
        this.gpsData.lng = lastKnownPosition.lng;
      }
      this.registerDataService.createDraftAndNavigate(line.toGeoJSON());
    } else {
      this.registerDataService.showToast('Dibujo cancelado: se necesitan al menos 2 puntos para una línea.', 'warning', 'top');
      // Mejorar el mensaje si no se añadieron puntos o no fueron suficientes
      if (this.polygonVertices.length > 0) {
        this.registerDataService.showToast('Dibujo de línea cancelado: se necesitan al menos 2 puntos.', 'warning', 'top');
      } else {
        this.registerDataService.showToast('Modo de dibujo de línea finalizado.', 'medium', 'top');
      }
    }

    // 3. Limpiar elementos temporales del mapa
    if (this.walkingPolyline) { this.map.removeLayer(this.walkingPolyline); this.walkingPolyline = null; }
    if (this.crosshairMarker) { this.map.removeLayer(this.crosshairMarker); this.crosshairMarker = null; }
    this.vertexMarkers.clearLayers();
    this.polygonVertices = [];
  }

  async addPointAtCurrentLocation() {
    if (this.isDrawingPolygon || this.isDrawingLine) {
      this.registerDataService.showToast('Termine de dibujar el polígono antes de añadir un punto.', 'warning', 'top');
      return;
    }

    this.gpsLoadingMessage = 'Midiendo precisión GPS H/V (hasta 3 s). Mantén el móvil quieto y al aire libre...';
    this.isLoading = true;
    let position: Position;
    try {
      position = await this.gpsAcquisitionService.getBestPositionForCapture();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await this.registerDataService.showToast(
        `No se pudo obtener la mejor lectura GPS: ${message}`,
        'danger',
        'middle'
      );
      return;
    } finally {
      this.isLoading = false;
      this.gpsLoadingMessage = 'Obteniendo Geolocalización...';
    }

    const { latitude, longitude, altitude } = position.coords;
    const pointGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude, typeof altitude === 'number' ? altitude : null]
      }
    };

    await this.registerDataService.createDraftAndNavigate(pointGeoJSON);
  }

  toggleEditMode() {
    this.isEditingMode = !this.isEditingMode;

    // Recargar los polígonos para aplicar los nuevos listeners de eventos y estilos
    if (this.drawnItems) {
      this.drawnItems.clearLayers();
      this.loadSavedGeometries();
    }

    this.registerDataService.showToast(
      this.isEditingMode ? 'Modo Edición Activado. Toca un polígono para editarlo.' : 'Modo Edición Desactivado.',
      this.isEditingMode ? 'primary' : 'medium',
      'middle'
    );
  }

  async confirmAndExitApp() {
    // 1. Verificar si hay un dibujo en curso
    if (this.isDrawingPolygon || this.isDrawingLine) {
      const alert = await this.alertController.create({
        header: 'Dibujo en Curso',
        message: 'Tiene un dibujo en curso. Si sale, el progreso se perderá. ¿Está seguro de que desea salir?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Salir', handler: () => App.exitApp() }
        ]
      });
      await alert.present();
      return;
    }

    // 2. Verificar si hay registros pendientes de sincronización
    const hasPending = await this.registerDataService.hasPendingSyncRecords();
    if (hasPending) {
      const alert = await this.alertController.create({
        header: 'Registros Pendientes',
        message: 'Tiene registros guardados que aún no se han sincronizado. Se intentará sincronizar la próxima vez que inicie la app con internet. ¿Desea salir ahora?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Salir', handler: () => App.exitApp() }
        ]
      });
      await alert.present();
      return;
    }

    // 3. Si no hay nada pendiente, solo una confirmación simple
    const alert = await this.alertController.create({
      header: 'Confirmar Salida',
      message: '¿Está seguro de que desea cerrar la aplicación?',
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Salir', handler: () => App.exitApp() }]
    });
    await alert.present();
  }

  /**
   * Orquesta el envío de todos los registros completos (verdes) al backend de DEVIDA.
   */
  public async enviarADevida() {
    // La lógica de envío se ha centralizado en el servicio para mayor consistencia y mantenibilidad.
    try {
      await this.registerDataService.sendAllCompletedRecords();
    } catch (error) {
      console.error('Error durante el envío:', error);
    } finally {
      // Después del envío, siempre recargamos las geometrías en el mapa para
      // reflejar los cambios (ej. registros eliminados o con errores).
      this.loadSavedGeometries();
    }
  }

  /**
   * Convierte un objeto de geometría GeoJSON a su representación Well-Known Text (WKT).
   * @param geometry El objeto de geometría GeoJSON.
   * @returns Una cadena WKT con componente Z, o null si la geometría es inválida.
   */
  // DEPRECADO: Esta función se ha movido al `register-data.service` para centralizar la lógica.
  // private convertGeoJsonToWkt(geometry: any): string | null { ... }


  async exportAllGeometries() {
    try {
      // 1. Clasificar todos los registros en 'completos' e 'incompletos' en una sola pasada.
      const { keys: allKeys } = await Preferences.keys();
      const geometryKeys = allKeys.filter(key =>
        key.startsWith('polygon_') ||
        key.startsWith('point_') ||
        key.startsWith('linestring_')
      );

      const completeRecordsToExport: any[] = [];
      const incompleteCounts = {
        polygons: 0,
        lines: 0,
        points: 0,
      };

      for (const key of geometryKeys) {
        const { value } = await Preferences.get({ key });
        if (!value) continue;

        try {
          const geojson = JSON.parse(value);
          const props = geojson.properties || {};

          // Definimos la condición de "incompleto"
          const isDraftOrPending = props.status === 'draft' || props.syncStatus === 'pending';
          const isDataMissing = this.isRecordIncomplete(props);

          if (isDraftOrPending || isDataMissing) {
            const geometryType = geojson.geometry.type;
            if (geometryType.includes('Polygon')) {
              incompleteCounts.polygons++;
            } else if (geometryType.includes('LineString')) {
              incompleteCounts.lines++;
            } else if (geometryType.includes('Point')) {
              incompleteCounts.points++;
            }
          } else {
            // AÑADIR LA CLAVE INTERNA PARA PODER ACTUALIZAR EL REGISTRO DESPUÉS
            if (!geojson.properties) geojson.properties = {};
            geojson.properties.internal_key = key;
            completeRecordsToExport.push(geojson); // Solo los completos se añaden a la lista de exportación
          }
        } catch (e) {
          // Si un registro no se puede parsear, se considera incompleto y se cuenta por su clave.
          if (key.startsWith('polygon_')) {
            incompleteCounts.polygons++;
          } else if (key.startsWith('linestring_')) {
            incompleteCounts.lines++;
          } else if (key.startsWith('point_')) {
            incompleteCounts.points++;
          }
        }
      }

      // 2. Si hay incompletos, mostrar advertencia y detener.
      const totalIncomplete = incompleteCounts.polygons + incompleteCounts.lines + incompleteCounts.points;
      if (totalIncomplete > 0) {
        const messageParts: string[] = [];
        if (incompleteCounts.polygons > 0) messageParts.push(`${incompleteCounts.polygons} polígono(s)`);
        if (incompleteCounts.lines > 0) messageParts.push(`${incompleteCounts.lines} línea(s)`);
        if (incompleteCounts.points > 0) messageParts.push(`${incompleteCounts.points} punto(s)`);

        const detailMessage = messageParts.join(', ');
        this.registerDataService.showToast(`Tiene geometrías por completar (${detailMessage}). Solo se pueden exportar registros completos (verdes).`, 'warning', 'middle');
        return;
      }

      // 3. Si no hay registros completos para exportar, informar y detener.
      if (completeRecordsToExport.length === 0) {
        this.registerDataService.showToast('No hay geometrías completas para exportar.', 'warning', 'middle');
        return;
      }

      // --- LÓGICA DE EXPORTACIÓN LOCAL ---
      // Se ha eliminado la lógica de envío al backend de esta función.

      // 4. Proceder con la exportación usando SOLO la lista de registros completos.
      // Cargar los datos del profesional para incluirlos en la exportación
      const { value: profileValue } = await Preferences.get({ key: 'userProfile' });
      let professionalProfile = null;
      if (profileValue) {
        professionalProfile = JSON.parse(profileValue);
      }

      // Obtener el identificador único del dispositivo
      const deviceId = await Device.getId();

      // Objeto para agrupar las geometrías por tipo
      const geometriesByType = {
        polygons: [] as any[],
        lines: [] as any[],
        points: [] as any[]
      };

      for (const geojson of completeRecordsToExport) {
        if (geojson) {
          const geometryType = geojson.geometry.type;

          // Añadir los datos del profesional si existen
          if (professionalProfile && geojson.properties) {
            geojson.properties.profesional_dni = professionalProfile.dni;
            geojson.properties.profesional_nombres = professionalProfile.nombres;
            geojson.properties.profesional_apellido_paterno = professionalProfile.apellidoPaterno;
            geojson.properties.profesional_apellido_materno = professionalProfile.apellidoMaterno;
            geojson.properties.profesional_celular = professionalProfile.celular;
            geojson.properties.profesional_email = professionalProfile.email;
          }
          // Añadir área y perímetro/longitud calculados
          if (geojson.geometry && geojson.properties) {
            const coords = geojson.geometry.coordinates;
            if (geometryType === 'Polygon' && coords && coords.length > 0 && coords[0].length > 2) {
              const latlngs: any[] = coords[0].map((c: any) => L.latLng(c[1], c[0]));
              const areaM2 = L.GeometryUtil.geodesicArea(latlngs);
              geojson.properties.area_ha = (areaM2 / 10000).toFixed(4);
              let perimeter = 0;
              for (let i = 0; i < latlngs.length - 1; i++) {
                perimeter += latlngs[i].distanceTo(latlngs[i + 1]);
              }
              if (latlngs.length > 0 && latlngs[0].distanceTo(latlngs[latlngs.length - 1]) > 1) {
                perimeter += latlngs[latlngs.length - 1].distanceTo(latlngs[0]);
              }
              geojson.properties.perimetro_m = perimeter.toFixed(2);
            } else if (geometryType === 'LineString' && coords && coords.length > 1) {
              const latlngs: any[] = coords.map((c: any) => L.latLng(c[1], c[0]));
              let length = 0;
              for (let i = 0; i < latlngs.length - 1; i++) {
                length += latlngs[i].distanceTo(latlngs[i + 1]);
              }
              geojson.properties.longitud_m = length.toFixed(2);
            }
          }
          // Añadir el UUID del dispositivo al final de las propiedades
          if (geojson.properties) {
            geojson.properties.device_uuid = (deviceId as unknown as { uuid: string }).uuid;
          }
          // Clasificar la geometría en su grupo correspondiente
          if (geometryType.includes('Polygon')) {
            geometriesByType.polygons.push(geojson);
          } else if (geometryType.includes('LineString')) {
            geometriesByType.lines.push(geojson);
          } else if (geometryType.includes('Point')) {
            geometriesByType.points.push(geojson);
          }
        }
      }
      // Ahora, escribir un archivo por cada tipo de geometría que tenga datos
      const exportFolderName = 'GeoMOVILDAIS_geometrias';
      let filesWritten = 0;
      // Obtenemos la fecha actual para el nombre del archivo
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      for (const type in geometriesByType) {
        const features = (geometriesByType as any)[type];
        if (features.length > 0) {
          const featureCollection = {
            type: 'FeatureCollection',
            features: features
          };

          const fileName = `${type}_${formattedDate}.geojson`; // Ej: polygons_2023-10-27.geojson
          const filePath = `${exportFolderName}/${fileName}`;

          await Filesystem.writeFile({
            path: filePath,
            data: JSON.stringify(featureCollection, null, 2), // pretty-print
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true
          });
          filesWritten++;
        }
      }

      // --- Mensaje final específico para exportación local ---
      if (filesWritten > 0) {
        this.registerDataService.showToast(
          `${filesWritten} archivo(s) GeoJSON guardados en la carpeta '${exportFolderName}' de su dispositivo.`,
          'success',
          'middle'
        );
      } else {
        this.registerDataService.showToast(
          'No se exportó ningún archivo.',
          'warning',
          'middle'
        );
      }

    } catch (error: any) {
      const alert = await this.alertController.create({
        header: 'Error de Exportación',
        message: `No se pudieron guardar los archivos. Asegúrese de que la aplicación tenga permisos para acceder al almacenamiento.\n\nError: ${error.message}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  private isRecordIncomplete(properties: any): boolean {
    // DEPRECADO: La lógica de validación ahora está centralizada en `registerDataService.isRecordComplete`.
    // Esta función ahora simplemente llama al método del servicio para mantener la consistencia.
    // La lógica negada es intencional: `isRecordComplete` devuelve `true` si está completo.
    // Para `isRecordIncomplete`, necesitamos el valor opuesto.
    return !this.registerDataService.isRecordComplete(properties);
  }
  private editGeometryInfo(key: string) {
    if (!key) return;
    // Navegamos a la ruta de edición, pasando la clave como parámetro en la URL.
    // La página de registro se encargará de cargar los datos usando esta clave.
    this.zone.run(() => {
      this.navCtrl.navigateForward(`/mapa/registerdata/${key}`);
    });
  }

  private async loadSavedGeometries() {
    if (!this.drawnItems) return;
    this.drawnItems.clearLayers(); // Limpiamos para evitar duplicados al recargar

    const counts: LegendCounts = {
      complete: 0,
      pending: 0,
      draft: 0,
    };

    // 1. Obtener todas las claves de Preferences
    const { keys } = await Preferences.keys();
    const geometryKeys = keys.filter(key => key.startsWith('polygon_') || key.startsWith('point_') || key.startsWith('linestring_'));

    // 2. Iterar sobre cada clave, obtener el GeoJSON y añadirlo al mapa
    for (const key of geometryKeys) {
      const { value } = await Preferences.get({ key });
      if (value) {
        try {
          const geojson = JSON.parse(value);
          const props = geojson.properties || {};
          const isDraft = props.status === 'draft';
          const isPendingSync = props.syncStatus === 'pending';
          const isDataMissing = this.isRecordIncomplete(props);
          const isUploaded = !!props.uploaded;

          // --- Lógica de conteo centralizada ---
          if (isDraft) {
            counts.draft++;
          } else if (isDataMissing || isPendingSync) {
            counts.pending++;
          } else {
            counts.complete++;
          }

          const geometryLayer = L.geoJSON(geojson, {
            style: (feature: any) => {
              const props = feature.properties || {};
              const isDraft = props.status === 'draft';
              const isPendingSync = props.syncStatus === 'pending';
              const isDataMissing = this.isRecordIncomplete(props);
              const isPolygon = feature.geometry.type.includes('Polygon');

              let color = '#2dd36f'; // Verde (completo) por defecto

              if (isDraft) {
                color = '#eb445a'; // Rojo (borrador, solo geometría)
              } else if (isPendingSync || isDataMissing) {
                color = '#ffc409'; // Ambar (pendiente de sincronización o con datos faltantes)
              }

              if (isPolygon) {
                return {
                  color: color,
                  weight: 3,
                  opacity: 0.8,
                  fillColor: color,
                  fillOpacity: 0.3
                };
              } else { // Para LineString
                return {
                  color: color,
                  weight: 3,
                  opacity: 0.7
                };
              }
            },
            pointToLayer: (feature: any, latlng: any) => {
              const props = feature.properties || {};
              const isDraft = props.status === 'draft';
              const isPendingSync = props.syncStatus === 'pending';
              const isDataMissing = this.isRecordIncomplete(props);

              let color = '#2dd36f'; // Verde (completo) por defecto

              if (isDraft) {
                color = '#eb445a'; // Rojo (borrador)
              } else if (isPendingSync || isDataMissing) {
                color = '#ffc409'; // Ambar (pendiente)
              }

              return L.circleMarker(latlng, {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
              });
            },
            onEachFeature: (feature: any, layer: any) => {
              const name = feature.properties?.name || (feature.geometry.type === 'Point' ? 'Punto sin nombre' : 'Polígono sin nombre');
              const isDraft = feature.properties?.status === 'draft';
              const isUploadedFeature = !!feature.properties?.uploaded;

              // Un borrador siempre es editable, o si el modo edición general está activo.
              if (isDraft || this.isEditingMode) {
                let actionText = "editar";
                if (isDraft) actionText = "completar";
                else if (isUploadedFeature) actionText = "ver"; // Cambiamos el texto si está subido

                const tooltipText = `Tocar para ${actionText}: <strong>${name}</strong>`;
                layer.bindTooltip(tooltipText, { permanent: false, sticky: true });

                layer.on('click', (e: any) => {
                  L.DomEvent.stop(e);
                  this.editGeometryInfo(key);
                });
              } else {
                // MODO NORMAL (no edición, no borrador): Muestra un popup con información.
                if (feature.properties) {
                  const popupContent = `
                    <strong>${name}</strong>
                    <p style="margin: 5px 0;">DNI: ${feature.properties.dni || 'No registrado'}</p>
                    <small>Creado: ${feature.properties.createdAt ? new Date(feature.properties.createdAt).toLocaleString() : 'N/A'}</small>
                  `;
                  layer.bindPopup(popupContent);
                }
              }
            }
          });
          this.drawnItems.addLayer(geometryLayer);
        } catch (e) {
        }
      }
    }

    // 3. Actualizar el servicio con los conteos finales para que la leyenda los reciba
    this.legendDataService.updateCounts(counts);
  }

  /**
   * Acción del botón: Muestra el indicador de carga y centra el mapa en el usuario.
   */
  async findAndCenterUser() {
    if (!this.map || this.gpsData.lat === null) {
      this.registerDataService.showToast('Ubicación GPS aún no disponible.', 'warning', 'top');
       return;
    }

    this.isLoading = true;
    // Forzamos la actualización de la UI para mostrar el spinner antes de las operaciones del mapa.
    await new Promise(resolve => setTimeout(resolve, 20));

    try {
      const { lat, lng } = this.gpsData;
      if (lat === null || lng === null) {
        this.registerDataService.showToast('Coordenadas GPS inválidas.', 'warning', 'top');
        this.isLoading = false;
        return;
      }

      this.isUserLocationMarkerHidden = false;
      this.ensureUserLocationMarker(L.latLng(lat, lng));

      this.map.setView([lat, lng], 18);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.registerDataService.showToast(`Error al centrar: ${errorMessage}`, 'danger', 'middle');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Crea o actualiza el marcador de la ubicación del usuario en el mapa.
   * Esta función es llamada cada vez que se recibe una nueva coordenada del GPS.
   */
  private updateUserLocationMarker() {
    if (
      this.isUserLocationMarkerHidden ||
      !this.map ||
      this.gpsData.lat === null ||
      this.gpsData.lng === null
    ) {
      return; // No hacer nada si no hay mapa o datos de GPS
    }

    const newLatLng = L.latLng(this.gpsData.lat, this.gpsData.lng);

    this.ensureUserLocationMarker(newLatLng);
  }

  private ensureUserLocationMarker(position: any) {
    if (!this.userCircle) {
      const crossIcon = L.divIcon({
        className: 'gps-position-marker',
        html: '<span class="gps-position-cross" aria-label="Ubicación GPS"></span>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      this.userCircle = L.marker(position, {
        icon: crossIcon,
        interactive: false,
        keyboard: false,
        title: 'Ubicación GPS actual',
      }).addTo(this.map);
    } else {
      this.userCircle.setLatLng(position);
    }

    if (!this.pulseCircle) {
      this.pulseCircle = L.circle(position, {
        color: 'transparent',
        fillColor: '#3880ff',
        fillOpacity: 0.5,
        radius: 10,
        weight: 0,
      }).addTo(this.map);
      this.startPulseAnimation();
    } else {
      this.pulseCircle.setLatLng(position);
    }
  }

  private initMap(): void {
    // Verificación crucial: si el mapa ya existe, no hacemos nada.
    if (this.map) {
      return;
    }

    const map = L.map('map', {
      center: [-9.00, -70.0152],
      zoomControl: false,
      zoom: 10
    });
    map.attributionControl.setPrefix(false);

    // --- INICIO: Añadir control de búsqueda de direcciones (leaflet-geosearch) ---
    const provider = new OpenStreetMapProvider({
      params: {
        countrycodes: 'pe', // Limitar la búsqueda a Perú
        viewbox: '-81.3,0,-68.6,-18.4', // Bounding box de Perú para sesgar resultados
        bounded: true, // Restringir resultados estrictamente al viewbox
      },
    });
    const searchControl = GeoSearchControl({
      provider: provider,
      style: 'button', // Muestra una barra de búsqueda en lugar de un botón
      showMarker: true, // Muestra un marcador en el resultado
      showPopup: false, // No muestra un popup
      marker: {
        icon: iconDefault, // Usa el ícono azul por defecto
        draggable: false,
      },
      autoClose: true, // Cierra los resultados al seleccionar uno
      keepResult: true, // Mantiene el texto del resultado en la barra
      searchLabel: 'Buscar dirección o lugar...' // Texto de placeholder
    });
    map.addControl(searchControl);
    // --- FIN: Añadir control de búsqueda de direcciones ---

    this.lightLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }
    );
    this.satelliteLayer = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { attribution: '&copy; Google', maxZoom: 20 }
    );

    // Añadimos la capa de mapa por defecto
    this.satelliteLayer.addTo(map);
    const scaleControl = L.control.scale({ metric: true, imperial: false, maxWidth: 100 }).addTo(map);
    const scaleSlot = map.getContainer().parentElement?.querySelector('.map-scale-slot');
    if (!scaleSlot) {
      throw new Error('No se encontró el contenedor para la escala del mapa.');
    }
    scaleSlot.appendChild(scaleControl.getContainer());


    // Inicializamos el FeatureGroup para los elementos dibujados
    this.drawnItems = new L.FeatureGroup();
    this.drawnItems.addTo(map);

    // Inicializamos el FeatureGroup para los marcadores de vértices
    this.vertexMarkers = new L.FeatureGroup();
    this.vertexMarkers.addTo(map);

    // Creamos un control para editar y borrar, pero no para dibujar nuevas formas.
    const editControl = new L.Control.Draw({
      position: 'topright',
      edit: {
        featureGroup: this.drawnItems,
        remove: false,
      },
      draw: false // Desactivamos las herramientas de dibujo manual
    });


    // Eventos para los elementos dibujados (útil si se editan/borran con leaflet-draw)
    map.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      this.drawnItems?.addLayer(layer);
    });

    map.on(L.Draw.Event.DELETED, (event: any) => {
    });

    // Cargamos y añadimos el límite de Departamentos desde el archivo GeoJSON
    this.http.get('assets/data/departamentos.geojson').subscribe((data: any) => {
      this.peruLayer = L.geoJSON(data, {
        style: {
          color: '#ff7800', // Color de la línea
          weight: 2,       // Grosor de la línea
          opacity: 0.9,    // Opacidad
          fillColor: '#ff7800',
          fillOpacity: 0 // No rellenar el polígono
        }
      }).addTo(map);
      map.fitBounds(this.peruLayer.getBounds(), {
        paddingBottomRight: L.point(50, 150) // 50px padding derecho (mueve a la izq), 150px inferior (mueve arriba)
      });
      // Establecemos el zoom mínimo al que se ajusta el mapa para ver todo el país.
      map.setMinZoom(map.getZoom());
    });

    this.map = map;
    this.updateUserLocationMarker();

    // Cargamos los polígonos guardados en el dispositivo
    this.loadSavedGeometries();
  }

  /**
   * Inicia la animación de pulso para el marcador de ubicación del usuario.
   */
  private startPulseAnimation() {
    const maxRadius = 40;
    let radius = 10;
    this.pulseInterval = setInterval(() => {
      if (!this.pulseCircle) {
        clearInterval(this.pulseInterval);
        return;
      }
      radius += 1.5;
      if (radius >= maxRadius) radius = 10;
      this.pulseCircle.setRadius(radius);
      this.pulseCircle.setStyle({ fillOpacity: 0.5 * (1 - (radius / maxRadius)) });
    }, 50);
  }
}
