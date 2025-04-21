// ====================================================================================
// 文件说明：@tanstack/solid-query 包的主入口文件
//
// 这个文件是 SolidJS 框架与 TanStack Query 核心库集成的桥梁。
// 它不包含具体的实现逻辑，主要作用是重新导出 (re-export) 来自
// `@tanstack/query-core` 的核心 API 以及 `solid-query` 包内部为 SolidJS
// 定制的各种组件、函数和类型。
//
// 这样做的好处是用户只需要从 `@tanstack/solid-query` 这一个包导入所有需要的功能。
//
// 主要导出内容分类：
// 1. 核心 API: 从 `@tanstack/query-core` 重新导出所有内容。
// 2. Solid 特有实现:
//    - `QueryClient`: 适配 Solid 的查询客户端。
//    - `QueryClientProvider`, `useQueryClient`: 用于上下文管理。
//    - `createQuery`, `createInfiniteQuery`, `createMutation`: 用于创建查询和变更的核心函数 (Solid 的 API 风格)。
//    - `queryOptions`, `infiniteQueryOptions`: 创建可复用查询配置的辅助函数。
//    - 状态 Hook (类似物): `useIsFetching`, `useIsMutating`, `useMutationState`, `useIsRestoring`。
//    - 其他工具: `createQueries`, `IsRestoringProvider`。
// 3. 类型定义: 导出与 Solid 集成相关的各种 TypeScript 类型。
// ====================================================================================

/* istanbul ignore file */
// 这个注释告诉代码覆盖率工具 (如 Istanbul) 忽略此文件。
// 因为这个文件只包含导出语句，没有需要测试覆盖率的逻辑。

// 重新导出 TanStack Query 核心库的所有内容
export * from '@tanstack/query-core'

// 导出 Solid Query 特有的 API 和类型
export * from './types' // 导出自定义类型
export { QueryClient } from './QueryClient' // 导出 Solid 版本的 QueryClient
export type { // 导出 QueryClient 相关的类型和配置选项
  QueryObserverOptions,
  DefaultOptions,
  QueryClientConfig,
  InfiniteQueryObserverOptions,
} from './QueryClient'
export { createQuery } from './createQuery' // 导出创建标准查询的函数
export { queryOptions } from './queryOptions' // 导出创建查询选项的辅助函数
export type { // 导出 queryOptions 相关的类型
  DefinedInitialDataOptions,
  UndefinedInitialDataOptions,
} from './queryOptions'
export { // 导出 QueryClientProvider 和相关的 Context/Hook(类似物)
  QueryClientContext,
  QueryClientProvider,
  useQueryClient,
} from './QueryClientProvider'
export type { QueryClientProviderProps } from './QueryClientProvider' // 导出 Provider 的 Props 类型
export { useIsFetching } from './useIsFetching' // 导出获取全局 Fetching 状态的 Hook(类似物)
export { createInfiniteQuery } from './createInfiniteQuery' // 导出创建无限查询的函数
export { infiniteQueryOptions } from './infiniteQueryOptions' // 导出创建无限查询选项的辅助函数
export type { // 导出 infiniteQueryOptions 相关的类型
  DefinedInitialDataInfiniteOptions,
  UndefinedInitialDataInfiniteOptions,
} from './infiniteQueryOptions'
export { createMutation } from './createMutation' // 导出创建变更(Mutation)的函数
export { useIsMutating } from './useIsMutating' // 导出获取全局 Mutating 状态的 Hook(类似物)
export { useMutationState } from './useMutationState' // 导出获取详细 Mutation 状态的 Hook(类似物)
export { createQueries } from './createQueries' // 导出并行创建多个查询的函数
export { useIsRestoring, IsRestoringProvider } from './isRestoring' // 导出与恢复状态相关的 Hook(类似物)和 Provider
