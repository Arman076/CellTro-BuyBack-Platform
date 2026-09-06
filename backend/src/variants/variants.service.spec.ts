import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service.js';

describe('VariantsService', () => {
  let service: VariantsService;

  beforeEach(async () => {
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module: TestingModule = await Test.createTestingModule({
      providers: [VariantsService],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
