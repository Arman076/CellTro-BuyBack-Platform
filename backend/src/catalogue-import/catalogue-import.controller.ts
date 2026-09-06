import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { CatalogueImportService } from './catalogue-import.service.js';

@Controller('catalogue-import')
export class CatalogueImportController {
  constructor(
    private readonly catalogueImportService: CatalogueImportService,
  ) {}

  @Get('template/:categoryId')
  async downloadTemplate(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Res() response: Response,
  ): Promise<void> {
    const result =
      await this.catalogueImportService.generateTemplate(categoryId);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );

    response.send(result.buffer);
  }

  @Post('validate/:categoryId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async validateFile(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @UploadedFile() file: any,
  ): Promise<any> {
    this.validateUploadedFile(file);

    return await this.catalogueImportService.validateFile(
      categoryId,
      file.buffer,
    );
  }

  @Post('confirm/:categoryId')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }),
)
async confirmImport(
  @Param('categoryId', ParseIntPipe) categoryId: number,
  @UploadedFile() file: any,
): Promise<any> {
  this.validateUploadedFile(file);

  return await this.catalogueImportService.confirmImport(
    categoryId,
    file.buffer,
  );
}

  private validateUploadedFile(file: any): void {
    if (!file) {
      throw new BadRequestException(
        'Excel file is required',
      );
    }

    const fileName =
      String(file.originalname || '').toLowerCase();

    if (
      !fileName.endsWith('.xlsx') &&
      !fileName.endsWith('.xls')
    ) {
      throw new BadRequestException(
        'Only Excel files (.xlsx or .xls) are allowed',
      );
    }
  }
}