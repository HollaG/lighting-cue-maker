/**
 * Standard API response envelope, mirroring the Go server's Response struct.
 */
export type ApiResponse<T = undefined> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

/** 200 OK */
export type OkResponse<T> = ApiResponse<T> & { success: true; data: T };

/** 201 Created */
export type CreatedResponse<T> = ApiResponse<T> & { success: true; data: T };

/** 400 Bad Request */
export type BadRequestResponse = ApiResponse<never> & { success: false; error: string };

/** 404 Not Found */
export type NotFoundResponse = ApiResponse<never> & { success: false; error: string };

/** 500 Internal Server Error */
export type InternalErrorResponse = ApiResponse<never> & { success: false; error: string };
