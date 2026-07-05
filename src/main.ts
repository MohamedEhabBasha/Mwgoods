import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { enableProfiling } from '@angular/core';

enableProfiling();
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
