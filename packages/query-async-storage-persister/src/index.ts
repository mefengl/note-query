// ====================================================================================
// 文件说明：异步存储持久化器 (Async Storage Persister)
//
// 这个文件提供了 `createAsyncStoragePersister` 函数，用于创建一个与异步存储 API
// (例如 React Native 的 AsyncStorage 或其他基于 Promise 的存储库) 交互的 Persister 对象。
//
// 与 `createSyncStoragePersister` 类似，这个 Persister 对象负责实际的缓存操作，
// 但所有操作 (存储、读取、删除、序列化、反序列化、重试) 都可能是异步的，返回 Promise。
//
// 主要功能：
// - 定义了与异步存储交互所需的接口和选项。
// - 实现了异步的 `persistClient` (保存), `restoreClient` (恢复), `removeClient` (删除) 方法。
// - 支持可能返回 Promise 的自定义序列化/反序列化方法。
// - 使用 `asyncThrottle` 对异步写入操作进行节流。
// - 支持异步的错误重试策略。
// ====================================================================================

import { asyncThrottle } from './asyncThrottle' // 导入异步节流函数
import { noop } from './utils' // 导入空操作函数
import type {
  AsyncStorage,     // 导入异步存储接口类型 (方法返回 Promise)
  MaybePromise,     // 导入类型，表示值或包裹值的 Promise
  PersistedClient,  // 导入持久化的客户端状态类型
  Persister,        // 导入 Persister 接口类型
  Promisable,       // 导入类型，表示值或包裹值的 Promise (与 MaybePromise 类似，用于类型约束)
} from '@tanstack/query-persist-client-core' // 从核心包导入类型

// 定义异步持久化重试函数的类型。
// 与同步版本不同，这个函数本身以及它返回的值都可能是 Promise。
export type AsyncPersistRetryer = (props: {
  persistedClient: PersistedClient
  error: Error
  errorCount: number
}) => Promisable<PersistedClient | undefined> // 返回值可以是 PersistedClient, undefined, 或包裹它们的 Promise

// 定义创建异步存储持久化器的配置选项接口
interface CreateAsyncStoragePersisterOptions {
  /**
   * 用于存储和检索缓存项的异步存储客户端。
   * 其 `getItem`, `setItem`, `removeItem` 方法应返回 Promise。
   * 例如 `AsyncStorage` from 'react-native'。
   * 对于 SSR 或 storage 不可用时，传入 `undefined` 或 `null`。
   */
  storage: AsyncStorage<string> | undefined | null // 注意这里的类型是 AsyncStorage
  /**
   * 在存储中使用的 key 名称。
   * @default `REACT_QUERY_OFFLINE_CACHE`
   */
  key?: string
  /**
   * 节流时间（毫秒）。
   * 避免过于频繁地执行异步写入操作。
   * @default 1000 (1 秒)
   */
  throttleTime?: number
  /**
   * 自定义序列化函数。
   * 可以是同步函数返回 string，也可以是异步函数返回 Promise<string>。
   * @default `JSON.stringify`
   */
  serialize?: (client: PersistedClient) => MaybePromise<string> // 返回值可以是 string 或 Promise<string>
  /**
   * 自定义反序列化函数。
   * 可以是同步函数返回 PersistedClient，也可以是异步函数返回 Promise<PersistedClient>。
   * @default `JSON.parse`
   */
  deserialize?: (cachedString: string) => MaybePromise<PersistedClient> // 返回值可以是 PersistedClient 或 Promise<PersistedClient>
  /**
   * 可选的异步持久化重试策略函数。
   * 当尝试异步保存到存储时发生错误，会调用此函数。
   * 函数可以同步或异步地决定是否以及如何修改 `persistedClient` 后重试保存。
   */
  retry?: AsyncPersistRetryer // 使用上面定义的异步重试器类型
}

/**
 * 创建一个使用异步存储的 Persister 对象。
 *
 * @param options 配置选项，包括异步 storage 实例、key、序列化/反序列化方法等。
 * @returns 返回一个 Persister 对象，其 persistClient 和 restoreClient 方法是 async 函数。
 */
export const createAsyncStoragePersister = ({
  storage,
  key = `REACT_QUERY_OFFLINE_CACHE`,
  throttleTime = 1000,
  serialize = JSON.stringify, // 默认同步序列化
  deserialize = JSON.parse,   // 默认同步反序列化
  retry,
}: CreateAsyncStoragePersisterOptions): Persister => {
  // 检查 storage 是否可用。
  if (storage) {
    // 定义内部的异步保存辅助函数
    const trySave = async (
      persistedClient: PersistedClient,
    ): Promise<Error | undefined> => {
      try {
        // 等待序列化完成 (如果 serialize 是异步的)
        const serialized = await serialize(persistedClient)
        // 等待存储操作完成
        await storage.setItem(key, serialized)
        return // 保存成功
      } catch (error) {
        return error as Error // 保存失败，返回错误
      }
    }

    // 返回有效的 Persister 对象
    return {
      // persistClient 方法：异步地将客户端状态持久化。
      // 使用 asyncThrottle 进行了节流处理。
      persistClient: asyncThrottle(
        async (persistedClient) => {
          let client: PersistedClient | undefined = persistedClient
          // 首次尝试异步保存
          let error = await trySave(client)
          let errorCount = 0
          // 如果首次保存失败，并且定义了重试策略 (retry)，则进入异步重试循环。
          while (error && client && retry) {
            errorCount++
            // 调用异步重试策略函数，等待其完成
            client = await retry({
              persistedClient: client,
              error,
              errorCount,
            })

            // 如果重试策略返回了新的 client，则再次尝试异步保存。
            if (client) {
              error = await trySave(client)
            } else {
              break; // 不再重试
            }
          }
        },
        { interval: throttleTime }, // 配置 asyncThrottle 的时间间隔
      ),

      // restoreClient 方法：异步地从存储中恢复客户端状态。
      restoreClient: async () => {
        // 等待从 storage 读取缓存字符串
        const cacheString = await storage.getItem(key)

        // 如果没有内容，返回 undefined
        if (!cacheString) {
          return
        }

        // 等待反序列化完成 (如果 deserialize 是异步的)
        // 如果反序列化失败，Promise 会 reject。
        return await deserialize(cacheString)
      },

      // removeClient 方法：异步地从存储中删除客户端状态。
      // 注意：这里没有 await storage.removeItem(key) 的结果，
      // 删除操作通常是“即发即忘”(fire-and-forget)。
      // 如果需要确保删除成功，可以改为 async 并 await。
      removeClient: () => storage.removeItem(key),
    }
  }

  // 如果 storage 不可用，返回空操作的 Persister。
  return {
    persistClient: noop,
    // restoreClient 必须返回 Promise<PersistedClient | undefined>
    restoreClient: () => Promise.resolve(undefined),
    removeClient: noop,
  }
}
