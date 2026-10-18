// Nest 12 es ESM-only y Jest corre en CJS (Node < 24.9): ni @nestjs/common ni
// @nestjs/testing se pueden cargar aqui. Se mockean los decoradores y se
// instancia el controller a mano.
jest.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Controller: () => () => undefined,
  Get: () => () => undefined,
}));

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController(new AppService());
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
