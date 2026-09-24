export type ApiResponse<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type ApiErrorResponse = ApiResponse<null>;
