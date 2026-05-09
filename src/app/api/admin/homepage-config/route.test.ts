export {};

const saveAdminConfigMock = jest.fn();
const getAdminConfigMock = jest.fn();
const getConfigMock = jest.fn();

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
  getAuthInfoFromCookie: jest.fn(() => ({ username: 'owner' })),
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

function createRequest(body: Record<string, boolean>) {
  return {
    json: jest.fn().mockResolvedValue(body),
    cookies: {
      get: jest.fn(),
    },
  } as any;
}

describe('/api/admin/homepage-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'redis';
    process.env.USERNAME = 'owner';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STORAGE_TYPE;
    delete process.env.USERNAME;
  });

  it('updates homepage config even when config normalization is unavailable', async () => {
    getAdminConfigMock.mockResolvedValue({
      HomePageConfig: {
        showHeroBanner: true,
        showContinueWatching: true,
        showUpcomingReleases: true,
        showHotMovies: true,
        showHotTvShows: true,
        showNewAnime: true,
        showHotVariety: true,
        showHotShortDramas: true,
      },
    });
    getConfigMock.mockRejectedValue(new Error('config self check failed'));
    saveAdminConfigMock.mockResolvedValue(undefined);

    const response = await POST(
      createRequest({
        showHeroBanner: false,
        showContinueWatching: false,
        showUpcomingReleases: false,
        showHotMovies: false,
        showHotTvShows: false,
        showNewAnime: false,
        showHotVariety: false,
        showHotShortDramas: false,
      }),
    );

    expect(response.status).toBe(200);
    expect(saveAdminConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        HomePageConfig: {
          showHeroBanner: false,
          showContinueWatching: false,
          showUpcomingReleases: false,
          showHotMovies: false,
          showHotTvShows: false,
          showNewAnime: false,
          showHotVariety: false,
          showHotShortDramas: false,
        },
      }),
    );
  });
});
