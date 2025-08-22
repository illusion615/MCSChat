#!/usr/bin/env python3
"""
CSS backdrop-filter 兼容性修复脚本
自动为所有 backdrop-filter 属性添加 -webkit- 前缀
"""

import re

def fix_backdrop_filter(css_content):
    """
    为 CSS 内容中的所有 backdrop-filter 属性添加 -webkit- 前缀
    """
    # 正则表达式匹配 backdrop-filter 行，但排除已经有 -webkit- 前缀的行
    pattern = r'^(\s+)backdrop-filter:\s*(.*?);$'
    
    lines = css_content.split('\n')
    modified_lines = []
    
    for i, line in enumerate(lines):
        # 检查当前行是否是 backdrop-filter
        match = re.match(pattern, line)
        if match:
            indent = match.group(1)
            value = match.group(2)
            
            # 检查前一行是否已经有对应的 -webkit-backdrop-filter
            prev_line = lines[i-1] if i > 0 else ""
            webkit_pattern = f"{indent}-webkit-backdrop-filter: {value};"
            
            if webkit_pattern not in prev_line:
                # 添加 -webkit- 前缀行
                modified_lines.append(f"{indent}-webkit-backdrop-filter: {value};")
                modified_lines.append(line)
            else:
                # 已经有前缀，保持原样
                modified_lines.append(line)
        else:
            modified_lines.append(line)
    
    return '\n'.join(modified_lines)

def main():
    """主函数"""
    css_file = '/Users/wellszhang/Documents/GitHub/MCSChat/legacy/styles-legacy.css'
    
    try:
        # 读取 CSS 文件
        with open(css_file, 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # 修复 backdrop-filter
        fixed_content = fix_backdrop_filter(css_content)
        
        # 写回文件
        with open(css_file, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        print("✅ 所有 backdrop-filter 兼容性问题已修复!")
        
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    main()
