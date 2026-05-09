export {};

const saveAdminConfigMock = jest.fn();
const getAdminConfigMock = jest.fn();
const getConfigMock = jest.fn();
const getAuthInfoFromCookieMock = jest.fn(() => ({ username: 'owner' }));

jest.mock('@/lib/db', () => ({
  db: {
    getAdminConfig: (...args: unknown[]) => getAdminConfigMock(...args),
    saveAdminConfig: (...args: unknown[]) => saveAdminConfigMock(...args),
  },
}));

jest.mock('@/lib/config', () => ({
  clearConfigCache: jest.fn(),
  getConfig: (...args: unknown[]) => getConfigMock(...args),
}));

jest.mock('@/lib/auth', () => ({
  getAuthInfoFromCookie: (...args: unknown[]) => getAuthInfoFromCookieMock(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const { POST } = require('./route');

function createRequest(body: Record<string, unknown>) {
  return {
    json: jest.fn().mockResolvedValue(body),
    cookies: {
      get: jest.fn(),
    },
  } as any;
}

describe('/api/admin/source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'redis';
    process.env.USERNAME = 'owner';
    getAuthInfoFromCookieMock.mockReturnValue({ username: 'owner' });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STORAGE_TYPE;
    delete process.env.USERNAME;
  });

  it('updates sources even when config normalization is unavailable', async () => {
    getAdminConfigMock.mockResolvedValue({
      SourceConfig: [],
      UserConfig: { Users: [], Tags: [] },
      CustomCategories: [],
      LiveConfig: [],
    });
    getConfigMock.mockRejectedValue(new Error('config self check failed'));
    saveAdminConfigMock.mockResolvedValue(undefined);

    const response = await POST(
      createRequest({
        action: 'add',
        key: 'source-1',
        name: 'Source 1',
        api: 'https://example.com/api',
        detail: 'detail',
        type: 'vod',
        is_adult: false,
      }),
    );

    expect(response.status).toBe(200);
    expect(saveAdminConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        SourceConfig: [
          expect.objectContaining({
            key: 'source-1',
            name: 'Source 1',
            api: 'https://example.com/api',
            detail: 'detail',
            from: 'custom',
          }),
        ],
      }),
    );
  });

  it('rejects unauthorized requests before reading the body', async () => {
    getAuthInfoFromCookieMock.mockReturnValueOnce(null);

    const request = {
      json: jest.fn(() => {
        throw new Error('body should not be read');
      }),
      cookies: {
        get: jest.fn(),
      },
    } as any;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(request.json).not.toHaveBeenCalled();
    expect(saveAdminConfigMock).not.toHaveBeenCalled();
  });
});
