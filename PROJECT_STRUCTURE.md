# 项目文件结构说明

## 📁 根目录
- `index.html` - 主应用文件
- `config.js` - 应用配置
- `setup.html` - 一次性初始设置页面
- `CHANGELOG.md` - 版本更新日志

## 📁 css/ - 样式文件
- `styles.css` - 主样式
- `auth.css` - 认证页面样式
- `account.css` - 账户页面样式
- `client-management.css` - 客户管理页面样式
- `payment.css` - 支付页面样式
- `common.css` - 通用样式
- `Euth.css` - 其他样式

## 📁 js/ - JavaScript 源代码

### js/core/ - 核心功能
- `main.js` - 应用主入口
- `state.js` - 应用状态管理
- `i18n.js` - 国际化/多语言系统

### js/config/ - 配置文件
- `config.js` - 应用配置
- `config-template.js` - 配置模板

### js/features/ - 功能模块
- `auth/` - 认证系统
  - `auth.js`
  - `password.js`
  - `registration.js`
- `generation/` - 图片生成
  - `generator.js`
  - `pollinations.js`
  - `stability.js`
  - `renderer.js`
- `templates/` - 模板管理
  - `template.js`
- `account/` - 用户账户
  - `profile.js`
- `admin/` - 管理员功能
  - `client-management.js` - 客户管理
  - `industry-codes.js` - 行业代码管理
- `payment/` - 支付系统
  - `payment.js`
- `records/` - 历史记录
  - `history.js`

### js/utils/ - 工具函数
- `ui.js` - UI 相关工具
- `validation.js` - 数据验证工具
- `helpers.js` - 辅助函数
- `sanitizer.js` - 数据清理
- `translator.js` - 翻译工具
- `product-translator.js` - 产品翻译工具
- `firebase.js` - Firebase 工具
- `admin-utils.js` - 管理员工具函数
- `migration-utils.js` - 数据迁移工具

## 📁 debug/ - 调试工具
- `debug-auth.html` - Firebase 认证调试页面
- `debug.html` - 通用调试页面

## 📁 server/ - 后端相关
### server/api/ - API 端点
- `embedding.js` - 嵌入式 API 端点

## 📁 docs/ - 文档
（用于存放项目文档）

## 📁 scripts/ - 脚本
- `modularize.ps1` - PowerShell 模块化脚本

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

## 📝 注意

- 所有业务逻辑都在 `js/features/` 中
- 工具函数在 `js/utils/` 中
- 调试文件在 `debug/` 文件夹
- 后端 API 文件在 `server/` 中
- 不要直接修改编译后的文件
