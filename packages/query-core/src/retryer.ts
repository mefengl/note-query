import { focusManager } from './focusManager'
import { onlineManager } from './onlineManager'
import { pendingThenable } from './thenable'
import { isServer, sleep } from './utils'
import type { CancelOptions, DefaultError, NetworkMode } from './types'

/**
 * Retryer 是 TanStack Query 的请求重试系统
 * 它提供了智能的错误处理和重试机制
 * 
 * 核心功能：
 * 
 * 1. 智能重试
 *    - 可配置重试次数
 *    - 支持指数退避算法
 *    - 自定义重试条件
 * 
 * 2. 网络感知
 *    - 检测在线/离线状态
 *    - 网络恢复时自动继续
 *    - 支持不同的网络模式
 * 
 * 3. 状态管理
 *    - 跟踪失败次数
 *    - 管理暂停/继续状态
 *    - 支持手动取消
 * 
 * 使用示例：
 * ```typescript
 * const retryer = createRetryer({
 *   // 要重试的函数
 *   fn: async () => {
 *     const response = await fetch('/api/data')
 *     if (!response.ok) throw new Error('请求失败')
 *     return response.json()
 *   },
 *   
 *   // 重试策略
 *   retry: (failureCount, error) => {
 *     // 最多重试3次，且只对网络错误重试
 *     return failureCount < 3 && error.name === 'NetworkError'
 *   },
 *   
 *   // 重试延迟
 *   retryDelay: (failureCount) => {
 *     // 指数退避：1秒、2秒、4秒...
 *     return Math.min(1000 * (2 ** failureCount), 30000)
 *   },
 *   
 *   // 网络模式
 *   networkMode: 'online' // 'online'|'always'|'offline'
 * })
 * 
 * // 使用返回的控制接口
 * retryer.promise.then(
 *   data => console.log('成功获取数据:', data),
 *   error => console.log('最终失败:', error)
 * )
 * 
 * // 需要时可以取消重试
 * retryer.cancelRetry()
 * 
 * // 或者完全取消请求
 * retryer.cancel({ revert: true })
 * ```
 */

// TYPES

/**
 * RetryerConfig 定义了重试器的配置选项
 */
interface RetryerConfig<TData = unknown, TError = DefaultError> {
  /** 要重试的函数 */
  fn: () => TData | Promise<TData>
  /** 初始 Promise，用于继续之前的请求 */
  initialPromise?: Promise<TData>
  /** 中止函数 */
  abort?: () => void
  /** 错误处理回调 */
  onError?: (error: TError) => void
  /** 成功处理回调 */
  onSuccess?: (data: TData) => void
  /** 失败处理回调，每次重试失败都会调用 */
  onFail?: (failureCount: number, error: TError) => void
  /** 暂停时的回调 */
  onPause?: () => void
  /** 继续时的回调 */
  onContinue?: () => void
  /** 重试策略 */
  retry?: RetryValue<TError>
  /** 重试延迟策略 */
  retryDelay?: RetryDelayValue<TError>
  /** 网络模式 */
  networkMode: NetworkMode | undefined
  /** 是否可以运行的判断函数 */
  canRun: () => boolean
}

export interface Retryer<TData = unknown> {
  promise: Promise<TData>
  cancel: (cancelOptions?: CancelOptions) => void
  continue: () => Promise<unknown>
  cancelRetry: () => void
  continueRetry: () => void
  canStart: () => boolean
  start: () => Promise<TData>
}

export type RetryValue<TError> = boolean | number | ShouldRetryFunction<TError>

type ShouldRetryFunction<TError = DefaultError> = (
  failureCount: number,
  error: TError,
) => boolean

export type RetryDelayValue<TError> = number | RetryDelayFunction<TError>

type RetryDelayFunction<TError = DefaultError> = (
  failureCount: number,
  error: TError,
) => number

function defaultRetryDelay(failureCount: number) {
  return Math.min(1000 * 2 ** failureCount, 30000)
}

