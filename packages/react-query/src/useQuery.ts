// ====================================================================================
// 文件说明：useQuery Hook
//
// 这是 React Query 库中最核心、最常用的 Hook。
// 它的主要功能是：
// 1. 订阅一个查询 (Query)。
// 2. 当查询状态变化时（例如：开始加载、加载成功、加载失败、数据更新），
//    触发组件重新渲染，并返回最新的查询状态和数据。
// 3. 处理缓存、后台自动更新、错误处理等复杂逻辑。
//
// 这个文件本身的代码很简单，因为它把大部分工作委托给了内部的 `useBaseQuery` Hook
// 和 `@tanstack/query-core` 中的 `QueryObserver` 类。
//
// `useQuery` 主要负责提供一个面向 React 开发者的友好接口，并处理 TypeScript 的类型重载，
// 以便根据选项提供更精确的返回类型。
// ====================================================================================

// 'use client' 指令:
// 标记这个 Hook 可以在客户端组件中使用。
// 因为 useQuery 内部会使用 React 的 Hooks (如 useState, useEffect, useContext)，
// 所以它必须在客户端环境运行。
'use client'
// 从核心库导入 QueryObserver 类。
// QueryObserver 负责管理单个查询的观察者逻辑，包括数据获取、缓存交互、状态更新通知等。
import { QueryObserver } from '@tanstack/query-core'
// 导入内部的 useBaseQuery Hook。
// useBaseQuery 是一个通用的基础 Hook，useQuery, useInfiniteQuery 等都是基于它实现的。
// 它负责连接 QueryObserver 和 React 组件的渲染周期。
import { useBaseQuery } from './useBaseQuery'
// 从核心库导入类型定义。
import type { DefaultError, QueryClient, QueryKey } from '@tanstack/query-core'
// 导入 React Query 特有的类型定义。
import type {
  DefinedUseQueryResult, // 当确定有初始数据或数据已加载时，返回的类型
  UseQueryOptions,       // useQuery Hook 接收的选项类型
  UseQueryResult,        // 通用的 useQuery 返回结果类型
} from './types'
// 导入通过 queryOptions 创建的特定选项类型。
import type {
  DefinedInitialDataOptions,   // 明确定义了 initialData 的选项类型
  UndefinedInitialDataOptions, // 未定义 initialData 的选项类型
} from './queryOptions'

// ====================================================================================
// useQuery 函数重载 (Overloads)
// ====================================================================================
// 这里使用了 TypeScript 的函数重载特性。
// 目的是为了根据传入 `options` 的不同，提供更精确的返回类型。
// 主要区分点在于 `options` 中是否提供了 `initialData` (初始数据)。

// 重载 1: 当 options 中明确定义了 initialData 时
// ------------------------------------------------
// - options 类型为 DefinedInitialDataOptions: 这表示 options.initialData 不是 undefined。
// - 返回类型为 DefinedUseQueryResult: 这个类型保证了 `data` 属性永远不会是 undefined。
//   因为要么有初始数据，要么查询成功后会有数据。这对开发者来说类型更安全。
export function useQuery<
  TQueryFnData = unknown, // 查询函数返回的数据类型
  TError = DefaultError,  // 错误类型
  TData = TQueryFnData,   // 最终选择和转换后的数据类型
  TQueryKey extends QueryKey = QueryKey, // 查询键类型
>(
  options: DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient, // 可选的 QueryClient 实例
): DefinedUseQueryResult<TData, TError> // 返回类型保证 data 非 undefined

// 重载 2: 当 options 中没有定义 initialData 时
// ---------------------------------------------
// - options 类型为 UndefinedInitialDataOptions: 这表示 options.initialData 是 undefined。
// - 返回类型为 UseQueryResult: 这个类型中 `data` 属性可能是 undefined（比如在首次加载时）。
export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient,
): UseQueryResult<TData, TError> // 返回类型允许 data 为 undefined

// 重载 3: 通用情况 (兼容没有严格区分 initialData 的情况)
// ----------------------------------------------------
// - options 类型为 UseQueryOptions: 这是最通用的选项类型。
// - 返回类型为 UseQueryResult: 通用返回类型。
// 这个重载主要是为了向后兼容或者简化使用，但前两个重载提供了更好的类型安全性。
export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient,
): UseQueryResult<TData, TError>

// ====================================================================================
// useQuery 函数实现 (Implementation)
// ====================================================================================
// 这是 useQuery 的实际实现函数。它接收上面重载中定义的参数。
// 这个函数体很简单，因为它只是一个“中间人”。
export function useQuery(
  options: UseQueryOptions, // 接收通用选项对象
  queryClient?: QueryClient // 接收可选的 QueryClient
) {
  // 调用内部的 useBaseQuery Hook 来完成实际工作。
  // 参数：
  // 1. options: 将接收到的 useQuery 选项原样传递给 useBaseQuery。
  // 2. QueryObserver: 告诉 useBaseQuery 使用 QueryObserver 来处理查询逻辑。
  //                   (如果是 useInfiniteQuery，这里会传递 InfiniteQueryObserver)。
  // 3. queryClient: 将可选的 queryClient 实例传递下去。
  //
  // useBaseQuery 内部会：
  // - 获取 QueryClient 实例 (优先用传入的，其次用 Context 中的)。
  // - 创建一个 QueryObserver 实例，并传入 options 和 client。
  // - 使用 React Hooks (useEffect, useState, useSyncExternalStore) 来订阅 QueryObserver 的状态更新。
  // - 当 QueryObserver 通知状态变化时，更新 React 组件的状态，触发重新渲染。
  // - 返回最新的查询结果 (UseQueryResult 或 DefinedUseQueryResult)。
  return useBaseQuery(options, QueryObserver, queryClient)
}
