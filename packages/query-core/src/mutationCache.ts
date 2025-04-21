import { notifyManager } from './notifyManager'
import { Mutation } from './mutation'
import { matchMutation, noop } from './utils'
import { Subscribable } from './subscribable'
import type { MutationObserver } from './mutationObserver'
import type { DefaultError, MutationOptions, NotifyEvent } from './types'
import type { QueryClient } from './queryClient'
import type { Action, MutationState } from './mutation'
import type { MutationFilters } from './utils'

// TYPES

/**
 * MutationCacheConfig 定义了变更缓存的配置选项
 */
interface MutationCacheConfig {
  /** 
   * 变更操作失败时的回调
   * @param error - 错误信息
   * @param variables - 变更操作的输入参数
   * @param context - 上下文信息，可用于回滚
   * @param mutation - 变更操作实例
   */
  onError?: (
    error: DefaultError,
    variables: unknown,
    context: unknown,
    mutation: Mutation<unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown

  /** 
   * 变更操作成功时的回调
   * @param data - 服务器返回的数据
   * @param variables - 变更操作的输入参数
   * @param context - 上下文信息
   * @param mutation - 变更操作实例
   */
  onSuccess?: (
    data: unknown,
    variables: unknown,
    context: unknown,
    mutation: Mutation<unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown

  /** 
   * 变更操作执行前的回调
   * 常用于实现乐观更新
   * @param variables - 变更操作的输入参数
   * @param mutation - 变更操作实例
   */
  onMutate?: (
    variables: unknown,
    mutation: Mutation<unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown

  /** 
   * 变更操作完成时的回调（无论成功失败）
   * @param data - 成功时的数据
   * @param error - 失败时的错误
   * @param variables - 变更操作的输入参数
   * @param context - 上下文信息
   * @param mutation - 变更操作实例
   */
  onSettled?: (
    data: unknown | undefined,
    error: DefaultError | null,
    variables: unknown,
    context: unknown,
    mutation: Mutation<unknown, unknown, unknown>,
  ) => Promise<unknown> | unknown
}

interface NotifyEventMutationAdded extends NotifyEvent {
  type: 'added'
  mutation: Mutation<any, any, any, any>
}
interface NotifyEventMutationRemoved extends NotifyEvent {
  type: 'removed'
  mutation: Mutation<any, any, any, any>
}

interface NotifyEventMutationObserverAdded extends NotifyEvent {
  type: 'observerAdded'
  mutation: Mutation<any, any, any, any>
  observer: MutationObserver<any, any, any>
}

interface NotifyEventMutationObserverRemoved extends NotifyEvent {
  type: 'observerRemoved'
  mutation: Mutation<any, any, any, any>
  observer: MutationObserver<any, any, any>
}

interface NotifyEventMutationObserverOptionsUpdated extends NotifyEvent {
  type: 'observerOptionsUpdated'
  mutation?: Mutation<any, any, any, any>
  observer: MutationObserver<any, any, any>
}

interface NotifyEventMutationUpdated extends NotifyEvent {
  type: 'updated'
  mutation: Mutation<any, any, any, any>
  action: Action<any, any, any, any>
}

export type MutationCacheNotifyEvent =
  | NotifyEventMutationAdded
  | NotifyEventMutationRemoved
  | NotifyEventMutationObserverAdded
  | NotifyEventMutationObserverRemoved
  | NotifyEventMutationObserverOptionsUpdated
  | NotifyEventMutationUpdated

type MutationCacheListener = (event: MutationCacheNotifyEvent) => void

// CLASS

/**
 * MutationCache 是数据变更操作的缓存管理器
 * 主要负责处理创建、更新、删除等写操作的状态和结果缓存
 * 
 * 核心特性：
 * 
 * 1. 作用域管理（Scope Management）
 *    - 通过作用域控制并发变更操作
 *    - 确保同一作用域内的变更按序执行
 *    - 防止并发冲突和竞态条件
 * 
 * 2. 状态追踪
 *    - 跟踪每个变更操作的状态：pending/success/error
 *    - 维护变更操作的执行顺序
 *    - 支持暂停和恢复操作
 * 
 * 3. 乐观更新支持
 *    - 允许在服务器响应前更新UI
 *    - 提供回滚机制处理失败情况
 *    - 维护乐观更新的状态
 * 
 * 使用示例：
 * ```typescript
 * // 1. 基本变更操作
 * const mutation = mutationCache.build(
 *   queryClient,
 *   {
 *     mutationFn: (newTodo) => axios.post('/todos', newTodo),
 *     onSuccess: (data) => {
 *       // 更新查询缓存
 *       queryClient.setQueryData(['todos'], (old) => [...old, data])
 *     }
 *   }
 * )
 * 
 * // 2. 使用作用域控制并发
 * const mutation = mutationCache.build(
 *   queryClient,
 *   {
 *     mutationKey: ['addTodo'],
 *     scope: 'todos', // 同一作用域内的mutation会串行执行
 *     mutationFn: (newTodo) => axios.post('/todos', newTodo)
 *   }
 * )
 * ```
 */
export class MutationCache extends Subscribable<MutationCacheListener> {
  #mutations: Set<Mutation<any, any, any, any>>
  #scopes: Map<string, Array<Mutation<any, any, any, any>>>
  #mutationId: number

  constructor(public config: MutationCacheConfig = {}) {
    super()
    this.#mutations = new Set()
    this.#scopes = new Map()
    this.#mutationId = 0
  }

  build<TData, TError, TVariables, TContext>(
    client: QueryClient,
    options: MutationOptions<TData, TError, TVariables, TContext>,
    state?: MutationState<TData, TError, TVariables, TContext>,
  ): Mutation<TData, TError, TVariables, TContext> {
    const mutation = new Mutation({
      mutationCache: this,
      mutationId: ++this.#mutationId,
      options: client.defaultMutationOptions(options),
      state,
    })

    this.add(mutation)

    return mutation
  }

  add(mutation: Mutation<any, any, any, any>): void {
    this.#mutations.add(mutation)
    const scope = scopeFor(mutation)
    if (typeof scope === 'string') {
      const scopedMutations = this.#scopes.get(scope)
      if (scopedMutations) {
        scopedMutations.push(mutation)
      } else {
        this.#scopes.set(scope, [mutation])
      }
    }
    this.notify({ type: 'added', mutation })
  }

  remove(mutation: Mutation<any, any, any, any>): void {
    if (this.#mutations.delete(mutation)) {
      const scope = scopeFor(mutation)
      if (typeof scope === 'string') {
        const scopedMutations = this.#scopes.get(scope)
        if (scopedMutations) {
          if (scopedMutations.length > 1) {
            const index = scopedMutations.indexOf(mutation)
            if (index !== -1) {
              scopedMutations.splice(index, 1)
            }
          } else if (scopedMutations[0] === mutation) {
            this.#scopes.delete(scope)
          }
        }
      }
    }

    // Currently we notify the removal even if the mutation was already removed.
    // Consider making this an error or not notifying of the removal depending on the desired semantics.
    this.notify({ type: 'removed', mutation })
  }

  canRun(mutation: Mutation<any, any, any, any>): boolean {
    const scope = scopeFor(mutation)
    if (typeof scope === 'string') {
      const mutationsWithSameScope = this.#scopes.get(scope)
      const firstPendingMutation = mutationsWithSameScope?.find(
        (m) => m.state.status === 'pending',
      )
      // we can run if there is no current pending mutation (start use-case)
      // or if WE are the first pending mutation (continue use-case)
      return !firstPendingMutation || firstPendingMutation === mutation
    } else {
      // For unscoped mutations there are never any pending mutations in front of the
      // current mutation
      return true
    }
  }

  runNext(mutation: Mutation<any, any, any, any>): Promise<unknown> {
    const scope = scopeFor(mutation)
    if (typeof scope === 'string') {
      const foundMutation = this.#scopes
        .get(scope)
        ?.find((m) => m !== mutation && m.state.isPaused)

      return foundMutation?.continue() ?? Promise.resolve()
    } else {
      return Promise.resolve()
    }
  }

  clear(): void {
    notifyManager.batch(() => {
      this.#mutations.forEach((mutation) => {
        this.notify({ type: 'removed', mutation })
      })
      this.#mutations.clear()
      this.#scopes.clear()
    })
  }

  getAll(): Array<Mutation> {
    return Array.from(this.#mutations)
  }

  find<
    TData = unknown,
    TError = DefaultError,
    TVariables = any,
    TContext = unknown,
  >(
    filters: MutationFilters,
  ): Mutation<TData, TError, TVariables, TContext> | undefined {
    const defaultedFilters = { exact: true, ...filters }

    return this.getAll().find((mutation) =>
      matchMutation(defaultedFilters, mutation),
    ) as Mutation<TData, TError, TVariables, TContext> | undefined
  }

  findAll(filters: MutationFilters = {}): Array<Mutation> {
    return this.getAll().filter((mutation) => matchMutation(filters, mutation))
  }

  notify(event: MutationCacheNotifyEvent) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event)
      })
    })
  }

  resumePausedMutations(): Promise<unknown> {
    const pausedMutations = this.getAll().filter((x) => x.state.isPaused)

    return notifyManager.batch(() =>
      Promise.all(
        pausedMutations.map((mutation) => mutation.continue().catch(noop)),
      ),
    )
  }
}

function scopeFor(mutation: Mutation<any, any, any, any>) {
  return mutation.options.scope?.id
}
