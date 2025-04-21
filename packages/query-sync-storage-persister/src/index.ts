// ====================================================================================
// 文件说明：同步存储持久化器 (Sync Storage Persister)
//
// 这个文件提供了 `createSyncStoragePersister` 函数，用于创建一个与同步存储 API
// (例如 `window.localStorage`, `window.sessionStorage`) 交互的 Persister 对象。
//
// Persister 对象负责实际的读取、写入和删除 QueryClient 缓存的操作。
// 你需要将这个 Persister 对象传递给 `@tanstack/query-persist-client-core` 中的
// `persistQueryClient` 函数，以启用缓存持久化。
//
// 主要功能：
// - 定义了与同步存储交互所需的接口和选项。
// - 实现了 `persistClient` (保存), `restoreClient` (恢复), `removeClient` (删除) 方法。
// - 支持自定义序列化/反序列化方法。
// - 支持节流 (throttling) 以避免频繁写入存储。
// - 支持错误重试策略。
// ====================================================================================

import { noop } from './utils' // 导入一个空操作函数，用于 SSR 或 storage 不可用时
import type {
  PersistRetryer,     // 导入持久化重试函数的类型
  PersistedClient,    // 导入持久化的客户端状态类型
  Persister,          // 导入 Persister 接口类型
} from '@tanstack/query-persist-client-core' // 从核心包导入类型

// 定义一个简化的 Storage 接口，模仿 localStorage 和 sessionStorage 的 API。
// 任何实现了这三个方法的对象都可以作为同步存储使用。
interface Storage {
  /** 根据 key 获取存储的值，如果 key 不存在则返回 null */
  getItem: (key: string) => string | null
  /** 将 value 存入指定的 key */
  setItem: (key: string, value: string) => void
  /** 根据 key 删除存储的值 */
  removeItem: (key: string) => void
}

// 定义创建同步存储持久化器的配置选项接口
interface CreateSyncStoragePersisterOptions {
  /**
   * 用于存储和检索缓存项的存储客户端。
   * 这通常是 `window.localStorage` 或 `window.sessionStorage`。
   *
   * - 对于服务器端渲染 (SSR)，或者在 storage 可能不可用的环境 (如某些配置下的 Android WebView)，
   *   可以传入 `undefined` 或 `null`。在这种情况下，持久化将不起作用，返回的 Persister 方法将是空操作。
   */
  storage: Storage | undefined | null
  /**
   * 在存储中使用的 key 名称。
   * @default `REACT_QUERY_OFFLINE_CACHE`
   */
  key?: string
  /**
   * 节流时间（毫秒）。
   * 为了避免过于频繁地写入存储（特别是在状态快速变化时），可以设置一个节流时间。
   * 在这个时间间隔内，最多只会执行一次写入操作。
   * @default 1000 (1 秒)
   */
  throttleTime?: number
  /**
   * 自定义序列化函数。
   * 在将 QueryClient 状态 (PersistedClient) 保存到存储之前，会调用此函数将其转换为字符串。
   * @default `JSON.stringify`
   */
  serialize?: (client: PersistedClient) => string
  /**
   * 自定义反序列化函数。
   * 从存储中读取字符串后，会调用此函数将其转换回 PersistedClient 对象。
   * @default `JSON.parse`
   */
  deserialize?: (cachedString: string) => PersistedClient
  /**
   * 可选的持久化重试策略函数。
   * 当尝试保存到存储时发生错误，会调用此函数。
   * 函数可以决定是否以及如何修改 `persistedClient` 后重试保存。
   * 参考 `@tanstack/query-persist-client-core` 中的 `PersistRetryer` 类型。
   */
  retry?: PersistRetryer
}

/**
 * 创建一个使用同步存储 (如 localStorage) 的 Persister 对象。
 *
 * @param options 配置选项，包括 storage 实例、key、序列化/反序列化方法等。
 * @returns 返回一个 Persister 对象，包含 persistClient, restoreClient, removeClient 方法。
 */
