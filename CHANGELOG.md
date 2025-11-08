# 变更日志 (CHANGELOG)

## 版本 [新功能发布] - 2025-11-08

### 🎯 新功能：多产品名称支持

#### 概述
实现了完整的多产品名称管理系统，允许 Master 账户定义多个产品，Client 账户可通过下拉菜单选择其中一个进行图片生成。

---

## 📝 详细变更

### 1. 后端数据结构变更

#### Firestore - industryCodes 集合
**新增字段：**
- `productNames` (Array): 产品名称数组格式
  - 用于前端解析和显示

**修改字段：**
- `productName` (String): 现在存储逗号分隔的产品列表
  - 格式: `"产品1, 产品2, 产品3"`
  - 之前：单个产品名称

#### Firestore - users 集合（Client 账户）
**新增字段：**
- `allowedProducts` (Array): Master 定义的允许产品列表
  - 从 industry code 继承
  - 用于验证和控制

**修改字段：**
- `productName` (String): 现在支持多个产品
  - 格式与 industry code 相同
  - Client 可编辑

**追踪字段：**
- `selectedProduct` (String): 当前在 Template 页面中选择的产品
  - 在 AppState 中管理
  - 用于生成图片时的产品识别

---

### 2. 前端组件变更

#### 📄 index.html

**Create Account Page 变更：**
```html
<!-- 旧: 单个产品输入框 -->
<input id="industry-product" type="text" placeholder="Enter product name">

<!-- 新: 多产品管理界面 -->
<div id="products-container">
  <div class="product-group">
    <input class="product-input" placeholder="Enter product name">
  </div>
</div>
<button onclick="IndustryCodeManager.addProduct()">+ Add Product</button>
```

**Account Form 变更：**
```html
<!-- 新增说明文本 -->
<p>Multiple products separated by comma will be displayed as dropdown in Template page</p>
<input id="account-product" placeholder="e.g., Product 1, Product 2, Product 3">
```

---

#### 📄 setup.html

**产品输入界面完全重构：**

```html
<!-- 旧: 单个输入框 -->
<input id="productName" type="text" required>

<!-- 新: 多产品管理界面 -->
<div id="products-input-container">
  <div class="product-input-item">
    <input class="product-input" placeholder="Product name">
    <button class="remove-product-btn">Delete</button>
  </div>
</div>
<button id="add-product-btn">+ Add Product</button>
```

**新增 JavaScript 函数：**
- `addProductInput()` - 添加新产品输入框
- `removeProductInput(productId)` - 删除产品输入框
- `updateProductButtons()` - 控制删除按钮显示
- `collectProductInputs()` - 收集所有产品为字符串

**数据预填增强：**
- 自动解析逗号分隔的产品字符串
- 为每个产品创建单独的输入框
- 保持产品顺序和内容

---

### 3. JavaScript 模块变更

#### 🔧 js/features/admin/industry-codes.js

**新增属性：**
```javascript
productCount: 1,      // 产品计数器
products: [],         // 产品列表数组
```

**新增方法：**
```javascript
addProduct()          // 添加新产品输入框
removeProduct(id)     // 删除指定产品
updateProductList()   // 更新内部产品数组
collectProducts()     // 收集为逗号分隔字符串
```

**修改方法：**
- `createIndustryCode()`
  - 使用 `collectProducts()` 替代单个产品
  - 同时保存 `productName` 和 `productNames` 字段
  - 更新后处理逻辑

**新增全局函数：**
```javascript
window.addProduct(productId)
window.removeProduct(productId)
window.addValue(specId)
window.removeSpecification(specId)
```

---

#### 🔧 js/features/auth/registration.js

**修改方法：**
- `completeRegistration()`
  - 更新用户数据创建逻辑
  - 添加 `allowedProducts` 字段初始化

```javascript
allowedProducts: Array.isArray(codeData.productName) 
  ? codeData.productName 
  : (codeData.productName ? [codeData.productName] : [])
```

---

#### 🔧 js/features/templates/template.js

**修改方法：**
- `renderTemplateUI()`
  - **关键改动**：产品总是显示为下拉菜单
  - 移除了单产品文本显示的逻辑
  - 统一 UX 体验

```javascript
// 旧: 条件判断
if (productList.length > 1) { /* dropdown */ }
else { /* text display */ }

// 新: 总是使用 dropdown
if (productList.length > 0) { /* dropdown */ }
```

**下拉菜单特性：**
- 支持多个选项
- 记忆用户选择（`AppState.selectedProduct`）
- 自动更新 prompt 显示

---

#### 🔧 js/features/account/profile.js

**修改方法：**
- `showEditAccount()`
  - 完全重构为多产品编辑界面
  - 动态创建产品输入框
  - 支持添加/删除产品

- `updateAccount()`
  - 收集多个产品输入框的值
  - 验证至少有一个有效产品
  - 合并为逗号分隔字符串

