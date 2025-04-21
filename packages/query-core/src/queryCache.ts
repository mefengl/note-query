import { hashQueryKeyByOptions, matchQuery } from './utils'
import { Query } from './query'
import { notifyManager } from './notifyManager'
import { Subscribable } from './subscribable'
import type { QueryFilters } from './utils'
import type { Action, QueryState } from './query'
import type {
  DefaultError,
  NotifyEvent,
  QueryKey,
  QueryOptions,
  WithRequired,
} from './types'
import type { QueryClient } from './queryClient'
import type { QueryObserver } from './queryObserver'

/**
 * QueryCache 是 TanStack Query 的缓存管理核心
 * 它负责存储和管理所有查询的数据、状态和元信息
 * 
 * 主要功能：
 * 1. 缓存管理
 *    - 存储查询结果
 *    - 维护查询状态
 *    - 处理缓存失效
 *    - 管理数据订阅
 * 
 * 2. 事件系统
 *    支持以下事件类型：
 *    - added: 新查询被添加到缓存
 *    - removed: 查询从缓存中移除
 *    - updated: 查询数据更新
 *    - observerAdded: 新的观察者订阅查询
 *    - observerRemoved: 观察者取消订阅
 *    - observerResultsUpdated: 观察者结果更新
 *    - observerOptionsUpdated: 观察者配置更新
 * 
 * 3. 查询索引
 *    - 通过 queryHash 快速定位查询
 *    - 支持按条件过滤查询
 *    - 维护查询之间的依赖关系
 * 
 * 实现原理：
 * ```typescript
 * // 1. 创建新的查询
 * const query = new Query({
 *   queryKey: ['todos'],
 *   queryFn: () => fetch('/todos')
 * })
 * queryCache.add(query)
 * 
 * // 2. 查询缓存中的数据
 * const todos = queryCache.find(['todos'])
 * 
 * // 3. 订阅查询更新
 * queryCache.subscribe((event) => {
 *   if (event.type === 'updated') {
 *     console.log('查询数据已更新:', event.query.state.data)
 *   }
 * })
 * ```
 * 
 * 高级特性：
 * 1. 垃圾回收
 *    - 自动清理无人订阅的过期查询
 *    - 可配置缓存时间
 * 
 * 2. 缓存同步
 *    - 支持跨组件共享查询状态
 *    - 自动合并重复查询
 * 
 * 3. 智能更新
 *    - 支持部分更新
 *    - 乐观更新
 *    - 回滚机制
 */

// TYPES

/**
 * QueryCacheConfig 配置接口
 * 定义了缓存的全局行为
 */
interface QueryCacheConfig {
  /** 
   * 查询失败时的回调
   * @param error - 错误对象
   * @param query - 失败的查询实例
   */
  onError?: (
    error: DefaultError,
    query: Query<unknown, unknown, unknown>,
  ) => void

  /** 
   * 查询成功时的回调
   * @param data - 查询返回的数据
   * @param query - 成功的查询实例
   */
  onSuccess?: (data: unknown, query: Query<unknown, unknown, unknown>) => void

  /** 
   * 查询完成时的回调（无论成功失败）
   * @param data - 查询数据（如果成功）
   * @param error - 错误对象（如果失败）
   * @param query - 查询实例
   */
  onSettled?: (
    data: unknown | undefined,
    error: DefaultError | null,
    query: Query<unknown, unknown, unknown>,
  ) => void
}

interface NotifyEventQueryAdded extends NotifyEvent {
  type: 'added'
  query: Query<any, any, any, any>
}

interface NotifyEventQueryRemoved extends NotifyEvent {
  type: 'removed'
  query: Query<any, any, any, any>
}

interface NotifyEventQueryUpdated extends NotifyEvent {
  type: 'updated'
  query: Query<any, any, any, any>
  action: Action<any, any>
}

interface NotifyEventQueryObserverAdded extends NotifyEvent {
  type: 'observerAdded'
  query: Query<any, any, any, any>
  observer: QueryObserver<any, any, any, any, any>
}

