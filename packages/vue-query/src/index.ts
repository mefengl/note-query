// ====================================================================================
// 文件说明：@tanstack/vue-query 包的主入口文件
//
// 这个文件是 Vue 框架 (特别是 Composition API) 与 TanStack Query 核心库集成的入口点。
// 它主要通过重新导出 (re-export) 的方式，将 `@tanstack/query-core` 的核心 API
// 以及 `vue-query` 包内部为 Vue 定制的各种 Hooks、插件、类和类型提供给用户。
//
// 用户只需从 `@tanstack/vue-query` 这个单一入口导入所有需要的功能。
//
// 主要导出内容分类：
// 1. 核心 API: 从 `@tanstack/query-core` 重新导出。
// 2. Vue 特有实现:
//    - `VueQueryPlugin`: 用于 Vue 应用安装的核心插件。
//    - `useQueryClient`: 获取 QueryClient 实例的 Composition API Hook。
//    - `QueryClient`, `QueryCache`, `MutationCache`: 适配 Vue 的类。
//    - `useQuery`, `useInfiniteQuery`, `useMutation`: 核心的 Composition API Hooks。
//    - `useQueries`: 并行查询 Hook。
//    - `useIsFetching`, `useIsMutating`, `useMutationState`: 全局状态 Hooks。
//    - `queryOptions`, `infiniteQueryOptions`: 创建可复用查询配置的辅助函数。
//    - `VUE_QUERY_CLIENT`: 可能用于 provide/inject 的键。
// 3. 类型定义: 导出与 Vue 集成相关的各种 TypeScript 类型。
// ====================================================================================

// 重新导出 TanStack Query 核心库的所有内容
export * from '@tanstack/query-core'

// --- Vue Query 特有的导出 ---

// 导出获取 QueryClient 的 Hook
export { useQueryClient } from './useQueryClient'
// 导出 Vue 插件，用于 app.use()
export { VueQueryPlugin } from './vueQueryPlugin'

// 导出适配 Vue 的类
export { QueryClient } from './queryClient'
export { QueryCache } from './queryCache'
export { MutationCache } from './mutationCache'

// 导出创建可复用配置的辅助函数
export { queryOptions } from './queryOptions'
export { infiniteQueryOptions } from './infiniteQueryOptions'
export type { // 导出 infiniteQueryOptions 相关类型
  DefinedInitialDataInfiniteOptions,
  UndefinedInitialDataInfiniteOptions,
} from './infiniteQueryOptions'


// 导出核心的 Composition API Hooks
export { useQuery } from './useQuery'
export { useQueries } from './useQueries'
export { useInfiniteQuery } from './useInfiniteQuery'
export { useMutation } from './useMutation'

// 导出用于监控全局状态的 Hooks
export { useIsFetching } from './useIsFetching'
export { useIsMutating, useMutationState } from './useMutationState'

// 导出内部使用的常量 (可能是 Injection Key)
export { VUE_QUERY_CLIENT } from './utils'

// --- 类型定义导出 ---
// 导出与 Hooks 和插件相关的 TypeScript 类型
export type {
  UseQueryOptions,
  UseQueryReturnType,
  UseQueryDefinedReturnType,
  UndefinedInitialQueryOptions,
  DefinedInitialQueryOptions,
} from './useQuery'
export type {
  UseInfiniteQueryOptions,
  UseInfiniteQueryReturnType,
} from './useInfiniteQuery'
export type { UseMutationOptions, UseMutationReturnType } from './useMutation'
export type { UseQueriesOptions, UseQueriesResults } from './useQueries'
export type { MutationFilters, MutationStateOptions } from './useMutationState'
export type { QueryFilters } from './useIsFetching'
export type { VueQueryPluginOptions } from './vueQueryPlugin'
