// ====================================================================================
// 文件说明：@tanstack/svelte-query 包的主入口文件
//
// 这个文件是 Svelte 框架与 TanStack Query 核心库集成的入口点。
// 它的核心职责是通过重新导出 (re-export) 的方式，将 `@tanstack/query-core`
// 的核心 API 以及 `svelte-query` 包内部为 Svelte 定制的各种 Store、组件、
// 函数和类型暴露给开发者。
//
// 用户仅需从 `@tanstack/svelte-query` 这个包导入所有所需功能。
// 注意：Svelte 的集成通常使用 Svelte Store 而不是 React Hooks，尽管有些
//       导出项的命名可能沿用了 `use` 前缀。
//
// 主要导出内容分类：
// 1. 核心 API: 从 `@tanstack/query-core` 重新导出。
// 2. Svelte 特有实现:
//    - `QueryClientProvider.svelte`: 用于提供 QueryClient 的 Svelte 组件。
//    - `useQueryClient`: 获取 QueryClient 实例的 Store 或函数。
//    - `createQuery`, `createInfiniteQuery`, `createMutation`: 创建查询/变更的核心 Store 或函数。
//    - `createQueries`: 并行查询函数。
//    - `useIsFetching`, `useIsMutating`, `useMutationState`, `useIsRestoring`: 全局状态 Store。
//    - `queryOptions`, `infiniteQueryOptions`: 创建可复用查询配置的辅助函数。
//    - `useHydrate`, `HydrationBoundary.svelte`: 用于 SSR 水合的 Store/函数和组件。
//    - 上下文工具 (`./context.js`)
// 3. 类型定义 (`./types.js`)
// 4. `.js` 扩展名: 这里的导入/导出使用了 `.js`，符合某些构建配置或 Svelte 的习惯。
// ====================================================================================

/* istanbul ignore file */
// 指示代码覆盖率工具忽略此文件，因为它仅包含导出。

// 重新导出 TanStack Query 核心库的所有内容
export * from '@tanstack/query-core'

// --- Svelte Query 特有的导出 ---

// 导出 Svelte Query 的类型定义和上下文工具
export * from './types.js'
export * from './context.js'

// 导出创建查询、无限查询和变更的核心 Store/函数
export { createQuery } from './createQuery.js'
export { createQueries } from './createQueries.js'
export { createInfiniteQuery } from './createInfiniteQuery.js'
export { createMutation } from './createMutation.js'

// 导出创建可复用查询配置的辅助函数及其类型
export { queryOptions } from './queryOptions.js'
export type {
  DefinedInitialDataOptions,
  UndefinedInitialDataOptions,
} from './queryOptions.js'
export { infiniteQueryOptions } from './infiniteQueryOptions.js'

// 导出并行查询相关的类型
export type { QueriesResults, QueriesOptions } from './createQueries.js'

// 导出用于监控全局状态的 Store/函数
export { useIsFetching } from './useIsFetching.js'
export { useIsMutating } from './useIsMutating.js'
export { useMutationState } from './useMutationState.js'
export { useIsRestoring } from './useIsRestoring.js'

// 导出获取 QueryClient 的 Store/函数
export { useQueryClient } from './useQueryClient.js'

// 导出用于 SSR 水合的 Store/函数和组件
export { useHydrate } from './useHydrate.js'
export { default as HydrationBoundary } from './HydrationBoundary.svelte'

// 导出提供 QueryClient 的 Svelte 组件
export { default as QueryClientProvider } from './QueryClientProvider.svelte'
