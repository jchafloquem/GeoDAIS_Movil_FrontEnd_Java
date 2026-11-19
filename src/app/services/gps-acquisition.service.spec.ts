import { TestBed } from '@angular/core/testing';
import { GeolocationPlugin, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { ToastController } from '@ionic/angular/standalone';
import { GPS_GEOLOCATION, GpsAcquisitionService } from './gps-acquisition.service';
import { GpsData, GpsDataService } from './gps-data.service';

describe('GpsAcquisitionService', () => {
  let service: GpsAcquisitionService;
  let gpsDataService: GpsDataService;
  let toastController: jasmine.SpyObj<ToastController>;
  let geolocation: jasmine.SpyObj<GeolocationPlugin>;

  const grantedPermissions = {
    location: 'granted',
    coarseLocation: 'granted',
  } as const;

  function makePosition(accuracy = 4): Position {
    return {
      timestamp: Date.now(),
      coords: {
        latitude: -12.0464,
        longitude: -77.0428,
        accuracy,
        altitude: 154,
        altitudeAccuracy: 7,
        speed: 1.2,
        heading: 90,
      },
    };
  }

  beforeEach(() => {
    toastController = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    geolocation = jasmine.createSpyObj<GeolocationPlugin>('Geolocation', [
      'checkPermissions',
      'requestPermissions',
      'watchPosition',
      'clearWatch',
    ]);
    geolocation.checkPermissions.and.resolveTo(grantedPermissions);
    geolocation.requestPermissions.and.resolveTo(grantedPermissions);
    geolocation.clearWatch.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        GpsAcquisitionService,
        GpsDataService,
        { provide: ToastController, useValue: toastController },
        { provide: GPS_GEOLOCATION, useValue: geolocation },
      ],
    });
    service = TestBed.inject(GpsAcquisitionService);
    gpsDataService = TestBed.inject(GpsDataService);
  });

  afterEach(() => {
    service.stopGpsWatch();
    TestBed.resetTestingModule();
  });

  it('starts one shared watch and publishes valid GPS data', async () => {
    let watchCallback: WatchPositionCallback | undefined;
    geolocation.watchPosition.and.callFake((_options, callback) => {
      watchCallback = callback;
      return Promise.resolve('shared-watch');
    });

    const snapshots: GpsData[] = [];
    const subscription = gpsDataService.currentGpsData.subscribe(data => snapshots.push(data));

    await Promise.all([service.startGpsWatch(), service.startGpsWatch()]);

    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1);
    expect(watchCallback).toBeDefined();

    const position = makePosition();
    watchCallback?.(position);

    expect(snapshots[snapshots.length - 1]).toEqual({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      alt: position.coords.altitude,
      vel: position.coords.speed,
      accH: position.coords.accuracy,
      accV: position.coords.altitudeAccuracy ?? null,
    });

    subscription.unsubscribe();
  });

  it('ignores a watch update with invalid coordinates', async () => {
    let watchCallback: WatchPositionCallback | undefined;
    geolocation.watchPosition.and.callFake((_options, callback) => {
      watchCallback = callback;
      return Promise.resolve('shared-watch');
    });

    const snapshots: GpsData[] = [];
    const subscription = gpsDataService.currentGpsData.subscribe(data => snapshots.push(data));
    await service.startGpsWatch();

    const invalidPosition = {
      ...makePosition(),
      coords: { ...makePosition().coords, latitude: 91 },
    };
    watchCallback?.(invalidPosition);

    expect(snapshots).toHaveSize(1);
    expect(snapshots[0].lat).toBeNull();
    subscription.unsubscribe();
  });

  it('reuses a fresh cached position when its accuracy is suitable for capture', async () => {
    let watchCallback: WatchPositionCallback | undefined;
    geolocation.watchPosition.and.callFake((_options, callback) => {
      watchCallback = callback;
      return Promise.resolve('shared-watch');
    });
    await service.startGpsWatch();

    const position = makePosition(10);
    watchCallback?.(position);
    const capturedPosition = await service.getBestPositionForCapture();

    expect(capturedPosition).toBe(position);
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('captures a high-accuracy position from a temporary watch and clears it', async () => {
    let captureCallback: WatchPositionCallback | undefined;
    geolocation.watchPosition.and.callFake((_options, callback) => {
      captureCallback = callback;
      return Promise.resolve('capture-watch');
    });

    let latestData: GpsData | undefined;
    const subscription = gpsDataService.currentGpsData.subscribe(data => {
      latestData = data;
    });
    const capturePromise = service.getBestPositionForCapture();
    await Promise.resolve();

    expect(captureCallback).toBeDefined();
    const position = makePosition();
    captureCallback?.(position);

    await expectAsync(capturePromise).toBeResolvedTo(position);
    expect(geolocation.clearWatch).toHaveBeenCalledWith({ id: 'capture-watch' });
    expect(latestData).toEqual({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      alt: position.coords.altitude,
      vel: position.coords.speed,
      accH: position.coords.accuracy,
      accV: position.coords.altitudeAccuracy ?? null,
    });
    subscription.unsubscribe();
  });

  it('rejects capture when location permission remains denied', async () => {
    const deniedPermissions = {
      location: 'denied',
      coarseLocation: 'denied',
    } as const;
    geolocation.checkPermissions.and.resolveTo(deniedPermissions);
    geolocation.requestPermissions.and.resolveTo(deniedPermissions);

    await expectAsync(service.getBestPositionForCapture())
      .toBeRejectedWithError('Activa la ubicación precisa para GeoMovilDAIS en los permisos de la aplicación.');
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it('clears the shared watch when stopped', async () => {
    geolocation.watchPosition.and.resolveTo('shared-watch');
    await service.startGpsWatch();

    service.stopGpsWatch();

    expect(geolocation.clearWatch).toHaveBeenCalledWith({ id: 'shared-watch' });
  });
});
