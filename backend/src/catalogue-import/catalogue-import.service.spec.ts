import { Test, TestingModule } from '@nestjs/testing';
import { CatalogueImportService } from './catalogue-import.service.js';

describe('CatalogueImportService', () => {
  let service: CatalogueImportService;

  beforeEach(async () => {
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogueImportService],
    }).compile();

    service = module.get<CatalogueImportService>(CatalogueImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
