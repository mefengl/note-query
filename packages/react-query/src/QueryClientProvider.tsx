// ====================================================================================
// 文件说明：QueryClientProvider 和相关工具
//
// 这个文件负责在 React 应用中提供和访问 QueryClient 实例。
// QueryClient 是 React Query 库的核心，管理着所有的查询缓存、状态和逻辑。
// 为了让应用中的所有组件都能方便地使用同一个 QueryClient 实例，
// 我们使用了 React 的 Context API。
//
// 主要包含：
// 1. QueryClientContext: 用于存储和传递 QueryClient 实例的 React Context。
// 2. useQueryClient Hook: 一个便捷的 Hook，用于在组件中获取 QueryClient 实例。
// 3. QueryClientProvider Component: 一个必须包裹在应用或部分组件树外层的组件，
//    它接收一个 QueryClient 实例，并通过 Context 提供给所有子组件，
//    同时负责在组件挂载和卸载时调用 client 的 mount/unmount 方法。
//
// 使用方法：
// 在你的应用根组件（或者需要使用 React Query 的那部分组件树）外层，
// 使用 <QueryClientProvider client={myQueryClient}> 包裹起来。
// 然后在任何子组件中，调用 useQueryClient() 即可获得 myQueryClient 实例。
// ====================================================================================

// 'use client' 指令:
// 这是一个特定于 React Server Components (RSC) 和 Next.js App Router 的指令。
// 它标记这个文件导出的组件是“客户端组件”(Client Components)。
// 客户端组件可以在浏览器中运行，可以使用状态 (useState)、生命周期 (useEffect) 和浏览器 API。
// 由于 QueryClientProvider 需要使用 React Context 和 useEffect，它必须是客户端组件。
'use client'
import * as React from 'react'

import type { QueryClient } from '@tanstack/query-core' // 导入 QueryClient 类型

// ====================================================================================
// QueryClientContext (QueryClient 上下文)
// ====================================================================================
// 创建一个 React Context 对象，专门用来存放 QueryClient 实例。
// 初始值为 undefined，表示默认情况下没有提供 QueryClient。
// 这个 Context 就像一个“传递通道”，QueryClientProvider 把 client 放进去，
// useQueryClient Hook 从里面取出来。
export const QueryClientContext = React.createContext<QueryClient | undefined>(
  undefined,
)

// ====================================================================================
// useQueryClient Hook (获取 QueryClient 实例的 Hook)
// ====================================================================================
/**
 * 获取由 QueryClientProvider 提供的 QueryClient 实例。
 *
 * 这个 Hook 是在组件内部访问 QueryClient 的标准方式。
 * 你可以用它来手动触发查询、使缓存失效、获取查询状态等。
 *
 * @param queryClient 可选的 QueryClient 实例。如果提供了这个参数，Hook 会直接返回这个实例，
 *                    而不是从 Context 中获取。这在某些高级场景或测试中可能有用，
 *                    允许你为特定子树或组件覆盖默认的 client。
 * @returns 返回 QueryClient 实例。
 * @throws 如果没有通过 QueryClientProvider 设置 QueryClient，并且也没有提供可选的 queryClient 参数，
 *         则会抛出一个错误。这是为了防止在没有 QueryClient 的情况下错误地使用 React Query 功能。
 */
export const useQueryClient = (queryClient?: QueryClient) => {
  // 1. 尝试从 React Context 中获取 client 实例。
  //    React.useContext 是 React 提供的标准 Hook，用于读取 Context 的值。
  const client = React.useContext(QueryClientContext)

  // 2. 检查是否直接传入了 queryClient 参数。
  //    如果传入了，优先使用传入的这个 client。
  if (queryClient) {
    return queryClient
  }

  // 3. 如果 Context 中没有 client (即 client 是 undefined)，
  //    并且也没有通过参数传入 client，那么就说明出错了。
  //    可能是忘记在组件树上层使用 <QueryClientProvider> 了。
  //    抛出错误提示用户。
  if (!client) {
    throw new Error('No QueryClient set, use QueryClientProvider to set one')
  }

  // 4. 如果 Context 中有 client，并且没有通过参数传入，
  //    那么就返回从 Context 中获取的 client。
  return client
}

// ====================================================================================
// QueryClientProvider Props 类型定义
// ====================================================================================
export type QueryClientProviderProps = {
  /**
   * 必须传入的 QueryClient 实例。
   * 通常你会在应用初始化时创建一个 QueryClient 实例，然后传递给这个 Provider。
   * 例如: const queryClient = new QueryClient();
   *       <QueryClientProvider client={queryClient}>...</QueryClientProvider>
   */
  client: QueryClient
  /**
   * 子组件。任何需要访问 QueryClient 的 React 元素或组件树。
   */
  children?: React.ReactNode
}

// ====================================================================================
// QueryClientProvider 组件
// ====================================================================================
/**
 * QueryClientProvider 组件。
 *
 * 这个组件是使用 React Query 的入口点。你需要用它包裹你的整个应用
 * (或者至少是需要使用 React Query 功能的部分)。
 * 它接收一个 QueryClient 实例，并通过 React Context 将其提供给所有子组件。
 * 子组件可以通过调用 `useQueryClient()` Hook 来访问这个实例。
 *
 * @param props 组件属性，包含 `client` 和 `children`。
 * @returns 返回一个 Context Provider，包裹着子组件。
 */
export const QueryClientProvider = ({
  client, // 从 props 解构出 client 实例
  children, // 从 props 解构出子组件
}: QueryClientProviderProps): React.JSX.Element => {
  // 使用 useEffect 来处理副作用，这里是管理 QueryClient 的挂载(mount)和卸载(unmount)。
  React.useEffect(() => {
    // 组件首次挂载时，调用 client 的 mount 方法。
    // mount 方法通常用于执行一些初始化操作，比如设置在线状态监听器、
    // 窗口焦点监听器等，这些是 React Query 实现自动重新获取等功能的基础。
    client.mount()

    // useEffect 返回一个清理函数。
    // 这个函数会在组件卸载时执行。
    return () => {
      // 组件卸载时，调用 client 的 unmount 方法。
      // unmount 方法用于清理 mount 时设置的监听器和定时器，防止内存泄漏。
      client.unmount()
    }
    // 依赖项数组是 [client]。
    // 这意味着只有当 client 实例本身发生变化时，这个 effect 才会重新运行。
    // (通常情况下，应用生命周期内 client 实例是不会变的)。
  }, [client])

  // 返回 React Context Provider 组件。
  // `value` prop 设置为传入的 client 实例。
  // 这样，所有被 <QueryClientContext.Provider> 包裹的子组件
  // 都可以通过 React.useContext(QueryClientContext) (或者更方便的 useQueryClient() Hook)
  // 来获取这个 client 实例。
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  )
}
