/**
 * 环境变量访问层
 * 解决 EdgeOne 等边缘运行时环境中 process.env 访问问题
 */

// 在模块加载时缓存环境变量
const ENV_CACHE = {
  PASSWORD: process.env.PASSWORD || '',
  USERNAME: process.env.USERNAME || 'admin',
  NEXT_PUBLIC_STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
  TRUSTED_NETWORK_IPS: process.env.TRUSTED_NETWORK_IPS || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

/**
 * 获取环境变量（带缓存）
 * 在 EdgeOne 等边缘运行时中，process.env 可能在运行时不可用
 * 通过在模块加载时缓存，确保变量可访问
 */
export function getEnv(key: keyof typeof ENV_CACHE): string {
  return ENV_CACHE[key];
}

/**
 * 检查是否设置了密码
 */
export function hasPassword(): boolean {
  return ENV_CACHE.PASSWORD.length > 0;
}

/**
 * 获取存储类型
 */
export function getStorageType(): string {
  return ENV_CACHE.NEXT_PUBLIC_STORAGE_TYPE;
}

/**
 * 获取用户名
 */
export function getUsername(): string {
  return ENV_CACHE.USERNAME;
}

/**
 * 获取密码（仅用于验证）
 */
export function getPassword(): string {
  return ENV_CACHE.PASSWORD;
}

/**
 * 获取信任网络 IP 列表
 */
export function getTrustedNetworkIPs(): string {
  return ENV_CACHE.TRUSTED_NETWORK_IPS;
}

/**
 * 是否为生产环境
 */
export function isProduction(): boolean {
  return ENV_CACHE.NODE_ENV === 'production';
}
