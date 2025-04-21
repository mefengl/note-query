import { Subscribable } from './subscribable'
import { isServer } from './utils'

type Listener = (online: boolean) => void
type SetupFn = (setOnline: Listener) => (() => void) | undefined

/**
 * OnlineManager 是网络状态管理器
 * 负责监控应用的在线/离线状态，并相应地调整数据请求策略
 * 
 * 核心功能：
 * 1. 网络状态检测
 *    - 监听浏览器的 online/offline 事件
 *    - 支持自定义网络状态检测逻辑
 *    - 跨平台兼容（Web/React Native）
 * 
 * 2. 离线处理
 *    - 在离线时暂停非必要的数据请求
 *    - 支持离线数据缓存
 *    - 网络恢复时自动重试失败的请求
 * 
 * 3. 状态通知系统
 *    - 发布/订阅模式
 *    - 支持多个监听器
 *    - 状态变化时自动通知所有订阅者
 * 
 * 实际应用示例：
 * ```typescript
 * // 1. 监听网络状态
 * onlineManager.subscribe((isOnline) => {
 *   if (isOnline) {
 *     // 网络恢复，重试失败的请求
 *     queryClient.resumePausedMutations()
 *     queryClient.invalidateQueries()
 *   } else {
 *     // 网络断开，使用缓存数据
 *     console.log('使用离线缓存')
 *   }
 * })
 * 
 * // 2. 自定义网络检测（例如在 React Native 中）
 * onlineManager.setEventListener((setOnline) => {
 *   // 使用 NetInfo 检测网络状态
 *   return NetInfo.addEventListener(state => {
 *     setOnline(state.isConnected)
 *   })
 * })
 * ```
 */

export class OnlineManager extends Subscribable<Listener> {
  #online = true
  #cleanup?: () => void

  #setup: SetupFn

  constructor() {
    super()
    this.#setup = (onOnline) => {
      // addEventListener does not exist in React Native, but window does
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!isServer && window.addEventListener) {
        const onlineListener = () => onOnline(true)
        const offlineListener = () => onOnline(false)
        // Listen to online
        window.addEventListener('online', onlineListener, false)
        window.addEventListener('offline', offlineListener, false)

        return () => {
          // Be sure to unsubscribe if a new handler is set
          window.removeEventListener('online', onlineListener)
          window.removeEventListener('offline', offlineListener)
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
    this.#cleanup = setup(this.setOnline.bind(this))
  }

  setOnline(online: boolean): void {
    const changed = this.#online !== online

    if (changed) {
      this.#online = online
      this.listeners.forEach((listener) => {
        listener(online)
      })
    }
  }

  isOnline(): boolean {
    return this.#online
  }
}

export const onlineManager = new OnlineManager()
