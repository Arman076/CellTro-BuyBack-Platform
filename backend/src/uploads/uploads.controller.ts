import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { extname } from 'path';
import { randomUUID } from 'crypto';

@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename: (
          req,
          file,
          callback,
        ) => {
          const extension = extname(
            file.originalname,
          ).toLowerCase();

          const filename =
            `${randomUUID()}${extension}`;

          callback(null, filename);
        },
      }),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (
        req,
        file,
        callback,
      ) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        if (
          !allowedMimeTypes.includes(
            file.mimetype,
          )
        ) {
          return callback(
            new BadRequestException(
              'Only JPG, JPEG, PNG and WEBP images are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadImage(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Image file is required',
      );
    }

    return {
      filename: file.filename,

      url:
        `http://localhost:4000/uploads/${file.filename}`,
    };
  }
}