export function createSyncStoragePersister({
  storage, // 存储实例
  key = `REACT_QUERY_OFFLINE_CACHE`, // 存储 key
  throttleTime = 1000, // 节流时间
  serialize = JSON.stringify, // 序列化方法
  deserialize = JSON.parse, // 反序列化方法
  retry, // 重试策略
}: CreateSyncStoragePersisterOptions): Persister {
  // 检查 storage 是否可用。
  // 如果 storage 是 null 或 undefined (例如在 SSR 环境)，
  // 则返回一个所有方法都是空操作 (noop) 的 Persister。
  if (storage) {
    // 定义一个内部辅助函数，尝试将序列化后的客户端状态保存到存储中。
    // 如果成功，返回 undefined；如果失败，捕获错误并返回 Error 对象。
    const trySave = (persistedClient: PersistedClient): Error | undefined => {
      try {
        storage.setItem(key, serialize(persistedClient))
        return // 保存成功
      } catch (error) {
        return error as Error // 保存失败，返回错误
      }
    }

    // 如果 storage 可用，则返回一个有效的 Persister 对象。
    return {
      // persistClient 方法：负责将客户端状态持久化。
      // 使用 throttle 函数进行了节流处理。
      persistClient: throttle((persistedClient) => {
        let client: PersistedClient | undefined = persistedClient
        let error = trySave(client) // 首次尝试保存
        let errorCount = 0
        // 如果首次保存失败，并且定义了重试策略 (retry)，则进入重试循环。
        while (error && client && retry) {
          errorCount++
          // 调用重试策略函数，它可以返回修改后的 client 或 undefined (表示不再重试)。
          client = retry({
            persistedClient: client,
            error,
            errorCount,
          })

          // 如果重试策略返回了新的 client，则再次尝试保存。
          if (client) {
            error = trySave(client)
          } else {
            // 如果 retry 返回 undefined，则跳出循环，不再尝试。
            break;
          }
        }
        // 注意：即使重试后仍然失败，这里也没有显式抛出错误，
        // 持久化被认为是“尽力而为”的操作。
      }, throttleTime),

      // restoreClient 方法：负责从存储中恢复客户端状态。
      restoreClient: () => {
        // 尝试从 storage 中根据 key 读取缓存字符串。
        const cacheString = storage.getItem(key)

        // 如果没有读取到内容 (null 或 undefined)，说明没有缓存，直接返回 undefined。
        if (!cacheString) {
          return
        }

        // 如果读取到了内容，使用 deserialize 方法将其反序列化为 PersistedClient 对象并返回。
        // 注意：这里的反序列化如果失败（比如 JSON 格式错误），错误会向上抛出。
        return deserialize(cacheString)
      },

      // removeClient 方法：负责从存储中删除客户端状态。
      removeClient: () => {
        // 调用 storage 的 removeItem 方法删除指定 key 的项。
        storage.removeItem(key)
      },
    }
  }

  // 如果 storage 不可用，返回空操作的 Persister。
  return {
    persistClient: noop,
    restoreClient: () => undefined, // restoreClient 应该返回 PersistedClient | undefined
    removeClient: noop,
  }
}

/**
 * 一个简单的节流 (throttle) 函数。
 * 确保一个函数 (`func`) 在指定的时间 (`wait`) 内最多只执行一次。
 * 如果在等待期间再次调用，会忽略后续调用，直到计时器结束后才允许下一次执行。
 *
 * @param func 需要节流的函数。
 * @param wait 等待时间（毫秒）。
 * @returns 返回一个节流后的新函数。
 */
function throttle<TArgs extends Array<any>>(
  func: (...args: TArgs) => any, // 原始函数
  wait = 100, // 等待时间，默认 100ms
) {
  let timer: ReturnType<typeof setTimeout> | null = null // 定时器 ID
  let params: TArgs // 用于存储最后一次调用时的参数
  // 返回节流后的函数
  return function (...args: TArgs) {
    params = args // 记录参数
    // 只有当计时器未激活时，才设置新的计时器
    if (timer === null) {
      timer = setTimeout(() => {
        func(...params) // 等待时间到后，执行原始函数
        timer = null // 重置计时器状态，允许下一次调用设置计时器
      }, wait)
    }
  }
}
