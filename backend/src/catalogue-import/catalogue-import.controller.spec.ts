import { Test, TestingModule } from '@nestjs/testing';
import { CatalogueImportController } from './catalogue-import.controller.js';

describe('CatalogueImportController', () => {
  let controller: CatalogueImportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogueImportController],
    }).compile();

    controller = module.get<CatalogueImportController>(CatalogueImportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
