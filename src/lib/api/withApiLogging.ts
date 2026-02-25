type ApiHandler<T extends unknown[]> = (
  ...args: T
) => Response | Promise<Response>;

const logPrefix = "[api]";

function formatUrl(request: Request) {
  try {
    const url = new URL(request.url);
    return `${url.pathname}${url.search}`;
  } catch {
    return request.url;
  }
}

export function withApiLogging<T extends unknown[]>(handler: ApiHandler<T>) {
  return async (...args: T) => {
    if (process.env.NODE_ENV !== "development") {
      return handler(...args);
    }

    const maybeRequest = args[0];
    const request =
      typeof maybeRequest === "object" &&
      maybeRequest !== null &&
      "method" in maybeRequest &&
      "url" in maybeRequest
        ? (maybeRequest as Request)
        : null;

    const method = request?.method ?? "UNKNOWN";
    const url = request ? formatUrl(request) : "unknown";
    const start = Date.now();

    console.info(`${logPrefix} ${method} ${url} -> start`);

    try {
      const response = await handler(...args);
      const duration = Date.now() - start;
      console.info(
        `${logPrefix} ${method} ${url} -> ${response.status} ${duration}ms`,
      );
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(
        `${logPrefix} ${method} ${url} -> ERROR ${duration}ms`,
        error,
      );
      throw error;
    }
  };
}
