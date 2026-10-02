import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, deleteApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleDestroy {
  private app?: App;
  private firestore?: Firestore;
  private ownsApp = false;

  constructor(private readonly config: ConfigService) {}

  getFirestore(): Firestore {
    if (this.firestore) return this.firestore;

    const appName = 'jibyakguk';
    const existingApp = getApps().find((candidate) => candidate.name === appName);
    this.app = existingApp ?? initializeApp(
      {
        credential: applicationDefault(),
        projectId: this.config.get<string>('FIREBASE_PROJECT_ID') || undefined,
      },
      appName,
    );
    this.ownsApp = !existingApp;
    this.firestore = getFirestore(this.app);
    return this.firestore;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.app && this.ownsApp) await deleteApp(this.app);
  }
}