export function canFetch(networkMode: NetworkMode | undefined): boolean {
  return (networkMode ?? 'online') === 'online'
    ? onlineManager.isOnline()
    : true
}

export class CancelledError extends Error {
  revert?: boolean
  silent?: boolean
  constructor(options?: CancelOptions) {
    super('CancelledError')
    this.revert = options?.revert
    this.silent = options?.silent
  }
}

export function isCancelledError(value: any): value is CancelledError {
  return value instanceof CancelledError
}

export function createRetryer<TData = unknown, TError = DefaultError>(
  config: RetryerConfig<TData, TError>,
): Retryer<TData> {
  let isRetryCancelled = false
  let failureCount = 0
  let isResolved = false
  let continueFn: ((value?: unknown) => void) | undefined

  const thenable = pendingThenable<TData>()

  const cancel = (cancelOptions?: CancelOptions): void => {
    if (!isResolved) {
      reject(new CancelledError(cancelOptions))

      config.abort?.()
    }
  }
  const cancelRetry = () => {
    isRetryCancelled = true
  }

  const continueRetry = () => {
    isRetryCancelled = false
  }

  const canContinue = () =>
    focusManager.isFocused() &&
    (config.networkMode === 'always' || onlineManager.isOnline()) &&
    config.canRun()

  const canStart = () => canFetch(config.networkMode) && config.canRun()

  const resolve = (value: any) => {
    if (!isResolved) {
      isResolved = true
      config.onSuccess?.(value)
      continueFn?.()
      thenable.resolve(value)
    }
  }

  const reject = (value: any) => {
    if (!isResolved) {
      isResolved = true
      config.onError?.(value)
      continueFn?.()
      thenable.reject(value)
    }
  }

  const pause = () => {
    return new Promise((continueResolve) => {
      continueFn = (value) => {
        if (isResolved || canContinue()) {
          continueResolve(value)
        }
      }
      config.onPause?.()
    }).then(() => {
      continueFn = undefined
      if (!isResolved) {
        config.onContinue?.()
      }
    })
  }

  // Create loop function
  const run = () => {
    // Do nothing if already resolved
    if (isResolved) {
      return
    }

    let promiseOrValue: any

    // we can re-use config.initialPromise on the first call of run()
    const initialPromise =
      failureCount === 0 ? config.initialPromise : undefined

    // Execute query
    try {
      promiseOrValue = initialPromise ?? config.fn()
    } catch (error) {
      promiseOrValue = Promise.reject(error)
    }

    Promise.resolve(promiseOrValue)
      .then(resolve)
      .catch((error) => {
        // Stop if the fetch is already resolved
        if (isResolved) {
          return
        }

        // Do we need to retry the request?
        const retry = config.retry ?? (isServer ? 0 : 3)
        const retryDelay = config.retryDelay ?? defaultRetryDelay
        const delay =
          typeof retryDelay === 'function'
            ? retryDelay(failureCount, error)
            : retryDelay
        const shouldRetry =
          retry === true ||
          (typeof retry === 'number' && failureCount < retry) ||
          (typeof retry === 'function' && retry(failureCount, error))

        if (isRetryCancelled || !shouldRetry) {
          // We are done if the query does not need to be retried
          reject(error)
          return
        }

        failureCount++

        // Notify on fail
        config.onFail?.(failureCount, error)

        // Delay
        sleep(delay)
          // Pause if the document is not visible or when the device is offline
          .then(() => {
            return canContinue() ? undefined : pause()
          })
          .then(() => {
            if (isRetryCancelled) {
              reject(error)
            } else {
              run()
            }
          })
      })
  }

  return {
    promise: thenable,
    cancel,
    continue: () => {
      continueFn?.()
      return thenable
    },
    cancelRetry,
    continueRetry,
    canStart,
    start: () => {
      // Start loop
      if (canStart()) {
        run()
      } else {
        pause().then(run)
      }
      return thenable
    },
  }
}
