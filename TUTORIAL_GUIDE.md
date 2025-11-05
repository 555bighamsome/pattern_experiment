# Tutorial System Guide

## 概述

本实验包含一个**强制性教程系统**，确保所有参与者在开始正式实验前熟悉所有操作。

## 主要功能

### 1. 强制完成教程
- ✅ 参与者必须先完成 tutorial 才能开始正式实验
- ✅ "Start Experiment" 按钮在未完成 tutorial 前被禁用
- ✅ 使用 localStorage 持久化记录完成状态

### 2. Tutorial 内容（4个练习）

#### Tutorial 1: 基础图元
- **目标**: 单条水平线
- **学习内容**: 如何使用基础图元（primitives）
- **操作**: 点击 `line_horizontal` 按钮

#### Tutorial 2: 二元操作 - Add
- **目标**: 对角线 + 水平线的组合
- **学习内容**: 如何使用二元操作（add）组合两个图案
- **操作**: 点击 `add` → 选择 `line_horizontal` → 选择 `diagonal` → 点击 `Confirm`

#### Tutorial 3: 一元变换 - Invert
- **目标**: 全填充图案
- **学习内容**: 如何使用一元变换（invert）
- **操作**: 点击 `invert` → 选择 `blank` → 点击 `Confirm`

#### Tutorial 4: 二元操作 - Subtract & 重用工作流
- **目标**: 边框图案
- **学习内容**:
  - 如何使用 subtract 操作
  - 如何重用 "Your Program" 中的历史操作
- **操作**: 先创建全填充（invert blank），然后 subtract square

### 3. Tutorial 与实验的区分

#### Tutorial 图案特点
- ✅ **完全不同于实验图案**: tutorial 使用简单的教学图案，不泄漏实验内容
- ✅ **循序渐进**: 从单个图元到复杂组合
- ✅ **覆盖所有操作类型**:
  - 6种图元: blank, line_horizontal, line_vertical, diagonal, square, triangle
  - 3种二元操作: add, subtract, union
  - 4种一元变换: invert, reflect_horizontal, reflect_vertical, reflect_diag

#### 实验图案特点
- 18个复杂图案
- 分为6行，每行3个
- 需要组合多个操作才能完成

### 4. 代码架构

```
/pattern_experiment/
├── index.html              # 主页面
├── js/
│   ├── tutorial.js         # Tutorial 系统（独立文件）
│   └── script.js           # 主实验逻辑
└── css/
    └── styles.css          # 样式（包含 tutorial 样式）
```

**代码分离优势**:
- ✅ Tutorial 逻辑独立于主实验代码
- ✅ 便于维护和调试
- ✅ 清晰的功能边界

### 5. UI 状态管理

#### 未完成 Tutorial
- "Start Experiment" 按钮显示为禁用状态（灰色，不可点击）
- 点击会弹出提示："Please complete the tutorial first..."
- "Start Tutorial" 按钮显示为 "🎓 Start Tutorial (Required)"

#### 已完成 Tutorial
- "Start Experiment" 按钮启用（正常颜色，可点击）
- "Start Tutorial" 按钮文字变为 "🔄 Redo Tutorial (Optional)"
- 显示绿色完成徽章："✅ Tutorial completed! You can now start the experiment."

### 6. Tutorial 完成流程

1. 用户点击 "Start Tutorial"
2. 依次完成 4 个练习
3. 每个练习提供实时提示和引导
4. 提交正确答案后自动进入下一个练习
5. 完成所有练习后显示完成模态框
6. 用户可以选择：
   - "Start Experiment" - 直接开始实验
   - 或返回欢迎页面

### 7. 数据持久化

使用 `localStorage` 存储 tutorial 完成状态：
- **键**: `tutorialCompleted`
- **值**: `'true'` (已完成) 或不存在（未完成）
- **额外记录**: `tutorialCompletedAt` - 完成时间戳

### 8. 研究人员工具

#### 重置 Tutorial 状态
在浏览器控制台运行：
```javascript
resetTutorialCompletion()
```

这会清除 localStorage 中的完成记录，允许重新测试 tutorial 流程。

### 9. 用户体验特性

- ✅ **渐进式引导**: 每个步骤都有清晰的提示
- ✅ **即时反馈**: 提交后立即显示成功/失败消息
- ✅ **视觉提示**: 使用渐变色和动画吸引注意
- ✅ **防止跳过**: 强制完成所有步骤
- ✅ **可重复学习**: 完成后仍可重新练习

### 10. 实验流程总览

```
欢迎页面
    ↓
[未完成 Tutorial]
    ↓
强制进入 Tutorial
    ↓
完成 4 个练习
    ↓
[Tutorial 已完成]
    ↓
开始正式实验 (18 个图案)
    ↓
完成实验
    ↓
下载结果数据
```

## 技术细节

### Tutorial 图案生成
所有 tutorial 图案都在 `tutorialCases` 数组中定义，每个包含：
- `name`: 名称标识
- `hint`: 引导提示文字
- `expectedOps`: 期望使用的操作（用于后续分析）
- `generate()`: 生成目标图案的函数

### 与主实验的集成
- Tutorial 使用与主实验相同的渲染和操作系统
- `submitAnswer()` 函数检测 `tutorialMode` 并调用 `handleTutorialSubmit()`
- Tutorial 完成后无缝切换到主实验

## 测试建议

1. **首次测试**: 清除浏览器缓存，确保 tutorial 状态为空
2. **完成流程测试**: 完整走完 4 个练习
3. **UI 状态测试**: 验证按钮禁用/启用逻辑
4. **持久化测试**: 刷新页面后验证状态保持
5. **重置测试**: 使用 `resetTutorialCompletion()` 验证重置功能

## 常见问题

**Q: 用户可以跳过 tutorial 吗？**
A: 不可以。"Start Experiment" 按钮在未完成 tutorial 前无法使用。

**Q: Tutorial 数据会被记录吗？**
A: Tutorial 操作不会被记录到实验数据中，仅用于学习。

**Q: 可以重做 tutorial 吗？**
A: 可以。完成后仍可点击 "Redo Tutorial" 重新学习。

**Q: 如果清除浏览器数据会怎样？**
A: localStorage 会被清除，需要重新完成 tutorial。
