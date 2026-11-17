import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List

from groq import Groq
from tabulate import tabulate

# Pastikan root folder 'backend' masuk ke sys.path agar import 'app.*' selalu berhasil
EVAL_DIR = Path(__file__).resolve().parent
BACKEND_DIR = EVAL_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.chdir(BACKEND_DIR)

from app.core.config import settings
from app.services.generator import generate_answer
from app.services.retriever import hybrid_search

judge_client = Groq(api_key=settings.GROQ_API_KEY)

JUDGE_SYSTEM_PROMPT = """You are an objective RAG Evaluation Judge.
Evaluate whether the AI-generated answer is 100% faithful to the provided retrieved context without hallucination or unsupported claims.

Important grading rules:
1. Give score 1.0 if every factual claim in the AI Answer is directly supported by the Retrieved Context.
2. For out-of-context or unanswerable questions where the Retrieved Context does NOT contain the requested information: if the AI Answer honestly refuses to answer (for example, stating "Maaf, informasi tersebut tidak ditemukan dalam dokumen yang tersedia." or similar explicit refusal without fabricating facts), you MUST give score 1.0 because strictly following anti-hallucination guardrails is 100% faithful.
3. Give a low score (0.0 to 0.4) if the AI Answer fabricates, guesses, or extrapolates facts not present in the Retrieved Context.

Respond ONLY with a valid JSON object using this exact schema:
{"score": <float between 0.0 and 1.0>, "reason": "<concise 1-sentence explanation>"}"""


def evaluate_faithfulness(question: str, context_chunks: List[Dict], answer: str) -> Dict:
    """Menggunakan LLM-as-a-Judge (Groq) untuk menilai kesetiaan jawaban terhadap konteks."""
    if not context_chunks:
        is_honest_refusal = "tidak ditemukan" in answer.lower() or "belum ada dokumen" in answer.lower()
        return {
            "score": 1.0 if is_honest_refusal else 0.0,
            "reason": "No context retrieved; checked for honest refusal."
        }

    context_text = "\n\n".join(
        f"[{c['filename']} - Hal. {c['page_number']}]\n{c['content']}"
        for c in context_chunks
    )

    prompt = f"""Question: {question}

Retrieved Context:
{context_text}

AI Answer:
{answer}"""

    try:
        completion = judge_client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_completion_tokens=300,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        score = float(parsed.get("score", 0.0))
        score = max(0.0, min(1.0, score))
        return {
            "score": round(score, 3),
            "reason": parsed.get("reason", "Evaluated by LLM Judge."),
        }
    except Exception as exc:
        return {"score": 0.0, "reason": f"Judge error: {exc}"}


def run_evaluation():
    dataset_path = EVAL_DIR / "test_dataset.json"
    report_path = EVAL_DIR / "eval_report.json"

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    results = []
    hits = 0
    faithfulness_scores = []
    latencies = []

    print(f"\nRunning RAG Evaluation on {len(dataset)} test cases (Top-K = 5)...\n")

    for item in dataset:
        qid = item["id"]
        question = item["question"]
        expected_page = item["expected_page"]

        # Ukur latency murni hanya pada proses RAG (retrieval + generation)
        start = time.perf_counter()
        retrieved = hybrid_search(question, top_k=5)
        gen_result = generate_answer(question, retrieved)
        latency = time.perf_counter() - start

        retrieved_pages = [c["page_number"] for c in retrieved]
        hit = expected_page in retrieved_pages
        if hit:
            hits += 1

        judge = evaluate_faithfulness(question, retrieved, gen_result["answer"])
        faithfulness_scores.append(judge["score"])
        latencies.append(latency)

        results.append({
            "id": qid,
            "category": item.get("category", "General"),
            "question": question,
            "expected_page": expected_page,
            "retrieved_pages": retrieved_pages,
            "retrieval_hit": hit,
            "faithfulness_score": judge["score"],
            "judge_reason": judge["reason"],
            "latency_sec": round(latency, 3),
            "answer_preview": gen_result["answer"][:200] + ("..." if len(gen_result["answer"]) > 200 else ""),
        })

        # Jeda antar test case untuk menghindari rate limit (TPM) free tier Groq API
        time.sleep(2.5)

    total = len(dataset)
    recall_at_5 = (hits / total) if total else 0.0
    avg_faithfulness = (sum(faithfulness_scores) / total) if total else 0.0
    avg_latency = (sum(latencies) / total) if total else 0.0

    # Cetak tabel per pertanyaan
    table_rows = [
        [
            r["id"],
            r["expected_page"],
            r["retrieved_pages"],
            "HIT" if r["retrieval_hit"] else "MISS",
            f"{r['faithfulness_score']:.2f}",
            f"{r['latency_sec']:.2f}s",
        ]
        for r in results
    ]

    print(
        tabulate(
            table_rows,
            headers=["ID", "Exp. Page", "Retrieved Pages", "Recall@5", "Faithfulness", "Latency"],
            tablefmt="github",
        )
    )

    summary = {
        "total_queries": total,
        "retrieval_hit_rate_recall_at_5": round(recall_at_5, 4),
        "retrieval_hit_percentage": f"{recall_at_5 * 100:.1f}%",
        "average_faithfulness_score": round(avg_faithfulness, 4),
        "average_latency_seconds": round(avg_latency, 3),
    }

    print("\n=== Evaluation Summary ===")
    summary_table = [
        ["Retrieval Hit Rate (Recall@5)", summary["retrieval_hit_percentage"]],
        ["Average Faithfulness Score", f"{summary['average_faithfulness_score']:.3f} / 1.000"],
        ["Average End-to-End Latency", f"{summary['average_latency_seconds']:.3f} s"],
    ]
    print(tabulate(summary_table, headers=["Metric", "Value"], tablefmt="github"))

    report = {"summary": summary, "details": results}
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\nFull evaluation report saved to: {report_path}\n")


if __name__ == "__main__":
    run_evaluation()