interface NotifyEventQueryObserverRemoved extends NotifyEvent {
  type: 'observerRemoved'
  query: Query<any, any, any, any>
  observer: QueryObserver<any, any, any, any, any>
}

interface NotifyEventQueryObserverResultsUpdated extends NotifyEvent {
  type: 'observerResultsUpdated'
  query: Query<any, any, any, any>
}

interface NotifyEventQueryObserverOptionsUpdated extends NotifyEvent {
  type: 'observerOptionsUpdated'
  query: Query<any, any, any, any>
  observer: QueryObserver<any, any, any, any, any>
}

export type QueryCacheNotifyEvent =
  | NotifyEventQueryAdded
  | NotifyEventQueryRemoved
  | NotifyEventQueryUpdated
  | NotifyEventQueryObserverAdded
  | NotifyEventQueryObserverRemoved
  | NotifyEventQueryObserverResultsUpdated
  | NotifyEventQueryObserverOptionsUpdated

type QueryCacheListener = (event: QueryCacheNotifyEvent) => void

export interface QueryStore {
  has: (queryHash: string) => boolean
  set: (queryHash: string, query: Query) => void
  get: (queryHash: string) => Query | undefined
  delete: (queryHash: string) => void
  values: () => IterableIterator<Query>
}

// CLASS

export class QueryCache extends Subscribable<QueryCacheListener> {
  #queries: QueryStore

  constructor(public config: QueryCacheConfig = {}) {
    super()
    this.#queries = new Map<string, Query>()
  }

  build<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    client: QueryClient,
    options: WithRequired<
      QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
      'queryKey'
    >,
    state?: QueryState<TData, TError>,
  ): Query<TQueryFnData, TError, TData, TQueryKey> {
    const queryKey = options.queryKey
    const queryHash =
      options.queryHash ?? hashQueryKeyByOptions(queryKey, options)
    let query = this.get<TQueryFnData, TError, TData, TQueryKey>(queryHash)

    if (!query) {
      query = new Query({
        client,
        queryKey,
        queryHash,
        options: client.defaultQueryOptions(options),
        state,
        defaultOptions: client.getQueryDefaults(queryKey),
      })
      this.add(query)
    }

    return query
  }

  add(query: Query<any, any, any, any>): void {
    if (!this.#queries.has(query.queryHash)) {
      this.#queries.set(query.queryHash, query)

      this.notify({
        type: 'added',
        query,
      })
    }
  }

  remove(query: Query<any, any, any, any>): void {
    const queryInMap = this.#queries.get(query.queryHash)

    if (queryInMap) {
      query.destroy()

      if (queryInMap === query) {
        this.#queries.delete(query.queryHash)
      }

      this.notify({ type: 'removed', query })
    }
  }

  clear(): void {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        this.remove(query)
      })
    })
  }

  get<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    queryHash: string,
  ): Query<TQueryFnData, TError, TData, TQueryKey> | undefined {
    return this.#queries.get(queryHash) as
      | Query<TQueryFnData, TError, TData, TQueryKey>
      | undefined
  }

  getAll(): Array<Query> {
    return [...this.#queries.values()]
  }

  find<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData>(
    filters: WithRequired<QueryFilters, 'queryKey'>,
  ): Query<TQueryFnData, TError, TData> | undefined {
    const defaultedFilters = { exact: true, ...filters }

    return this.getAll().find((query) =>
      matchQuery(defaultedFilters, query),
    ) as Query<TQueryFnData, TError, TData> | undefined
  }

  findAll(filters: QueryFilters<any, any, any, any> = {}): Array<Query> {
    const queries = this.getAll()
    return Object.keys(filters).length > 0
      ? queries.filter((query) => matchQuery(filters, query))
      : queries
  }

  notify(event: QueryCacheNotifyEvent): void {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event)
      })
    })
  }

  onFocus(): void {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onFocus()
      })
    })
  }

  onOnline(): void {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onOnline()
      })
    })
  }
}
