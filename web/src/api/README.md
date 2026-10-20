# API 使用指南

## 目录结构

```
src/
├── api/
│   ├── index.js       # API 统一导出
│   ├── common.js      # 公共 API
│   ├── user.js        # 用户相关 API
│   └── todo.js        # 待办事项 API
└── utils/
    └── request.js     # Axios 请求封装
```

## 环境变量配置

在项目根目录有以下环境变量文件：

- `.env` - 默认配置
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

配置项说明：

```bash
# API 基础路径
VITE_API_BASE_URL=http://localhost:8080/api

# API 超时时间（毫秒）
VITE_API_TIMEOUT=30000

# 是否开启请求日志
VITE_API_LOG=true
```

## 使用方法

### 1. 在组件中使用 API

```vue
<template>
  <div>
    <van-button @click="fetchTodos">获取待办列表</van-button>
    <van-list :data="todoList" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { todoApi } from '@/api'
import { Toast } from 'vant'

const todoList = ref([])

const fetchTodos = async () => {
  try {
    const res = await todoApi.getList({
      page: 1,
      pageSize: 10,
      status: 'pending'
    })
    todoList.value = res.list
    Toast.success('加载成功')
  } catch (error) {
    Toast.fail('加载失败')
  }
}
</script>
```

### 2. 添加新的 API 模块

1. 在 `src/api/` 下创建新的文件，如 `src/api/product.js`
2. 导入 request 工具
3. 定义 API 方法

```javascript
// src/api/product.js
import { request } from '../utils/request'

export const productApi = {
  getList(params) {
    return request.get('/product/list', params)
  },
  
  getDetail(id) {
    return request.get(`/product/${id}`)
  },
  
  create(data) {
    return request.post('/product/create', data)
  }
}
```

4. 在 `src/api/index.js` 中导出

```javascript
export * as productApi from './product'
```

### 3. 请求方法说明

request 对象提供了以下方法：

- `request.get(url, params, config)` - GET 请求
- `request.post(url, data, config)` - POST 请求
- `request.put(url, data, config)` - PUT 请求
- `request.delete(url, params, config)` - DELETE 请求
- `request.upload(url, file, config)` - 上传文件
- `request.download(url, params, config)` - 下载文件

### 4. Token 管理

Token 会自动从 localStorage 读取并添加到请求头。

登录后保存 Token：

```javascript
localStorage.setItem('token', token)
```

退出登录时清除 Token：

```javascript
localStorage.removeItem('token')
```

### 5. 错误处理

所有 API 请求都会自动处理以下情况：

- 请求超时
- 网络错误
- 401 未授权（自动跳转登录）
- 403 无权限
- 404 资源不存在
- 500 服务器错误

## API 代理配置

开发环境下，Vite 会自动代理 `/api` 请求到后端服务器。

如果需要修改后端地址，请修改 `.env.development` 文件中的 `VITE_API_BASE_URL`。
