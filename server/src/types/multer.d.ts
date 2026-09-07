declare module 'multer' {
  import type { Request, RequestHandler } from 'express'

  interface File {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    buffer: Buffer
  }

  interface Options {
    storage?: unknown
    limits?: { fileSize?: number }
    fileFilter?: (
      req: Request,
      file: File,
      cb: (error: Error | null, acceptFile?: boolean) => void
    ) => void
  }

  interface Multer {
    single(fieldName: string): RequestHandler
  }

  interface MulterError extends Error {
    code: string
  }

  interface MulterModule {
    (options?: Options): Multer
    memoryStorage(): unknown
    MulterError: new (code: string, field?: string) => MulterError
  }

  const multer: MulterModule
  export default multer
}
