# 实验4: 程序偏好与归纳偏见实验 (Program Preference & Inductive Biases)

## 动机
研究人类在不同情境下对程序的偏好，以及这些偏好如何反映人类的归纳偏见。

## 实验设计

### 核心问题
1. 人们更偏好最短的程序吗？
2. 表达人类归纳偏见的程序是否更受欢迎？
3. 在教学情境下，程序偏好如何变化？
4. 什么让程序看起来"更智能"？

### 实验1: 多程序比较
对于同一目标模式，提供多个等价程序：

```javascript
// 示例：创建十字形的不同程序
const crossPrograms = {
    shortest: "add(line_h, line_v)",
    
    symmetric: "add(add(line_h, line_v), reflect_h(reflect_v(corner)))",
    
    hierarchical: "add(vertical_bar, horizontal_bar)",
    
    compositional: "union(top_half, bottom_half)",
    
    step_by_step: [
        "line_h", 
        "add(prev, line_v)",
        "center(prev)"
    ]
};
```

**任务**: 
- 选择"最优"程序（不同指标）
- 评分各程序的可理解性、优雅性、智能性
- 预测哪个程序更可能是人类创建的

### 实验2: 教学情境测试
```javascript
// 情境：你要教别人如何创建这个模式
const teachingContext = {
    learner_level: ["初学者", "中级", "专家"],
    teaching_goal: ["理解概念", "快速复制", "创造变体"],
    time_constraint: ["充足", "中等", "紧张"]
};
```

**假设**: 教学情境下人们更偏好：
- 步骤分明的程序
- 体现设计原理的程序  
- 便于推广的程序

### 实验3: 智能判断任务
基于 [MIT 研究](https://direct.mit.edu/opmi/article/doi/10.1162/opmi.a.26/133140)：

给参与者两个程序，问："哪个更可能是智能系统创建的？"

```javascript
// 程序对比维度
const intelligenceMetrics = {
    complexity: "复杂度 vs 简洁性",
    creativity: "创新性 vs 传统性", 
    efficiency: "效率 vs 直观性",
    abstraction: "抽象度 vs 具体性"
};
```

### 实验4: 归纳偏见探测
设计模式对，测试以下偏见：

```javascript
const inductiveBiases = {
    // 1. 简洁性偏见
    simplicity: {
        test: "prefer shorter programs",
        patterns: ["simple_cross", "complex_cross"]
    },
    
    // 2. 对称性偏见  
    symmetry: {
        test: "prefer symmetric decomposition",
        patterns: ["asymmetric_shape", "symmetric_shape"]
    },
    
    // 3. 分层结构偏见
    hierarchy: {
        test: "prefer hierarchical composition", 
        patterns: ["flat_composition", "nested_composition"]
    },
    
    // 4. 连通性偏见
    connectivity: {
        test: "prefer connected components",
        patterns: ["scattered_dots", "connected_shape"]
    },
    
    // 5. 规律性偏见
    regularity: {
        test: "prefer regular patterns",
        patterns: ["irregular_pattern", "regular_pattern"]
    }
};
```

### 个体差异分析
- 数学背景与程序偏好的关系
- 编程经验对判断的影响
- 认知风格与偏好模式的相关性

### 跨文化比较
在不同文化背景的参与者中测试相同偏见：
- 西方 vs 东方文化差异
- 数学教育传统的影响
- 艺术审美偏好的作用

## 测量方式
- **排序任务**: 将程序按偏好排序
- **评分任务**: 7点Likert量表评分
- **强迫选择**: 两两比较选择
- **理由阐述**: 开放式解释选择原因
- **反应时间**: 选择的快慢反映直觉强度

## 预期发现
- 简洁性不是唯一标准，可解释性同样重要
- 教学情境下偏好更加结构化的程序
- 个体差异显著，但存在跨文化的共同偏见
- "智能"判断与实际程序质量不完全一致