/**
 * FocusManager 负责监控页面的焦点状态
 * 这对于优化数据刷新策略非常重要
 * 
 * 主要应用场景：
 * 1. 页面切换检测
 *    - 用户切换浏览器标签页
 *    - 最小化窗口
 *    - 切换应用程序
 * 
 * 2. 自动数据刷新
 *    - 用户回到页面时自动刷新数据
 *    - 避免在页面不可见时进行无用的数据请求
 * 
 * 3. 跨平台支持
 *    - 浏览器环境：使用 visibilitychange 事件
 *    - React Native：支持自定义事件监听
 * 
 * 使用示例：
 * ```typescript
 * // 1. 监听焦点变化
 * focusManager.subscribe((isFocused) => {
 *   if (isFocused) {
 *     // 用户回到页面，刷新数据
 *     queryClient.invalidateQueries()
 *   }
 * })
 * 
 * // 2. 自定义焦点检测（比如在 React Native 中）
 * focusManager.setEventListener((handleFocus) => {
 *   // 设置自定义焦点检测逻辑
 *   AppState.addEventListener('change', (state) => {
 *     handleFocus(state === 'active')
 *   })
 * })
 * ```
 */

import { Subscribable } from './subscribable'
import { isServer } from './utils'

type Listener = (focused: boolean) => void

type SetupFn = (
  setFocused: (focused?: boolean) => void,
) => (() => void) | undefined

export class FocusManager extends Subscribable<Listener> {
  #focused?: boolean
  #cleanup?: () => void

  #setup: SetupFn

  constructor() {
    super()
    this.#setup = (onFocus) => {
      // addEventListener does not exist in React Native, but window does
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!isServer && window.addEventListener) {
        const listener = () => onFocus()
        // Listen to visibilitychange
        window.addEventListener('visibilitychange', listener, false)

        return () => {
          // Be sure to unsubscribe if a new handler is set
          window.removeEventListener('visibilitychange', listener)
        }
      }
      return
    }
  }

  protected onSubscribe(): void {
    if (!this.#cleanup) {
      this.setEventListener(this.#setup)
    }
  }

  protected onUnsubscribe() {
    if (!this.hasListeners()) {
      this.#cleanup?.()
      this.#cleanup = undefined
    }
  }

  setEventListener(setup: SetupFn): void {
    this.#setup = setup
    this.#cleanup?.()
    this.#cleanup = setup((focused) => {
      if (typeof focused === 'boolean') {
        this.setFocused(focused)
      } else {
        this.onFocus()
      }
    })
  }

  setFocused(focused?: boolean): void {
    const changed = this.#focused !== focused
    if (changed) {
      this.#focused = focused
      this.onFocus()
    }
  }

  onFocus(): void {
    const isFocused = this.isFocused()
    this.listeners.forEach((listener) => {
      listener(isFocused)
    })
  }

  isFocused(): boolean {
    if (typeof this.#focused === 'boolean') {
      return this.#focused
    }

    // document global can be unavailable in react native
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return globalThis.document?.visibilityState !== 'hidden'
  }
}

export const focusManager = new FocusManager()
