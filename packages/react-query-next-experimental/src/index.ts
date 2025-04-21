// ====================================================================================
// 文件说明：@tanstack/react-query-next-experimental 包的主入口文件
//
// 这个文件是 TanStack Query 为 Next.js 提供的 *实验性* 集成功能的入口点。
// 实验性意味着 API 可能不稳定或未来会发生变化。
//
// 主要导出内容：
// - `ReactQueryStreamedHydration`: 一个组件或工具，旨在与 Next.js 的流式
//   服务器端渲染 (SSR) 功能配合使用，实现查询数据的流式水合 (hydration)。
//   这有助于在 Next.js 应用中提升初始加载性能和用户体验。
// ====================================================================================

// 导出用于 Next.js 流式水合的核心组件/工具
export { ReactQueryStreamedHydration } from './ReactQueryStreamedHydration'
