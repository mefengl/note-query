/**
 * NotifyManager 是一个高性能的批量更新管理器
 * 主要用于优化状态更新和通知的性能，避免重复渲染
 * 
 * 核心概念：
 * 1. 批处理（Batching）
 *    - 将多个更新合并到一个事务中
 *    - 减少不必要的重渲染
 *    - 提高应用性能
 * 
 * 2. 事务（Transactions）
 *    - 跟踪嵌套的批处理操作
 *    - 确保所有更新按正确顺序执行
 *    - 支持异步操作
 * 
 * 3. 调度（Scheduling）
 *    - 控制更新的时机
 *    - 支持自定义调度策略
 *    - 默认使用 setTimeout 微任务
 * 
 * 使用场景：
 * ```typescript
 * // 1. 批量更新示例
 * notifyManager.batch(() => {
 *   // 这些更新会被合并成一次渲染
 *   setQueryData(['todos', 1], newTodo1)
 *   setQueryData(['todos', 2], newTodo2)
 *   setQueryData(['todos', 3], newTodo3)
 * })
 * 
 * // 2. 自定义批处理（比如在 React 中）
 * notifyManager.setBatchNotifyFunction((callback) => {
 *   ReactDOM.unstable_batchedUpdates(callback)
 * })
 * ```
 */

// 类型定义
type NotifyCallback = () => void

/** 
 * 基础通知函数类型
 * 用于执行单个回调
 */
type NotifyFunction = (callback: () => void) => void

/** 
 * 批量通知函数类型
 * 用于一次性执行多个回调
 */
type BatchNotifyFunction = (callback: () => void) => void

/** 
 * 批量调用回调函数类型
 * 支持传入任意参数
 */
type BatchCallsCallback<T extends Array<unknown>> = (...args: T) => void

/** 
 * 调度函数类型
 * 控制何时执行回调
 */
type ScheduleFunction = (callback: () => void) => void

export function createNotifyManager() {
  let queue: Array<NotifyCallback> = []
  let transactions = 0
  let notifyFn: NotifyFunction = (callback) => {
    callback()
  }
  let batchNotifyFn: BatchNotifyFunction = (callback: () => void) => {
    callback()
  }
  let scheduleFn: ScheduleFunction = (cb) => setTimeout(cb, 0)

  const schedule = (callback: NotifyCallback): void => {
    if (transactions) {
      queue.push(callback)
    } else {
      scheduleFn(() => {
        notifyFn(callback)
      })
    }
  }
  const flush = (): void => {
    const originalQueue = queue
    queue = []
    if (originalQueue.length) {
      scheduleFn(() => {
        batchNotifyFn(() => {
          originalQueue.forEach((callback) => {
            notifyFn(callback)
          })
        })
      })
    }
  }

  return {
    batch: <T>(callback: () => T): T => {
      let result
      transactions++
      try {
        result = callback()
      } finally {
        transactions--
        if (!transactions) {
          flush()
        }
      }
      return result
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: <T extends Array<unknown>>(
      callback: BatchCallsCallback<T>,
    ): BatchCallsCallback<T> => {
      return (...args) => {
        schedule(() => {
          callback(...args)
        })
      }
    },
    schedule,
    /**
     * Use this method to set a custom notify function.
     * This can be used to for example wrap notifications with `React.act` while running tests.
     */
    setNotifyFunction: (fn: NotifyFunction) => {
      notifyFn = fn
    },
    /**
     * Use this method to set a custom function to batch notifications together into a single tick.
     * By default React Query will use the batch function provided by ReactDOM or React Native.
     */
    setBatchNotifyFunction: (fn: BatchNotifyFunction) => {
      batchNotifyFn = fn
    },
    setScheduler: (fn: ScheduleFunction) => {
      scheduleFn = fn
    },
  } as const
}

// SINGLETON
export const notifyManager = createNotifyManager()
