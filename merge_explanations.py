#!/usr/bin/env python3
"""合併 explanation JSON 批次檔到章節 JSON"""
import json
import sys
from pathlib import Path

base = Path(__file__).parent

def merge_chapter(chapter_num: int, num_batches: int):
    chapter_file = base / f"exam_ch{chapter_num}.json"
    with open(chapter_file, encoding="utf-8") as f:
        questions = json.load(f)

    # 建立 id -> explanation 對照表
    explanations = {}
    for b in range(1, num_batches + 1):
        exp_file = base / f"exp_ch{chapter_num}_b{b}.json"
        if not exp_file.exists():
            print(f"  警告：{exp_file.name} 不存在，跳過")
            continue
        with open(exp_file, encoding="utf-8") as f:
            data = json.load(f)
        explanations.update({str(k): v for k, v in data.items()})
        print(f"  載入 {exp_file.name}：{len(data)} 題")

    # 合併
    updated = 0
    for q in questions:
        qid = str(q["id"])
        if qid in explanations:
            q["explanation"] = explanations[qid]
            updated += 1

    with open(chapter_file, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"  第{chapter_num}章：{updated}/{len(questions)} 題已加入說明")

if __name__ == "__main__":
    chapter = int(sys.argv[1])
    batches = int(sys.argv[2])
    print(f"合併第{chapter}章（{batches}批）...")
    merge_chapter(chapter, batches)
    print("完成！")
