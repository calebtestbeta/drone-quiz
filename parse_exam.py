#!/usr/bin/env python3
"""
將無人機學科考試 PDF 解析為 JSON 格式
使用方式：python3 parse_exam.py <pdf路徑> [輸出路徑]
"""

import re
import json
import subprocess
import sys
from collections import Counter


CHAPTER_HEADERS = [
    (1, "第一章 民用航空法及相關法規"),
    (2, "第二章 基礎飛行原理"),
    (3, "第三章 氣象"),
    (4, "第四章 緊急處置與飛行決策"),
]

ANSWER_MARKER = "第一章 民用航空法及相關法規答案"


def extract_text(pdf_path: str) -> str:
    result = subprocess.run(
        ["pdftotext", pdf_path, "-"],
        capture_output=True, text=True, encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(f"pdftotext 失敗：{result.stderr}")
    return result.stdout


def split_question_text(text: str) -> str:
    """分割題目與答案區段"""
    idx = text.find(ANSWER_MARKER)
    return (text[:idx], text[idx:]) if idx != -1 else (text, "")


def clean_lines(lines: list[str]) -> list[str]:
    """移除頁碼（獨立數字行）"""
    return [l for l in lines if not re.match(r'^\d+$', l.strip())]


def parse_questions(q_text: str) -> list[dict]:
    """解析題目區段"""
    lines = clean_lines(q_text.splitlines())

    questions = []
    current_chapter_num = 0
    current_chapter_name = ""
    i = 0

    # 用於辨識章節標題（不含「答案」的）
    chapter_pattern = re.compile(r'^(第[一二三四]章\s+\S+.*)$')
    # 題目開頭：數字. 可能接空格和文字
    q_start_pattern = re.compile(r'^(\d+)\.\s*(.*)')
    option_pattern = re.compile(r'^\(([ABCD])\)\s*(.*)')

    current_q = None

    while i < len(lines):
        line = lines[i].strip()

        # 偵測章節標題（排除答案標題）
        ch_match = chapter_pattern.match(line)
        if ch_match and "答案" not in line:
            for ch_num, ch_name in CHAPTER_HEADERS:
                if line.startswith(ch_name[:4]):
                    current_chapter_num = ch_num
                    current_chapter_name = ch_name
                    break
            i += 1
            continue

        # 偵測題目開頭
        q_match = q_start_pattern.match(line)
        if q_match and current_chapter_num > 0:
            # 儲存前一題
            if current_q and len(current_q["options"]) == 4:
                questions.append(current_q)

            q_num = int(q_match.group(1))
            q_text_parts = []

            # 題目文字可能在同行或下一行
            inline_text = q_match.group(2).strip()
            if inline_text:
                q_text_parts.append(inline_text)

            i += 1
            # 繼續讀題目文字直到遇到選項
            while i < len(lines):
                next_line = lines[i].strip()
                if option_pattern.match(next_line):
                    break
                if q_start_pattern.match(next_line) and not option_pattern.match(next_line):
                    # 下一題開始（不正常情況）
                    break
                if next_line:
                    q_text_parts.append(next_line)
                i += 1

            current_q = {
                "id": q_num,
                "chapter": current_chapter_num,
                "chapter_name": current_chapter_name,
                "question": "".join(q_text_parts),
                "options": {},
                "answer": "",
            }
            continue

        # 偵測選項
        opt_match = option_pattern.match(line)
        if opt_match and current_q is not None:
            key = opt_match.group(1)
            val_parts = [opt_match.group(2).strip()]
            i += 1
            # 選項可能跨行
            while i < len(lines):
                next_line = lines[i].strip()
                if (option_pattern.match(next_line) or
                        q_start_pattern.match(next_line) or
                        next_line == ""):
                    break
                val_parts.append(next_line)
                i += 1
            current_q["options"][key] = "".join(val_parts)
            continue

        i += 1

    # 最後一題
    if current_q and len(current_q["options"]) == 4:
        questions.append(current_q)

    return questions


def parse_answers(ans_text: str) -> dict[tuple, str]:
    """
    解析答案區段，回傳 {(章節編號, 題號): 答案} 字典。
    pdftotext 將表格按欄輸出：先列題號群，空行後接答案群，依此循環。
    每個章節題號從 1 重新計算，故需以章節區分。
    """
    chapter_markers = {
        "第一章 民用航空法及相關法規答案": 1,
        "第二章 基礎飛行原理答案": 2,
        "第三章 氣象答案": 3,
        "第四章 緊急處置與飛行決策答案": 4,
    }

    lines = [l.strip() for l in ans_text.splitlines()]
    answers = {}
    ctx = {"chapter": 0, "num_buf": [], "ans_buf": [], "state": "num"}

    def flush():
        for n, a in zip(ctx["num_buf"], ctx["ans_buf"]):
            answers[(ctx["chapter"], int(n.rstrip('.')))] = a
        ctx["num_buf"].clear()
        ctx["ans_buf"].clear()

    for line in lines:
        # 偵測章節切換
        if line in chapter_markers:
            if ctx["ans_buf"]:
                flush()
            ctx["chapter"] = chapter_markers[line]
            ctx["state"] = "num"
            continue

        if re.match(r'^\d+\.$', line):
            if ctx["state"] == "ans":
                flush()
                ctx["state"] = "num"
            ctx["num_buf"].append(line)
        elif re.match(r'^[ABCD]$', line):
            ctx["state"] = "ans"
            ctx["ans_buf"].append(line)
        elif line == "" and ctx["state"] == "ans" and ctx["ans_buf"]:
            flush()
            ctx["state"] = "num"

    if ctx["num_buf"] and ctx["ans_buf"]:
        flush()

    return answers


def main():
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "../exam.pdf"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "exam.json"

    print(f"讀取 PDF：{pdf_path}")
    full_text = extract_text(pdf_path)
    q_text, ans_text = split_question_text(full_text)

    print("解析答案...")
    answers = parse_answers(ans_text)
    print(f"  共解析 {len(answers)} 筆答案")

    print("解析題目...")
    questions = parse_questions(q_text)
    print(f"  共解析 {len(questions)} 題")

    # 合併答案（用章節+題號配對）
    missing_ans = []
    for q in questions:
        ans = answers.get((q["chapter"], q["id"]))
        if ans:
            q["answer"] = ans
        else:
            missing_ans.append(f"ch{q['chapter']}-{q['id']}")

    if missing_ans:
        print(f"  警告：{len(missing_ans)} 題找不到答案（前幾題：{missing_ans[:10]}）")

    # 檢查選項不完整的題目
    incomplete = [q["id"] for q in questions if len(q["options"]) != 4]
    if incomplete:
        print(f"  警告：{len(incomplete)} 題選項不完整：{incomplete[:10]}")

    # 輸出 JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"\n完成！已輸出至 {output_path}")
    ch_counts = Counter(q["chapter"] for q in questions)
    for ch_num in sorted(ch_counts):
        ch_name = next(n for num, n in CHAPTER_HEADERS if num == ch_num)
        print(f"  {ch_name}：{ch_counts[ch_num]} 題")


if __name__ == "__main__":
    main()
