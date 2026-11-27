# Arquitectura de GeoDAIS Móvil

## Diagrama general

```mermaid
flowchart TB
    subgraph Cliente["Aplicación móvil / Web"]
        subgraph Presentacion["Presentación — Angular + Ionic"]
            Root["AppComponent<br/>IonApp + RouterOutlet"]
            Routes["App Routes<br/>carga diferida"]
            AuthUI["Bienvenida<br/>Login<br/>Registro de perfil"]
            MapUI["MapaPage<br/>Leaflet + Leaflet Draw"]
            RegisterUI["Registro de datos<br/>Productor · Agrarios<br/>Geométricos · Fotos · Profesional"]
            OtherUI["Lista · Leyenda<br/>Skyplot · Acerca de"]
        end

        subgraph Aplicacion["Servicios de aplicación"]
            Auth["AuthService<br/>login online/offline · roles"]
            RegisterData["RegisterDataService<br/>formularios · GeoJSON<br/>persistencia · sincronización"]
            GPS["GpsAcquisitionService<br/>captura de ubicación"]
            GPSState["GpsDataService<br/>estado GPS reactivo"]
            Legend["LegendDataService<br/>conteos reactivos"]
            API["ApiService<br/>HTTP e integración de servicios"]
        end

        subgraph Plataforma["Capacitor — capacidades del dispositivo"]
            Prefs["Preferences<br/>perfil · sesión · registros"]
            Files["Filesystem<br/>fotos y archivos"]
            Geolocation["Geolocation"]
            Camera["Camera / Media"]
            Network["Network"]
            Notifications["Local Notifications"]
        end
    end

    subgraph Externo["Servicios externos"]
        Firebase["Firebase Authentication"]
        Backend["API DEVIDA<br/>registros"]
        RENIEC["RENIEC vía Decolecta"]
        MIDAGRI["MIDAGRI"]
        ArcGIS["ArcGIS<br/>ubigeo y oficinas zonales"]
        Tiles["Proveedores de mapas<br/>OpenStreetMap · Google"]
    end

    Root --> Routes
    Routes --> AuthUI
    Routes --> MapUI
    Routes --> RegisterUI
    Routes --> OtherUI

    AuthUI --> Auth
    Auth --> Network
    Auth --> Prefs
    Auth --> Firebase

    MapUI --> RegisterData
    MapUI --> GPS
    MapUI --> GPSState
    MapUI --> Legend
    MapUI --> Tiles
    GPS --> Geolocation
    GPS --> GPSState
    RegisterUI --> RegisterData
    RegisterUI --> Prefs
    RegisterData --> Prefs
    RegisterData --> Files
    RegisterData --> Camera
    RegisterData --> Network
    RegisterData --> Notifications
    RegisterData --> GPSState
    RegisterData --> API
    API --> Backend
    API --> RENIEC
    API --> MIDAGRI
    RegisterData --> ArcGIS
    Legend --> MapUI
```

## Capas y responsabilidades

- **Presentación:** `AppComponent` contiene el `IonRouterOutlet`. Las rutas Angular cargan las páginas bajo demanda. `MapaPage` muestra el mapa y coordina la navegación a las pestañas de captura.
- **Servicios de aplicación:** gestionan autenticación, formularios y registros, ubicación GPS, estado de la leyenda e integración HTTP. `RegisterDataService` comparte el estado del registro mediante `BehaviorSubject` y gestiona registros locales y pendientes de sincronización.
- **Plataforma móvil:** Capacitor proporciona almacenamiento (`Preferences`), archivos (`Filesystem`), cámara, geolocalización, conectividad y notificaciones. La aplicación también puede ejecutarse en navegador, aunque ciertas capacidades dependen de la plataforma.
- **Servicios externos:** Firebase Authentication para el acceso conectado; API DEVIDA para envío de registros; Decolecta/RENIEC y MIDAGRI para consultas de datos; ArcGIS para referencias geográficas; OpenStreetMap y Google para capas cartográficas.

## Flujos principales

1. **Acceso:** `LoginPage` delega en `AuthService`. Con conexión usa Firebase Authentication y guarda los datos necesarios para el modo sin conexión en `Preferences`; sin conexión valida contra ese almacenamiento local.
2. **Captura geográfica:** `GpsAcquisitionService` obtiene posiciones mediante Capacitor Geolocation y las publica en `GpsDataService`. En la captura de fotos y puntos del mapa reutiliza una lectura reciente cuando cumple el umbral horizontal; si el seguimiento GPS ya está activo, espera nuevas muestras en ese mismo seguimiento en lugar de abrir otro. La adquisición tiene un máximo de 5 segundos, puede terminar antes al alcanzar precisión alta y selecciona por separado las mejores lecturas horizontal y vertical. La precisión vertical permanece como no disponible cuando el dispositivo no la reporta.
3. **Registro y sincronización:** las pestañas de captura alimentan `RegisterDataService`. Los datos y archivos se guardan localmente; cuando se recupera la conexión, los registros pendientes se envían mediante `ApiService` a la API DEVIDA.
4. **Mapa:** `MapaPage` usa Leaflet y Leaflet Draw para la visualización y edición de geometrías y obtiene las teselas de los proveedores configurados.
