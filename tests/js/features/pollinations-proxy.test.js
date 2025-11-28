const { describe, test, expect, beforeEach, jest: jestGlobal } = require('@jest/globals');

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the handler
const pollinationsProxyHandler = require('../../../server/api/pollinations-proxy');

// Track test number to use unique IPs per test to avoid throttling
let testCounter = 0;

// Mock Express request and response objects
function mockRequest(body = {}, method = 'POST') {
  testCounter++;
  const ip = `127.0.0.${testCounter % 255}`;
  return {
    body,
    method,
    ip,
    headers: {},
    connection: { remoteAddress: ip }
  };
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: jest.fn((key, value) => { res.headers[key] = value; }),
    status: jest.fn((code) => { res.statusCode = code; return res; }),
    json: jest.fn((data) => { res.body = data; return res; }),
    send: jest.fn((data) => { res.body = data; return res; }),
    end: jest.fn(() => res)
  };
  return res;
}

describe('Pollinations Proxy API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  test('should return 400 if prompt is missing', async () => {
    const req = mockRequest({});
    const res = mockResponse();

    await pollinationsProxyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'prompt is required' });
  });

  test('should return 400 if prompt is empty', async () => {
    const req = mockRequest({ prompt: '' });
    const res = mockResponse();

    await pollinationsProxyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'prompt is required' });
  });

  test('should return 400 if prompt is not a string', async () => {
    const req = mockRequest({ prompt: 123 });
    const res = mockResponse();

    await pollinationsProxyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'prompt is required' });
  });

  test('should handle OPTIONS preflight request', async () => {
    const req = mockRequest({}, 'OPTIONS');
    const res = mockResponse();

    await pollinationsProxyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  test('should set CORS headers', async () => {
    const req = mockRequest({ prompt: 'test prompt' });
    const res = mockResponse();

    // Mock a successful upstream response
    const mockArrayBuffer = new ArrayBuffer(10);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('image/png')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    await pollinationsProxyHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
  });

  test('should proxy successful response with image data', async () => {
    const req = mockRequest({ prompt: 'a beautiful sunset' });
    const res = mockResponse();

    // Mock image data
    const imageData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]); // PNG header bytes
    const mockArrayBuffer = imageData.buffer;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('image/png')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    await pollinationsProxyHandler(req, res);

    expect(mockFetch).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(res.send).toHaveBeenCalled();
  });

  test('should handle upstream error responses', async () => {
    const req = mockRequest({ prompt: 'test' });
    const res = mockResponse();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      text: jest.fn().mockResolvedValue('Internal Server Error')
    });

    await pollinationsProxyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Upstream error: 500' });
  });

  test('should handle network errors', async () => {
    const req = mockRequest({ prompt: 'test' });
    const res = mockResponse();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await pollinationsProxyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch from upstream: Network error' });
  });

  test('should use default values for optional parameters', async () => {
    const req = mockRequest({ prompt: 'test prompt' });
    const res = mockResponse();

    const mockArrayBuffer = new ArrayBuffer(10);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('image/jpeg')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    await pollinationsProxyHandler(req, res);

    // Check that fetch was called with default width=768, height=1024, model=flux, safe=true
    const fetchCall = mockFetch.mock.calls[0][0];
    expect(fetchCall).toContain('width=768');
    expect(fetchCall).toContain('height=1024');
    expect(fetchCall).toContain('model=flux');
    expect(fetchCall).toContain('safe=true');
  });

  test('should use custom parameters when provided', async () => {
    const req = mockRequest({
      prompt: 'test prompt',
      width: 1024,
      height: 768,
      seed: 12345,
      model: 'turbo',
      safe: 'false'
    });
    const res = mockResponse();

    const mockArrayBuffer = new ArrayBuffer(10);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('image/jpeg')
      },
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    });

    await pollinationsProxyHandler(req, res);

    const fetchCall = mockFetch.mock.calls[0][0];
    expect(fetchCall).toContain('width=1024');
    expect(fetchCall).toContain('height=768');
    expect(fetchCall).toContain('seed=12345');
    expect(fetchCall).toContain('model=turbo');
    expect(fetchCall).toContain('safe=false');
  });
});
