// ====================================================================================
// 文件说明：@tanstack/query-persist-client-core 包的主入口文件
//
// 这个文件是 `@tanstack/query-persist-client-core` 库的“大门”。
// 当你想为你的 QueryClient 添加持久化功能（例如，将缓存保存到 localStorage）时，
// 你会从这个包导入所需的功能。
//
// 主要作用：
// 1. 导出核心的持久化和恢复函数 (来自 ./persist)。
// 2. 导出用于处理错误的重试策略 (来自 ./retryStrategies)。
// 3. 导出创建持久化器实例的辅助函数 (来自 ./createPersister)。
//
// 这个文件本身不包含具体实现，只是重新导出了其他模块的功能，
// 为库提供了一个统一的、易于使用的公共 API 接口。
// ====================================================================================

/* istanbul ignore file */ // 指示代码覆盖率工具忽略此文件，因为它只是导出语句

// 导出 `./persist` 模块中的所有内容。
// 这个模块通常包含核心的持久化逻辑，例如：
// - `persistQueryClient`: 将 QueryClient 的状态保存到持久化存储中。
// - `restoreQueryClient`: 从持久化存储中恢复 QueryClient 的状态。
export * from './persist'

// 导出 `./retryStrategies` 模块中的所有内容。
// 这个模块提供了在持久化或恢复操作失败时的重试机制。
// 比如，如果写入 localStorage 失败，可以配置重试几次。
export * from './retryStrategies'

// 导出 `./createPersister` 模块中的所有内容。
// 这个模块通常包含一个名为 `createPersister` 的辅助函数。
// 这个函数帮助你创建一个 `Persister` 对象，该对象封装了与具体存储介质
// (如 localStorage, sessionStorage, AsyncStorage 等) 交互的逻辑（读取、写入、删除）。
// 你需要将创建好的 `Persister` 对象传递给 `persistQueryClient`。
export * from './createPersister'
