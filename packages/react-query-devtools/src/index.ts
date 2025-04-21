// ====================================================================================
// 文件说明：React Query DevTools 包 (@tanstack/react-query-devtools) 的主入口文件
//
// 这个文件负责导出 React Query DevTools 的主要组件，并根据环境决定导出哪个版本。
// 主要目的是在非开发环境下“移除”DevTools，以优化生产构建。
//
// 主要功能：
// 1. 导入实际的 DevTools 组件 (`ReactQueryDevtools` 和 `ReactQueryDevtoolsPanel`)。
// 2. 检查 `process.env.NODE_ENV` 环境变量。
// 3. 如果是开发环境 (`development`)，导出真实的组件。
// 4. 如果是其他环境 (如 `production`)，导出返回 `null` 的空组件，
//    这样 DevTools 就不会在生产中渲染，并且相关的代码可以被 tree-shaking 移除。
//
// `'use client'` 指令:
// 表明此模块及其依赖项包含客户端组件或 Hooks，需要在浏览器环境中运行。
// 这是 React Server Components (RSC) 和 Next.js App Router 等架构的要求。
// ====================================================================================

'use client' // 标记为客户端模块

// 导入实际的 DevTools 组件实现
import * as Devtools from './ReactQueryDevtools'             // 导入浮动窗口 DevTools
import * as DevtoolsPanel from './ReactQueryDevtoolsPanel' // 导入面板式 DevTools

// 导出 ReactQueryDevtools 组件
// 使用 typeof 获取 Devtools 模块的类型，然后索引到 ReactQueryDevtools 的类型，确保类型正确。
export const ReactQueryDevtools: (typeof Devtools)['ReactQueryDevtools'] =
  // 判断当前环境是否不是 'development'
  process.env.NODE_ENV !== 'development'
    ? // 如果不是开发环境 (例如生产环境)
      function () {
        // 返回一个什么都不渲染的组件 (null)
        return null
      }
    : // 如果是开发环境
      Devtools.ReactQueryDevtools // 导出真实的 ReactQueryDevtools 组件

// 导出 ReactQueryDevtoolsPanel 组件
// 逻辑与上面类似，根据环境导出真实组件或空组件。
export const ReactQueryDevtoolsPanel: (typeof DevtoolsPanel)['ReactQueryDevtoolsPanel'] =
  process.env.NODE_ENV !== 'development'
    ? function () {
        return null
      }
    : DevtoolsPanel.ReactQueryDevtoolsPanel // 导出真实的 ReactQueryDevtoolsPanel 组件