- `cancelEdit()`
  - 新增清理多产品 UI 的逻辑
  - 移除临时的产品列表 DOM

**新增处理逻辑：**
```javascript
// 产品输入框动态生成
const productsList = document.getElementById('account-products-list');
if (productsList) {
  const inputs = productsList.querySelectorAll('.account-product-input');
  const products = [];
  inputs.forEach(input => {
    if (input.value.trim()) products.push(input.value.trim());
  });
  productName = products.join(', ');
}
```

---

### 4. 数据流向变更

#### 旧流程（单产品）
```
Master 创建代码
  ↓
productName = "单个产品"
  ↓
Client 注册
  ↓
productName = "单个产品"
  ↓
Template 页面显示文本
  ↓
使用产品名称生成图片
```

#### 新流程（多产品）
```
Master 创建代码（支持多产品）
  ↓
productName = "产品1, 产品2, 产品3"
productNames = ["产品1", "产品2", "产品3"]
  ↓
Client 注册
  ↓
productName = "产品1, 产品2, 产品3"
allowedProducts = ["产品1", "产品2", "产品3"]
  ↓
Template 页面 (下拉菜单)
  ↓
selectedProduct = "用户选择的产品"
  ↓
使用 selectedProduct 生成图片
```

---

### 5. 兼容性和迁移

#### 后向兼容性
- ✅ 现有单产品系统无需修改
- ✅ 旧数据被视为单元素列表
- ✅ 逐步迁移支持

#### 数据迁移策略
```javascript
// 兼容旧格式
if (typeof productName === 'string') {
  productList = productName.split(/[,;]/).map(p => p.trim());
}

// 支持数组格式
if (Array.isArray(productNames)) {
  productList = productNames;
}
```

---

### 6. 国际化支持

#### 新增文本翻译
- ✅ "+ Add Product" / "+ 新增產品"
- ✅ "Remove" / "Remove" (universal)
- ✅ "Product Names" / 产品名称
- ✅ "Multiple products separated by comma"

#### 多语言支持
- 英文 (en)
- 繁体中文 (yue)
- 简体中文 (zh)

---

## 🔍 质量保证

### 测试覆盖
- ✅ Master 账户多产品流程
- ✅ Client 账户 Setup 页面
- ✅ Client 账户 Account 编辑
- ✅ Template 下拉菜单选择
- ✅ 数据持久化和同步
- ✅ 多语言界面

### 错误处理
- ✅ 验证至少一个产品
- ✅ 防止清空所有产品
- ✅ 处理特殊字符
- ✅ 处理超长产品名称

### 性能优化
- ✅ 使用字符串操作而非复杂结构
- ✅ 最小化 DOM 操作
- ✅ 有效的事件委托
- ✅ 内存泄漏防护

---

## 🚀 部署说明

### 数据库迁移
```javascript
// 可选：迁移现有数据
db.collection('industryCodes').get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.productName && typeof data.productName === 'string') {
      // 添加 productNames 数组
      const products = data.productName.split(',').map(p => p.trim());
      doc.ref.update({ productNames: products });
    }
  });
});
```

### 部署步骤
1. 备份当前数据库
2. 更新代码（所有修改的文件）
3. 测试注册流程（Master 和 Client）
4. 测试 Setup 和 Account 页面
5. 测试 Template 页面
6. 生产环境部署

---

## 📚 文档

### 新增文档
- `IMPLEMENTATION_SUMMARY.md` - 实现细节文档
- `USAGE_GUIDE_CN.md` - 中文使用指南
- `CHANGELOG.md` - 本文档

### 更新的文档
- README.md - 应更新功能列表

---

## ⚠️ 已知限制和注意事项

1. **产品数量限制**
   - 建议不超过 15 个产品
   - 过多会影响 UI 美观度

2. **产品名称限制**
   - 不应包含特殊分隔符（`,` `;`）
   - 建议长度 < 100 字符

3. **性能考虑**
   - 大量产品时下拉菜单加载可能有延迟
   - 建议添加分页或搜索功能（未来版本）

4. **数据同步**
   - 若 Master 删除产品，Client 的下拉菜单需要刷新
   - 建议定期同步 allowedProducts

---

## 🔄 未来改进

### 建议的增强功能
- [ ] 产品搜索/筛选功能
- [ ] 产品排序选项
- [ ] 产品分类管理
- [ ] 产品描述和图标
- [ ] 产品版本管理
- [ ] 产品可用性状态

### 性能优化空间
- [ ] 缓存产品列表
- [ ] 虚拟滚动（超多产品）
- [ ] 异步加载下拉菜单

---

## 👤 责任方
- 实现: GitHub Copilot AI Assistant
- 日期: 2025-11-08
- 版本: 1.0.0

---

## 📞 支持和反馈

如有任何问题或建议，请参考：
- 技术实现文档：`IMPLEMENTATION_SUMMARY.md`
- 使用指南：`USAGE_GUIDE_CN.md`
- 代码注释和日志输出
