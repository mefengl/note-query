// ====================================================================================
// 文件说明：@tanstack/eslint-plugin-query ESLint 插件入口文件
//
// 这个文件定义并导出了 `@tanstack/eslint-plugin-query` 插件，
// 它包含了用于检查 TanStack Query 代码使用方式的 ESLint 规则。
//
// ESLint 插件通常包含以下部分：
// - `meta`: 插件的元信息 (例如名称)。
// - `rules`: 一个包含所有规则实现的对象。
// - `configs`: 预定义的配置集 (例如 "recommended")，方便用户启用一组规则。
//
// 主要功能：
// 1. 导入所有规则定义。
// 2. 定义插件的结构和类型。
// 3. 创建并配置插件对象。
// 4. 定义 "recommended" 配置集，支持旧版 ESLint 配置和新的 Flat Config。
// 5. 导出插件对象供 ESLint 使用。
// ====================================================================================

import { rules } from './rules' // 导入所有规则的实现
import type { ESLint, Linter } from 'eslint' // 导入 ESLint 核心类型
import type { RuleModule } from '@typescript-eslint/utils/ts-eslint' // 导入 TypeScript ESLint 的规则模块类型

// 定义规则名称的类型，基于导入的 rules 对象的 key
type RuleKey = keyof typeof rules

// 定义插件的接口，继承自 ESLint.Plugin 但覆盖了 rules 和 configs 的类型
export interface Plugin extends Omit<ESLint.Plugin, 'rules'> {
  // rules 属性的类型，确保 key 是 RuleKey，值是兼容的 RuleModule
  rules: Record<RuleKey, RuleModule<any, any, any>>
  // configs 属性的类型，包含推荐配置
  configs: {
    recommended: ESLint.ConfigData // 旧版 ESLint 配置格式
    'flat/recommended': Array<Linter.Config> // 新版 Flat Config 格式 (通常是数组)
  }
}

// 创建插件对象，遵循 Plugin 接口
const plugin: Plugin = {
  // 插件元信息
  meta: {
    name: '@tanstack/eslint-plugin-query', // 插件名称
  },
  // 初始化 configs 为空对象，稍后填充
  configs: {} as Plugin['configs'],
  // 将导入的规则实现赋值给 rules 属性
  rules,
}

// 使用 Object.assign 将配置对象分配给 plugin.configs
// 这样做是因为 'flat/recommended' 配置需要引用 plugin 对象本身，
// 所以需要在 plugin 对象创建之后再进行赋值。
Object.assign(plugin.configs, {
  // "recommended" 配置 (用于旧版 .eslintrc)
  recommended: {
    // 声明此配置使用的插件
    plugins: ['@tanstack/query'],
    // 定义在此配置下启用的规则及其级别 ('error', 'warn', 'off')
    rules: {
      '@tanstack/query/exhaustive-deps': 'error',             // 检查 useQuery/useMutation 依赖项是否完整
      '@tanstack/query/no-rest-destructuring': 'warn',        // 警告不要对 useQuery 返回结果使用 rest 解构
      '@tanstack/query/stable-query-client': 'error',         // 确保 QueryClient 实例是稳定的
      '@tanstack/query/no-unstable-deps': 'error',            // 检查依赖项是否稳定
      '@tanstack/query/infinite-query-property-order': 'error', // 确保 infinite query 的属性顺序正确
    },
  },
  // "flat/recommended" 配置 (用于新版 eslint.config.js)
  'flat/recommended': [ // Flat config 通常是配置对象的数组
    {
      // 配置块的名称 (可选，用于调试)
      name: 'tanstack/query/flat/recommended',
      // 在 Flat Config 中，plugins 是一个对象，key 是插件名称，value 是插件对象本身
      plugins: {
        '@tanstack/query': plugin,
      },
      // 启用的规则，与 recommended 配置相同
      rules: {
        '@tanstack/query/exhaustive-deps': 'error',
        '@tanstack/query/no-rest-destructuring': 'warn',
        '@tanstack/query/stable-query-client': 'error',
        '@tanstack/query/no-unstable-deps': 'error',
        '@tanstack/query/infinite-query-property-order': 'error',
      },
    },
  ],
})

// 默认导出配置好的插件对象
export default plugin
