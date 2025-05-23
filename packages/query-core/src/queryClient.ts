import {
  functionalUpdate,
  hashKey,
  hashQueryKeyByOptions,
  noop,
  partialMatchKey,
  resolveStaleTime,
  skipToken,
} from './utils'
import { QueryCache } from './queryCache'
import { MutationCache } from './mutationCache'
import { focusManager } from './focusManager'
import { onlineManager } from './onlineManager'
import { notifyManager } from './notifyManager'
import { infiniteQueryBehavior } from './infiniteQueryBehavior'
import type {
  CancelOptions,
  DefaultError,
  DefaultOptions,
  DefaultedQueryObserverOptions,
  EnsureInfiniteQueryDataOptions,
  EnsureQueryDataOptions,
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  InferDataFromTag,
  InferErrorFromTag,
  InfiniteData,
  InvalidateOptions,
  InvalidateQueryFilters,
  MutationKey,
  MutationObserverOptions,
  MutationOptions,
  NoInfer,
  OmitKeyof,
  QueryClientConfig,
  QueryKey,
  QueryObserverOptions,
  QueryOptions,
  RefetchOptions,
  RefetchQueryFilters,
  ResetOptions,
  SetDataOptions,
} from './types'
import type { QueryState } from './query'
import type { MutationFilters, QueryFilters, Updater } from './utils'

// TYPES

/**
 * QueryDefaults 接口定义了查询的默认选项
 * 可以为特定的 queryKey 设置默认配置
 */
interface QueryDefaults {
  queryKey: QueryKey
  defaultOptions: OmitKeyof<QueryOptions<any, any, any>, 'queryKey'>
}

/**
 * MutationDefaults 接口定义了数据变更操作的默认选项
 * 可以为特定的 mutationKey 设置默认配置
 */
interface MutationDefaults {
  mutationKey: MutationKey
  defaultOptions: MutationOptions<any, any, any, any>
}

// CLASS

/**
 * QueryClient 是 TanStack Query 的核心类
 * 就像一个数据管理中心，负责处理所有的数据获取、缓存和更新操作
 * 
 * 核心概念解析：
 * 
 * 1. 数据获取和缓存
 *    - QueryCache: 存储所有查询的数据和元数据
 *    - MutationCache: 存储所有数据变更操作的状态
 * 
 * 2. 生命周期管理
 *    - mount(): 当组件挂载时调用
 *    - unmount(): 当组件卸载时调用
 *    这两个方法管理订阅系统，包括：
 *    - 页面焦点监听（用于自动重新获取数据）
 *    - 网络状态监听（用于处理离线/在线切换）
 * 
 * 3. 状态跟踪
 *    - isFetching(): 跟踪正在获取数据的查询数量
 *    - isMutating(): 跟踪正在进行的数据变更操作数量
 * 
 * 4. 数据操作
 *    - getQueryData(): 直接从缓存获取数据
 *    - setQueryData(): 手动更新缓存中的数据
 *    - ensureQueryData(): 确保数据存在，必要时获取新数据
 * 
 * 代码示例：
 * ```typescript
 * // 1. 创建客户端实例
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       // 自动重试失败的请求
 *       retry: 3,
 *       // 数据5分钟后过期
 *       staleTime: 5 * 60 * 1000,
 *     }
 *   }
 * })
 * 
 * // 2. 获取数据
 * const data = await queryClient.fetchQuery({
 *   queryKey: ['todos'],
 *   queryFn: () => fetch('/todos').then(r => r.json())
 * })
 * 
 * // 3. 更新缓存数据
 * queryClient.setQueryData(['todos'], (old) => [...old, newTodo])
 * 
 * // 4. 使用乐观更新
 * queryClient.setQueryData(['todos'], (old) => {
 *   const newTodos = [...old, newTodo]
 *   return newTodos
 * })
 * ```
 */
export class QueryClient {
  #queryCache: QueryCache
  #mutationCache: MutationCache
  #defaultOptions: DefaultOptions
  #queryDefaults: Map<string, QueryDefaults>
  #mutationDefaults: Map<string, MutationDefaults>
  #mountCount: number
  #unsubscribeFocus?: () => void
  #unsubscribeOnline?: () => void

  constructor(config: QueryClientConfig = {}) {
    this.#queryCache = config.queryCache || new QueryCache()
    this.#mutationCache = config.mutationCache || new MutationCache()
    this.#defaultOptions = config.defaultOptions || {}
    this.#queryDefaults = new Map()
    this.#mutationDefaults = new Map()
    this.#mountCount = 0
  }

