/**
 * Subscribable 是一个泛型基类，实现了发布/订阅模式
 * 为整个库提供了基础的事件订阅机制
 * 
 * 核心特性：
 * 
 * 1. 类型安全
 *    - 使用泛型约束监听器类型
 *    - 确保类型一致性
 *    - 支持 TypeScript 类型推导
 * 
 * 2. 生命周期钩子
 *    - onSubscribe: 订阅时触发
 *    - onUnsubscribe: 取消订阅时触发
 *    - 可在子类中扩展这些钩子
 * 
 * 3. 自动清理
 *    - 返回取消订阅函数
 *    - 防止内存泄漏
 *    - 支持自动资源管理
 * 
 * 使用示例：
 * ```typescript
 * // 1. 创建数据源
 * class TodosSource extends Subscribable<(todos: Todo[]) => void> {
 *   private todos: Todo[] = []
 *   
 *   // 更新数据并通知订阅者
 *   updateTodos(todos: Todo[]) {
 *     this.todos = todos
 *     this.listeners.forEach(listener => listener(todos))
 *   }
 * }
 * 
 * // 2. 使用数据源
 * const source = new TodosSource()
 * 
 * // 3. 订阅更新
 * const unsubscribe = source.subscribe(todos => {
 *   console.log('数据已更新:', todos)
 * })
 * 
 * // 4. 取消订阅
 * unsubscribe()
 * ```
 */
export class Subscribable<TListener extends Function> {
  protected listeners = new Set<TListener>()

  constructor() {
    this.subscribe = this.subscribe.bind(this)
  }

  subscribe(listener: TListener): () => void {
    this.listeners.add(listener)

    this.onSubscribe()

    return () => {
      this.listeners.delete(listener)
      this.onUnsubscribe()
    }
  }

  hasListeners(): boolean {
    return this.listeners.size > 0
  }

  protected onSubscribe(): void {
    // Do nothing
  }

  protected onUnsubscribe(): void {
    // Do nothing
  }
}
