import { Module } from '@nestjs/common';
import { PythonMlClient } from './python-ml.client';

@Module({ providers: [PythonMlClient], exports: [PythonMlClient] })
export class PythonMlModule {}
