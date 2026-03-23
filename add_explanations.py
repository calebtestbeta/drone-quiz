#!/usr/bin/env python3
"""
為每道考題加入答錯說明欄位（explanation）。
支援中斷續跑：已有 explanation 的題目會自動跳過。
使用方式：python3 add_explanations.py
"""

import json
import os
import time
import anthropic

CLIENT = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT = """你是台灣遙控無人機學科考試的解題專家，熟悉以下法規：
- 民用航空法第九章之二（第99條之9至第99條之19）
- 遙控無人機管理規則
- 相關氣象、飛行原理、緊急處置知識

當使用者提供一道考題（含題目、選項、正確答案），請撰寫「答錯說明」，讓考生了解正確答案的原因。

格式要求：
- 繁體中文，使用台灣慣用語
- 2 至 3 句話，言簡意賅
- 必要時引用法條名稱（例如「依民用航空法第99條之14」、「依遙控無人機管理規則」）
- 不需提供網址
- 直接輸出說明文字，不加任何前綴或標題"""


def build_user_message(q: dict) -> str:
    opts = "\n".join(f"({k}) {v}" for k, v in q["options"].items())
    return (
        f"章節：{q['chapter_name']}\n"
        f"題目：{q['question']}\n"
        f"選項：\n{opts}\n"
        f"正確答案：({q['answer']}) {q['options'].get(q['answer'], '')}"
    )


def generate_explanation(q: dict, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            resp = CLIENT.messages.create(
                model=MODEL,
                max_tokens=300,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_user_message(q)}],
            )
            return resp.content[0].text.strip()
        except anthropic.RateLimitError:
            wait = 2 ** attempt * 5
            print(f"  Rate limit，等待 {wait}s...")
            time.sleep(wait)
        except Exception as e:
            print(f"  錯誤（第{attempt+1}次）：{e}")
            time.sleep(2)
    return ""


def process_chapter(ch: int) -> None:
    path = f"exam_ch{ch}.json"
    progress_path = f"exam_ch{ch}_progress.json"

    # 優先讀取進度檔
    if os.path.exists(progress_path):
        with open(progress_path, encoding="utf-8") as f:
            questions = json.load(f)
        print(f"  讀取進度檔 {progress_path}")
    else:
        with open(path, encoding="utf-8") as f:
            questions = json.load(f)

    total = len(questions)
    done = sum(1 for q in questions if q.get("explanation"))
    print(f"  共 {total} 題，已完成 {done} 題，剩餘 {total - done} 題")

    for i, q in enumerate(questions):
        if q.get("explanation"):
            continue  # 已有說明，跳過

        explanation = generate_explanation(q)
        q["explanation"] = explanation

        # 每 50 題存一次進度
        if (i + 1) % 50 == 0 or i == total - 1:
            with open(progress_path, "w", encoding="utf-8") as f:
                json.dump(questions, f, ensure_ascii=False, indent=2)
            completed = sum(1 for q in questions if q.get("explanation"))
            print(f"  進度：{completed}/{total}")

        # 避免觸發 rate limit
        time.sleep(0.3)

    # 全部完成，寫入正式檔案
    with open(path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    # 清除進度檔
    if os.path.exists(progress_path):
        os.remove(progress_path)

    print(f"  完成！已更新 {path}")


def main():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("錯誤：請設定環境變數 ANTHROPIC_API_KEY")
        return

    for ch in [1, 2, 3, 4]:
        print(f"\n=== 第 {ch} 章 ===")
        process_chapter(ch)

    print("\n全部完成！")


if __name__ == "__main__":
    main()
