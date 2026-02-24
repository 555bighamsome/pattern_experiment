# 实验3: 自主课程设计实验 (Self-Designed Curriculum)

## 动机
让参与者设计自己的学习课程，研究人类如何组织学习序列以及这种自主设计是否更有效。

## 实验设计

### 实验设置
- 给参与者完整的25个目标模式集合
- 允许他们选择练习顺序
- 提供模式复杂度和相似性的提示工具

### 课程设计界面
```javascript
// 模式预览界面
const patternBrowser = {
    // 所有模式的缩略图网格
    preview: "thumbnail grid of all 25 patterns",
    
    // 复杂度指示器
    complexity: {
        estimated_steps: "预估步骤数",
        unique_primitives: "所需独特图元数", 
        symmetry_level: "对称性程度"
    },
    
    // 相似性分析
    similarity: {
        visual_similarity: "视觉相似度聚类",
        structural_similarity: "结构相似度",
        shared_components: "共享组件分析"
    },
    
    // 依赖关系提示
    dependencies: {
        prerequisite_skills: "前置技能建议",
        building_blocks: "构建块分析"
    }
};
```

### 实验条件
1. **完全自主组** (n=30)
   - 可以任意选择练习顺序
   - 提供所有分析工具

2. **部分引导组** (n=30)  
   - 前5个模式必须按专家设计顺序
   - 之后可自主选择

3. **专家课程组** (n=30)
   - 按认知科学专家设计的最优顺序
   - 作为性能基线

### 课程设计策略分析
观察参与者的选择模式：

```javascript
// 可能的策略类型
const strategies = {
    difficulty_progression: "从简单到复杂",
    similarity_clustering: "先做相似的一组",
    diversity_maximizing: "每次选择差异最大的",
    component_building: "先练基础组件再组合",
    random_exploration: "随机探索",
    mixed_strategy: "混合策略"
};
```

### 测量指标
- **学习效率**: 达到熟练程度所需时间
- **迁移效果**: 新模式的首次尝试成功率  
- **策略识别**: 课程选择的潜在策略
- **元认知**: 对自己学习过程的反思准确性
- **长期保持**: 一周后的回忆测试

### 个性化分析
- 工作记忆容量与课程设计策略的关系
- 空间能力与模式选择偏好的相关性
- 学习风格问卷与实际行为的对应

## 预期结果
- 自主设计的课程在动机和参与度上更高
- 但专家设计的课程可能在纯学习效率上更优
- 个体差异显著：不同人适合不同的课程策略
- 提供适当工具支持的自主设计可以达到专家设计水平