  mount(): void {
    this.#mountCount++
    if (this.#mountCount !== 1) return

    this.#unsubscribeFocus = focusManager.subscribe(async (focused) => {
      if (focused) {
        await this.resumePausedMutations()
        this.#queryCache.onFocus()
      }
    })
    this.#unsubscribeOnline = onlineManager.subscribe(async (online) => {
      if (online) {
        await this.resumePausedMutations()
        this.#queryCache.onOnline()
      }
    })
  }

  unmount(): void {
    this.#mountCount--
    if (this.#mountCount !== 0) return

    this.#unsubscribeFocus?.()
    this.#unsubscribeFocus = undefined

    this.#unsubscribeOnline?.()
    this.#unsubscribeOnline = undefined
  }

  isFetching<
    TQueryFilters extends QueryFilters<any, any, any, any> = QueryFilters,
  >(filters?: TQueryFilters): number {
    return this.#queryCache.findAll({ ...filters, fetchStatus: 'fetching' })
      .length
  }

  isMutating<
    TMutationFilters extends MutationFilters<any, any> = MutationFilters,
  >(filters?: TMutationFilters): number {
    return this.#mutationCache.findAll({ ...filters, status: 'pending' }).length
  }

  getQueryData<
    TQueryFnData = unknown,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
  >(queryKey: TTaggedQueryKey): TInferredQueryFnData | undefined {
    const options = this.defaultQueryOptions({ queryKey })

    return this.#queryCache.get(options.queryHash)?.state.data as
      | TInferredQueryFnData
      | undefined
  }

  ensureQueryData<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<TData> {
    const defaultedOptions = this.defaultQueryOptions(options)
    const query = this.#queryCache.build(this, defaultedOptions)
    const cachedData = query.state.data

    if (cachedData === undefined) {
      return this.fetchQuery(options)
    }

    if (
      options.revalidateIfStale &&
      query.isStaleByTime(resolveStaleTime(defaultedOptions.staleTime, query))
    ) {
      void this.prefetchQuery(defaultedOptions)
    }

    return Promise.resolve(cachedData)
  }

  getQueriesData<
    TQueryFnData = unknown,
    TQueryFilters extends QueryFilters<
      any,
      any,
      any,
      any
    > = QueryFilters<TQueryFnData>,
    TInferredQueryFnData = TQueryFilters extends QueryFilters<
      infer TData,
      any,
      any,
      any
    >
      ? TData
      : TQueryFnData,
  >(
    filters: TQueryFilters,
  ): Array<[QueryKey, TInferredQueryFnData | undefined]> {
    return this.#queryCache.findAll(filters).map(({ queryKey, state }) => {
      const data = state.data as TInferredQueryFnData | undefined
      return [queryKey, data]
    })
  }

  setQueryData<
    TQueryFnData = unknown,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
  >(
    queryKey: TTaggedQueryKey,
    updater: Updater<
      NoInfer<TInferredQueryFnData> | undefined,
      NoInfer<TInferredQueryFnData> | undefined
    >,
    options?: SetDataOptions,
  ): TInferredQueryFnData | undefined {
    const defaultedOptions = this.defaultQueryOptions<
      any,
      any,
      unknown,
      any,
      QueryKey
    >({ queryKey })

    const query = this.#queryCache.get<TInferredQueryFnData>(
      defaultedOptions.queryHash,
    )
    const prevData = query?.state.data
    const data = functionalUpdate(updater, prevData)

    if (data === undefined) {
      return undefined
    }

    return this.#queryCache
      .build(this, defaultedOptions)
      .setData(data, { ...options, manual: true })
  }

  setQueriesData<
    TQueryFnData,
    TQueryFilters extends QueryFilters<
      any,
      any,
      any,
      any
    > = QueryFilters<TQueryFnData>,
    TInferredQueryFnData = TQueryFilters extends QueryFilters<
      infer TData,
      any,
      any,
      any
    >
      ? TData
      : TQueryFnData,
  >(
    filters: TQueryFilters,
    updater: Updater<
      NoInfer<TInferredQueryFnData> | undefined,
      NoInfer<TInferredQueryFnData> | undefined
    >,
    options?: SetDataOptions,
  ): Array<[QueryKey, TInferredQueryFnData | undefined]> {
    return notifyManager.batch(() =>
      this.#queryCache
        .findAll(filters)
        .map(({ queryKey }) => [
          queryKey,
          this.setQueryData<TInferredQueryFnData>(queryKey, updater, options),
        ]),
    )
  }

  getQueryState<
    TQueryFnData = unknown,
    TError = DefaultError,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
    TInferredError = InferErrorFromTag<TError, TTaggedQueryKey>,
  >(
    queryKey: TTaggedQueryKey,
  ): QueryState<TInferredQueryFnData, TInferredError> | undefined {
    const options = this.defaultQueryOptions({ queryKey })
    return this.#queryCache.get<TInferredQueryFnData, TInferredError>(
      options.queryHash,
    )?.state
  }

  removeQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
    TInferredError = InferErrorFromTag<TError, TTaggedQueryKey>,
  >(
    filters?: QueryFilters<
      TInferredQueryFnData,
      TInferredError,
      TInferredQueryFnData,
      TTaggedQueryKey
    >,
  ): void {
    const queryCache = this.#queryCache
    notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        queryCache.remove(query)
      })
    })
  }

  resetQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
    TInferredError = InferErrorFromTag<TError, TTaggedQueryKey>,
  >(
    filters?: QueryFilters<
      TInferredQueryFnData,
      TInferredError,
      TInferredQueryFnData,
      TTaggedQueryKey
    >,
    options?: ResetOptions,
  ): Promise<void> {
    const queryCache = this.#queryCache

    return notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        query.reset()
      })
      return this.refetchQueries(
        {
          type: 'active',
          ...filters,
        },
        options,
      )
    })
  }

  cancelQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
    TInferredError = InferErrorFromTag<TError, TTaggedQueryKey>,
  >(
    filters?: QueryFilters<
      TInferredQueryFnData,
      TInferredError,
      TInferredQueryFnData,
      TTaggedQueryKey
    >,
    cancelOptions: CancelOptions = {},
  ): Promise<void> {
    const defaultedCancelOptions = { revert: true, ...cancelOptions }

    const promises = notifyManager.batch(() =>
      this.#queryCache
        .findAll(filters)
        .map((query) => query.cancel(defaultedCancelOptions)),
    )

    return Promise.all(promises).then(noop).catch(noop)
  }

  invalidateQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
    TInferredError = InferErrorFromTag<TError, TTaggedQueryKey>,
  >(
    filters?: InvalidateQueryFilters<
      TInferredQueryFnData,
      TInferredError,
      TInferredQueryFnData,
      TTaggedQueryKey
    >,
    options: InvalidateOptions = {},
  ): Promise<void> {
    return notifyManager.batch(() => {
      this.#queryCache.findAll(filters).forEach((query) => {
        query.invalidate()
      })

      if (filters?.refetchType === 'none') {
        return Promise.resolve()
      }
      return this.refetchQueries(
        {
          ...filters,
          type: filters?.refetchType ?? filters?.type ?? 'active',
        },
        options,
      )
    })
  }

  refetchQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TTaggedQueryKey extends QueryKey = QueryKey,
    TInferredQueryFnData = InferDataFromTag<TQueryFnData, TTaggedQueryKey>,
    TInferredError = InferErrorFromTag<TError, TTaggedQueryKey>,
  >(
    filters?: RefetchQueryFilters<
      TInferredQueryFnData,
      TInferredError,
      TInferredQueryFnData,
      TTaggedQueryKey
    >,
    options: RefetchOptions = {},
  ): Promise<void> {
    const fetchOptions = {
      ...options,
      cancelRefetch: options.cancelRefetch ?? true,
    }
    const promises = notifyManager.batch(() =>
      this.#queryCache
        .findAll(filters)
        .filter((query) => !query.isDisabled())
        .map((query) => {
          let promise = query.fetch(undefined, fetchOptions)
          if (!fetchOptions.throwOnError) {
            promise = promise.catch(noop)
          }
          return query.state.fetchStatus === 'paused'
            ? Promise.resolve()
            : promise
        }),
    )

    return Promise.all(promises).then(noop)
  }

  fetchQuery<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  >(
    options: FetchQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    >,
  ): Promise<TData> {
    const defaultedOptions = this.defaultQueryOptions(options)

    // https://github.com/tannerlinsley/react-query/issues/652
    if (defaultedOptions.retry === undefined) {
      defaultedOptions.retry = false
    }

    const query = this.#queryCache.build(this, defaultedOptions)

    return query.isStaleByTime(
      resolveStaleTime(defaultedOptions.staleTime, query),
    )
      ? query.fetch(defaultedOptions)
      : Promise.resolve(query.state.data as TData)
  }

  prefetchQuery<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<void> {
    return this.fetchQuery(options).then(noop).catch(noop)
  }

  fetchInfiniteQuery<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: FetchInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    >,
  ): Promise<InfiniteData<TData, TPageParam>> {
    options.behavior = infiniteQueryBehavior<
      TQueryFnData,
      TError,
      TData,
      TPageParam
    >(options.pages)
    return this.fetchQuery(options as any)
  }

  prefetchInfiniteQuery<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: FetchInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    >,
  ): Promise<void> {
    return this.fetchInfiniteQuery(options).then(noop).catch(noop)
  }

  ensureInfiniteQueryData<
    TQueryFnData,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    options: EnsureInfiniteQueryDataOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryKey,
      TPageParam
    >,
  ): Promise<InfiniteData<TData, TPageParam>> {
    options.behavior = infiniteQueryBehavior<
      TQueryFnData,
      TError,
      TData,
      TPageParam
    >(options.pages)

    return this.ensureQueryData(options as any)
  }

  resumePausedMutations(): Promise<unknown> {
    if (onlineManager.isOnline()) {
      return this.#mutationCache.resumePausedMutations()
    }
    return Promise.resolve()
  }

  getQueryCache(): QueryCache {
    return this.#queryCache
  }

  getMutationCache(): MutationCache {
    return this.#mutationCache
  }

  getDefaultOptions(): DefaultOptions {
    return this.#defaultOptions
  }

  setDefaultOptions(options: DefaultOptions): void {
    this.#defaultOptions = options
  }

  setQueryDefaults<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
  >(
    queryKey: QueryKey,
    options: Partial<
      OmitKeyof<
        QueryObserverOptions<TQueryFnData, TError, TData, TQueryData>,
        'queryKey'
      >
    >,
  ): void {
    this.#queryDefaults.set(hashKey(queryKey), {
      queryKey,
      defaultOptions: options,
    })
  }

  getQueryDefaults(
    queryKey: QueryKey,
  ): OmitKeyof<QueryObserverOptions<any, any, any, any, any>, 'queryKey'> {
    const defaults = [...this.#queryDefaults.values()]

    const result: OmitKeyof<
      QueryObserverOptions<any, any, any, any, any>,
      'queryKey'
    > = {}

    defaults.forEach((queryDefault) => {
      if (partialMatchKey(queryKey, queryDefault.queryKey)) {
        Object.assign(result, queryDefault.defaultOptions)
      }
    })
    return result
  }

  setMutationDefaults<
    TData = unknown,
    TError = DefaultError,
    TVariables = void,
    TContext = unknown,
  >(
    mutationKey: MutationKey,
    options: OmitKeyof<
      MutationObserverOptions<TData, TError, TVariables, TContext>,
      'mutationKey'
    >,
  ): void {
    this.#mutationDefaults.set(hashKey(mutationKey), {
      mutationKey,
      defaultOptions: options,
    })
  }

  getMutationDefaults(
    mutationKey: MutationKey,
  ): OmitKeyof<MutationObserverOptions<any, any, any, any>, 'mutationKey'> {
    const defaults = [...this.#mutationDefaults.values()]

    const result: OmitKeyof<
      MutationObserverOptions<any, any, any, any>,
      'mutationKey'
    > = {}

    defaults.forEach((queryDefault) => {
      if (partialMatchKey(mutationKey, queryDefault.mutationKey)) {
        Object.assign(result, queryDefault.defaultOptions)
      }
    })

    return result
  }

  defaultQueryOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  >(
    options:
      | QueryObserverOptions<
          TQueryFnData,
          TError,
          TData,
          TQueryData,
          TQueryKey,
          TPageParam
        >
      | DefaultedQueryObserverOptions<
          TQueryFnData,
          TError,
          TData,
          TQueryData,
          TQueryKey
        >,
  ): DefaultedQueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {
    if (options._defaulted) {
      return options as DefaultedQueryObserverOptions<
        TQueryFnData,
        TError,
        TData,
        TQueryData,
        TQueryKey
      >
    }

    const defaultedOptions = {
      ...this.#defaultOptions.queries,
      ...this.getQueryDefaults(options.queryKey),
      ...options,
      _defaulted: true,
    }

    if (!defaultedOptions.queryHash) {
      defaultedOptions.queryHash = hashQueryKeyByOptions(
        defaultedOptions.queryKey,
        defaultedOptions,
      )
    }

    // dependent default values
    if (defaultedOptions.refetchOnReconnect === undefined) {
      defaultedOptions.refetchOnReconnect =
        defaultedOptions.networkMode !== 'always'
    }
    if (defaultedOptions.throwOnError === undefined) {
      defaultedOptions.throwOnError = !!defaultedOptions.suspense
    }

    if (!defaultedOptions.networkMode && defaultedOptions.persister) {
      defaultedOptions.networkMode = 'offlineFirst'
    }

    if (defaultedOptions.queryFn === skipToken) {
      defaultedOptions.enabled = false
    }

    return defaultedOptions as DefaultedQueryObserverOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >
  }

  defaultMutationOptions<T extends MutationOptions<any, any, any, any>>(
    options?: T,
  ): T {
    if (options?._defaulted) {
      return options
    }
    return {
      ...this.#defaultOptions.mutations,
      ...(options?.mutationKey &&
        this.getMutationDefaults(options.mutationKey)),
      ...options,
      _defaulted: true,
    } as T
  }

  clear(): void {
    this.#queryCache.clear()
    this.#mutationCache.clear()
  }
}
