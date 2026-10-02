import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { PythonMlModule } from './python/python-ml.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    FirebaseModule,
    PythonMlModule,
  ],
})
export class AppModule {}
