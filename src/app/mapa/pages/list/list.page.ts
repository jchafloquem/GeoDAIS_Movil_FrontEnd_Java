import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  ActionSheetController,
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonImg,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  NavController
} from '@ionic/angular/standalone';
import { shapesOutline, locationOutline, analyticsOutline, createOutline, trashOutline, listOutline, imageOutline, ellipsisVerticalOutline, close, mapOutline, listCircleOutline, arrowBackCircleOutline, lockClosed, eyeOutline } from 'ionicons/icons';
import { RegistroParcelaApiRecord, SavedRecordSummary } from 'src/app/interfaces/register-data.interfaces';
import { ApiService } from 'src/app/services/api.service';
import { RegisterDataService } from 'src/app/services/register-data.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonButtons,
    IonCard,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonThumbnail,
    IonImg,
    IonButton]
})
export class ListPage {
  public savedItems: SavedRecordSummary[] = [];
  public viewMode: 'local' | 'server' = 'local';
  public serverItems: RegistroParcelaApiRecord[] = [];
  public serverPage = 0;
  public serverSize = 50;
  public serverTotal = 0;
  public serverTotalPages = 0;
  public serverLoading = false;
  public serverError: string | null = null;

  constructor(
    private navCtrl: NavController,
    private alertController: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private registerDataService: RegisterDataService,
    private apiService: ApiService
  ) {
    addIcons({
      arrowBackCircleOutline,
      listCircleOutline,
      listOutline,
      imageOutline,
      ellipsisVerticalOutline,
      mapOutline,
      shapesOutline,
      locationOutline,
      analyticsOutline,
      createOutline,
      trashOutline,
      close,
      lockClosed,
      eyeOutline
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  async ionViewWillEnter() {
    await this.loadSavedItems();
    if (this.viewMode === 'server') {
      await this.loadServerItems(true);
    }
  }

  async loadSavedItems() {
    this.savedItems = await this.registerDataService.getSortedSavedRecords();
  }

  async onViewModeChanged() {
    if (this.viewMode === 'server') {
      await this.loadServerItems(true);
    } else {
      await this.loadSavedItems();
    }
  }

  async loadServerItems(reset = false) {
    if (this.serverLoading) {
      return;
    }
    if (reset) {
      this.serverPage = 0;
      this.serverItems = [];
      this.serverTotalPages = 0;
    } else if (this.serverPage >= this.serverTotalPages) {
      return;
    }

    this.serverLoading = true;
    this.serverError = null;
    try {
      const result = await this.apiService.listarParcelas(this.serverPage, this.serverSize);
      if (!result.success) {
        throw new Error('El backend no devolvió los registros correctamente.');
      }
      this.serverItems = reset ? result.data : [...this.serverItems, ...result.data];
      this.serverTotal = result.total;
      this.serverTotalPages = result.totalPages;
      this.serverPage = result.page + 1;
    } catch (error) {
      this.serverError = error instanceof Error ? error.message : 'No se pudieron leer los registros del backend.';
    } finally {
      this.serverLoading = false;
    }
  }

  nombreProductor(item: RegistroParcelaApiRecord): string {
    return item.nombreCompleto
      || [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ');
  }

  editItem(item: SavedRecordSummary) {
    this.navCtrl.navigateForward(`/mapa/registerdata/${item.key}`);
  }

  async presentActionSheet(item: SavedRecordSummary, index: number, event: Event) {
    event.stopPropagation(); // Evita que el click se propague al card

    const buttons = [];

    // 1. Botón Editar / Ver
    if (item.uploaded) {
      buttons.push({
        text: 'Ver (Solo Lectura)',
        icon: 'eye-outline',
        handler: () => {
          this.editItem(item);
        }
      });
    } else {
      buttons.push({
        text: 'Editar',
        icon: 'create-outline',
        handler: () => {
          this.editItem(item);
        }
      });
    }

    // 2. Botón Eliminar (Solo si NO ha sido enviado)
    if (!item.uploaded) {
      buttons.push({
        text: 'Eliminar',
        role: 'destructive',
        icon: 'trash-outline',
        handler: () => {
          this.deleteItem(item, index);
        }
      });
    }

    // 3. Botón Cancelar (Siempre visible)
    buttons.push({
      text: 'Cancelar',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: item.uploaded ? `${item.name} (Enviado)` : item.name,
      buttons: buttons
    });
    await actionSheet.present();
  }

  async deleteItem(item: SavedRecordSummary, index: number) {
    // Protección extra: No permitir borrar si está subido (aunque el botón esté oculto)
    if (item.uploaded) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que quieres eliminar el registro "${item.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.registerDataService.deleteRecord(item.key);
            this.savedItems.splice(index, 1); // Elimina del array para actualizar la UI
          }
        }
      ]
    });
    await alert.present();
  }
}
