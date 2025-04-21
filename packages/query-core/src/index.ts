/**
 * TanStack Query 核心模块入口文件
 * 
 * 这个文件导出了所有核心功能模块，可以分为以下几大类：
 * 
 * 1. 缓存管理
 *    - QueryCache: 处理查询数据的缓存
 *    - MutationCache: 处理数据变更操作的缓存
 * 
 * 2. 客户端核心
 *    - QueryClient: 整个库的核心类，提供查询和变更操作的统一接口
 * 
 * 3. 观察者模式实现
 *    - QueryObserver: 监听单个查询的变化
 *    - QueriesObserver: 监听多个查询的变化
 *    - InfiniteQueryObserver: 处理无限滚动等分页查询场景
 *    - MutationObserver: 监听数据变更操作
 * 
 * 4. 系统状态管理
 *    - notifyManager: 管理状态更新的批处理和通知
 *    - focusManager: 监控页面焦点状态，用于自动重新获取数据
 *    - onlineManager: 监控网络连接状态，实现离线/在线处理
 * 
 * 5. 工具函数
 *    - hashKey: 生成查询的唯一键
 *    - replaceEqualDeep: 深度比较和替换对象
 *    - isServer: 判断是否在服务器环境
 *    - matchQuery/matchMutation: 查询和变更操作的匹配函数
 *    - keepPreviousData: 在重新获取数据时保留旧数据
 *    - skipToken: 用于条件性跳过查询
 * 
 * 6. 数据序列化
 *    - hydrate/dehydrate: 支持数据的序列化和反序列化，用于 SSR 场景
 * 
 * 使用示例：
 * ```typescript
 * import { QueryClient, QueryCache } from '@tanstack/query-core'
 * 
 * // 创建查询客户端
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       staleTime: 5 * 60 * 1000, // 5分钟后数据过期
 *     },
 *   },
 * })
 * 
 * // 执行查询
 * const result = await queryClient.fetchQuery({
 *   queryKey: ['todos'],
 *   queryFn: () => fetch('/api/todos').then(res => res.json())
 * })
 * ```
 */

/* istanbul ignore file */

export { CancelledError } from './retryer'
export { QueryCache } from './queryCache'
export type { QueryCacheNotifyEvent } from './queryCache'
export { QueryClient } from './queryClient'
export { QueryObserver } from './queryObserver'
export { QueriesObserver } from './queriesObserver'
export { InfiniteQueryObserver } from './infiniteQueryObserver'
export { MutationCache } from './mutationCache'
export type { MutationCacheNotifyEvent } from './mutationCache'
export { MutationObserver } from './mutationObserver'
export { notifyManager } from './notifyManager'
export { focusManager } from './focusManager'
export { onlineManager } from './onlineManager'
export {
  hashKey,
  replaceEqualDeep,
  isServer,
  matchQuery,
  matchMutation,
  keepPreviousData,
  skipToken,
} from './utils'
export type { MutationFilters, QueryFilters, Updater, SkipToken } from './utils'
export { isCancelledError } from './retryer'
export {
  dehydrate,
  hydrate,
  defaultShouldDehydrateQuery,
  defaultShouldDehydrateMutation,
} from './hydration'

// Types
export * from './types'
export type { QueryState } from './query'
export { Query } from './query'
export type { MutationState } from './mutation'
export { Mutation } from './mutation'
export type {
  DehydrateOptions,
  DehydratedState,
  HydrateOptions,
} from './hydration'
export type { QueriesObserverOptions } from './queriesObserver'
