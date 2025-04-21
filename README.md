# 代码阅读推荐顺序

> 注: 带 * 的文件表示待检查状态

## 1. 核心功能

- [packages/query-core/src/index.ts](packages/query-core/src/index.ts) - 核心功能入口文件
- [packages/query-core/src/queryClient.ts](packages/query-core/src/queryClient.ts) - 查询客户端实现
- [packages/query-core/src/queryCache.ts](packages/query-core/src/queryCache.ts) - 缓存系统实现
- [packages/query-core/src/mutationCache.ts](packages/query-core/src/mutationCache.ts) - 数据变更缓存实现
- [packages/query-core/src/notifyManager.ts](packages/query-core/src/notifyManager.ts) - 通知管理器
- [packages/query-core/src/query.ts](packages/query-core/src/query.ts) - 查询核心实现
- [packages/query-core/src/retryer.ts](packages/query-core/src/retryer.ts) - 重试机制实现
- [packages/query-core/src/focusManager.ts](packages/query-core/src/focusManager.ts) - 焦点管理器
- [packages/query-core/src/onlineManager.ts](packages/query-core/src/onlineManager.ts) - 在线状态管理器
- [packages/query-core/src/subscribable.ts](packages/query-core/src/subscribable.ts) - 订阅基础类

## 2. React 集成

- [packages/react-query/src/index.ts](packages/react-query/src/index.ts) - React 绑定入口
- [packages/react-query/src/QueryClientProvider.tsx](packages/react-query/src/QueryClientProvider.tsx) - React Context 提供者
- [packages/react-query/src/useQuery.ts](packages/react-query/src/useQuery.ts) - 核心查询 Hook

## 3. 持久化相关

- [packages/query-persist-client-core/src/index.ts](packages/query-persist-client-core/src/index.ts) - 持久化核心
- [packages/query-sync-storage-persister/src/index.ts](packages/query-sync-storage-persister/src/index.ts) - 同步存储持久化
- [packages/query-async-storage-persister/src/index.ts](packages/query-async-storage-persister/src/index.ts) - 异步存储持久化

## 4. 开发工具

- [packages/query-devtools/src/index.tsx](packages/query-devtools/src/index.tsx) * - 开发者工具
- [packages/react-query-devtools/src/index.ts](packages/react-query-devtools/src/index.ts) - React 开发者工具
- [packages/eslint-plugin-query/src/index.ts](packages/eslint-plugin-query/src/index.ts) - ESLint 插件

## 5. 其他框架集成

- [packages/solid-query/src/index.ts](packages/solid-query/src/index.ts) - SolidJS 集成
- [packages/vue-query/src/index.ts](packages/vue-query/src/index.ts) - Vue 集成
- [packages/svelte-query/src/index.ts](packages/svelte-query/src/index.ts) - Svelte 集成

## 6. 实验性功能

- [packages/query-broadcast-client-experimental/src/index.ts](packages/query-broadcast-client-experimental/src/index.ts) * - 实验性广播功能
- [packages/react-query-next-experimental/src/index.ts](packages/react-query-next-experimental/src/index.ts) - Next.js 实验性集成

---

<img referrerpolicy="no-referrer-when-downgrade" src="https://static.scarf.sh/a.png?x-pxid=be2d8a11-9712-4c1d-9963-580b2d4fb133" />

![TanStack Query Header](https://github.com/TanStack/query/raw/main/media/repo-header.png)

Hooks for fetching, caching and updating asynchronous data in React, Solid, Svelte and Vue

<a href="https://twitter.com/intent/tweet?button_hashtag=TanStack" target="_parent">
  <img alt="#TanStack" src="https://img.shields.io/twitter/url?color=%2308a0e9&label=%23TanStack&style=social&url=https%3A%2F%2Ftwitter.com%2Fintent%2Ftweet%3Fbutton_hashtag%3DTanStack">
</a><a href="https://discord.com/invite/WrRKjPJ" target="_parent">
  <img alt="" src="https://img.shields.io/badge/Discord-TanStack-%235865F2" />
</a><a href="https://www.npmjs.com/package/@tanstack/query-core" target="_parent">
  <img alt="" src="https://img.shields.io/npm/dm/@tanstack/query-core.svg" />
</a><a href="https://bundlejs.com/?q=%40tanstack%2Freact-query&config=%7B%22esbuild%22%3A%7B%22external%22%3A%5B%22react%22%2C%22react-dom%22%5D%7D%7D&badge=" target="_parent">
  <img alt="" src="https://deno.bundlejs.com/?q=@tanstack/react-query&config={%22esbuild%22:{%22external%22:[%22react%22,%22react-dom%22]}}&badge=detailed" />
</a><a href="#badge">
    <img alt="semantic-release" src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg">
  </a><a href="https://github.com/TanStack/query/discussions">
  <img alt="Join the discussion on Github" src="https://img.shields.io/badge/Github%20Discussions%20%26%20Support-Chat%20now!-blue" />
</a><a href="https://bestofjs.org/projects/tanstack-query"><img alt="Best of JS" src="https://img.shields.io/endpoint?url=https://bestofjs-serverless.now.sh/api/project-badge?fullName=TanStack%2Fquery%26since=daily" /></a><a href="https://github.com/TanStack/query/" target="_parent">
  <img alt="" src="https://img.shields.io/github/stars/TanStack/query.svg?style=social&label=Star" />
</a><a href="https://twitter.com/tannerlinsley" target="_parent">
  <img alt="" src="https://img.shields.io/twitter/follow/tannerlinsley.svg?style=social&label=Follow" />
</a> <a href="https://gitpod.io/from-referrer/">
  <img src="https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod" alt="Gitpod Ready-to-Code"/>
</a>

Enjoy this library? Try the entire [TanStack](https://tanstack.com)! [TanStack Table](https://github.com/TanStack/table), [TanStack Router](https://github.com/tanstack/router), [TanStack Virtual](https://github.com/tanstack/virtual), [React Charts](https://github.com/TanStack/react-charts), [React Ranger](https://github.com/TanStack/ranger)

## Visit [tanstack.com/query](https://tanstack.com/query) for docs, guides, API and more

Still on **React Query v2**? No problem! Check out the v2 docs here: https://github.com/TanStack/query/tree/2.x/docs/src/pages/docs.<br />
Still on **React Query v3**? No problem! Check out the v3 docs here: https://tanstack.com/query/v3/docs/.<br />
Still on **React Query v4**? No problem! Check out the v4 docs here: https://tanstack.com/query/v4/docs/.

## Quick Features

- Transport/protocol/backend agnostic data fetching (REST, GraphQL, promises, whatever!)
- Auto Caching + Refetching (stale-while-revalidate, Window Refocus, Polling/Realtime)
- Parallel + Dependent Queries
- Mutations + Reactive Query Refetching
- Multi-layer Cache + Automatic Garbage Collection
- Paginated + Cursor-based Queries
- Load-More + Infinite Scroll Queries w/ Scroll Recovery
- Request Cancellation
- [React Suspense](https://react.dev/reference/react/Suspense) + Fetch-As-You-Render Query Prefetching
- Dedicated Devtools

## Contributing

View the contributing guidelines [here](/CONTRIBUTING.md)

### [Become a Sponsor!](https://github.com/sponsors/tannerlinsley/)

<!-- Use the force, Luke! -->
