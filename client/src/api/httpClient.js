// The only place that calls fetch. Cookies are sent automatically (same origin).
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; // 0 means the server could not be reached
    this.code = code;
    this.details = details; // [{ field, message }] for validation errors
  }
}

async function request(method, path, body, extra = {}) {
  const options = { method, credentials: 'same-origin', headers: {}, ...extra };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Please try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // empty or non-JSON body
  }

  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'ERROR',
      error?.message ?? 'Something went wrong',
      error?.details
    );
  }
  return data;
}

export const http = {
  get: (path) => request('GET', path),
  post: (path, body, extra) => request('POST', path, body, extra),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};